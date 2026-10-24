// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IWormhole} from "./interfaces/IWormhole.sol";
import {INttManager} from "./interfaces/INttManager.sol";
import {IMUSDSavingsRate} from "./interfaces/IMUSDSavingsRate.sol";
import {LevadaMessages} from "./libraries/LevadaMessages.sol";

/// @title LevadaHub
/// @notice Mezo side of Levada. Holds the MUSD that LevadaVault bridges over from Base in
///         Mezo's MUSD Savings Rate (sMUSD), compounds the yield, and answers the vault over
///         Wormhole: reports of what it holds, and MUSD sent back for withdrawals.
/// @dev Every entry point except the fee setters is permissionless, and the owner cannot move
///      deposits. Bookkeeping: MUSD here is either accrued fees, `knownIdle` (held on purpose,
///      e.g. when sMUSD would revert a deposit) or new inflow from the vault; sMUSD is either
///      `savingsPrincipal` (deposited by the hub) or a gift, which is booked as inflow so it
///      cannot move the vault's share price.
contract LevadaHub is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using LevadaMessages for LevadaMessages.Report;

    uint256 public constant MAX_FEE_BPS = 2_000;
    /// @dev NTT carries 8 decimals; MUSD has 18, so bridged amounts must be multiples of 1e10.
    uint256 internal constant NTT_UNIT = 1e10;

    IERC20 public immutable musd;
    IMUSDSavingsRate public immutable savings;
    INttManager public immutable ntt;
    IWormhole public immutable wormhole;
    uint16 public immutable vaultChain;
    bytes32 public immutable vault;
    uint8 public immutable consistencyLevel;
    bytes public nttInstructions;

    uint256 public feeBps;
    address public treasury;
    uint256 public accruedFees;

    uint256 public savingsPrincipal;
    uint256 public knownIdle;

    /// @notice All MUSD (and gifted sMUSD) ever received for the vault.
    uint256 public cumulativeIn;
    /// @notice All MUSD ever sent back to the vault.
    uint256 public cumulativeOut;
    /// @notice MUSD sent so far against each withdrawal message, by VAA hash.
    mapping(bytes32 => uint256) public sent;

    event Synced(uint256 inflow, uint256 yield, uint256 fee);
    event Reported(uint64 sequence, uint256 assets, uint256 cumulativeIn, uint256 cumulativeOut);
    event WithdrawalProcessed(bytes32 indexed vaaHash, uint64 nonce, uint256 amount, bool filled, uint64 nttMsgId);
    event FeesClaimed(address treasury, uint256 amount);
    event FeeUpdated(uint256 feeBps);
    event TreasuryUpdated(address treasury);

    error InvalidVaa(string reason);
    error UnknownEmitter(uint16 chain, bytes32 emitter);
    error AlreadyProcessed(bytes32 vaaHash);
    error NothingToSend();
    error BadAmount(uint256 amount);
    error FeeTooHigh(uint256 feeBps);
    error BadTreasury();
    error ZeroAddress();
    error TokenMismatch();

    constructor(
        IERC20 musd_,
        IMUSDSavingsRate savings_,
        INttManager ntt_,
        IWormhole wormhole_,
        uint16 vaultChain_,
        bytes32 vault_,
        uint8 consistencyLevel_,
        bytes memory nttInstructions_,
        address treasury_,
        uint256 feeBps_,
        address owner_
    ) Ownable(owner_) {
        if (savings_.musdToken() != address(musd_) || ntt_.token() != address(musd_)) revert TokenMismatch();
        if (vault_ == bytes32(0)) revert ZeroAddress();
        if (treasury_ == address(0) || treasury_ == address(musd_)) revert BadTreasury();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        musd = musd_;
        savings = savings_;
        ntt = ntt_;
        wormhole = wormhole_;
        vaultChain = vaultChain_;
        vault = vault_;
        consistencyLevel = consistencyLevel_;
        nttInstructions = nttInstructions_;
        treasury = treasury_;
        feeBps = feeBps_;
    }

    // ------------------------------------------------------------------ views

    /// @notice MUSD value held for the vault, net of fees (including fees on unclaimed yield).
    function totalAssets() public view returns (uint256) {
        uint256 shares = savings.balanceOf(address(this));
        uint256 pending = savings.claimableYield(address(this));
        uint256 index = savings.yieldIndex();
        uint256 own = savings.supplyYieldIndex(address(this));
        if (index > own) pending += (shares * (index - own)) / 1e18;
        pending -= (pending * feeBps) / 10_000;
        return shares + pending + musd.balanceOf(address(this)) - accruedFees;
    }

    /// @notice MUSD processWithdrawal could send right now.
    function sendable() public view returns (uint256) {
        uint256 available = savings.balanceOf(address(this)) + knownIdle;
        return (Math.min(available, _outboundCapacity()) / NTT_UNIT) * NTT_UNIT;
    }

    // ---------------------------------------------------------- permissionless

    /// @notice Deposit MUSD that has arrived from the vault and compound yield.
    function sync() external nonReentrant {
        _sync();
    }

    /// @notice Sync, then publish a report of the hub position for the vault.
    /// @dev msg.value must equal the Wormhole message fee.
    function report() external payable nonReentrant returns (uint64 sequence) {
        _sync();
        LevadaMessages.Report memory r = LevadaMessages.Report({
            assets: totalAssets(),
            cumulativeIn: cumulativeIn,
            cumulativeOut: cumulativeOut,
            timestamp: uint64(block.timestamp)
        });
        sequence = wormhole.publishMessage{value: msg.value}(0, r.encode(), consistencyLevel);
        emit Reported(sequence, r.assets, r.cumulativeIn, r.cumulativeOut);
    }

    /// @notice Send MUSD back for a withdrawal the vault published on Base. Fills as much as
    ///         the hub holds and the bridge allows; call again with the same message to send
    ///         the rest. Every request is honoured in full eventually, in any order.
    /// @dev msg.value is forwarded to the NTT manager and must equal its delivery price.
    function processWithdrawal(bytes calldata encodedVm) external payable nonReentrant returns (uint64 nttMsgId) {
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole.parseAndVerifyVM(encodedVm);
        if (!valid) revert InvalidVaa(reason);
        if (vm.emitterChainId != vaultChain || vm.emitterAddress != vault) {
            revert UnknownEmitter(vm.emitterChainId, vm.emitterAddress);
        }
        LevadaMessages.Withdraw memory w = LevadaMessages.decodeWithdraw(vm.payload);
        if (w.amount == 0 || w.amount % NTT_UNIT != 0) revert BadAmount(w.amount);
        uint256 done = sent[vm.hash];
        if (done >= w.amount) revert AlreadyProcessed(vm.hash);

        // While sMUSD's strategy pays dust, sMUSD.withdraw reverts; send from idle MUSD only.
        uint256 limit = _sync() ? sendable() : (Math.min(knownIdle, _outboundCapacity()) / NTT_UNIT) * NTT_UNIT;
        uint256 amount = Math.min(w.amount - done, limit);
        if (amount == 0) revert NothingToSend();
        sent[vm.hash] = done + amount;
        cumulativeOut += amount;

        uint256 fromIdle = Math.min(amount, knownIdle);
        knownIdle -= fromIdle;
        uint256 fromSavings = amount - fromIdle;
        if (fromSavings != 0) {
            uint256 before = musd.balanceOf(address(this));
            savings.withdraw(fromSavings);
            savingsPrincipal -= fromSavings;
            // sMUSD.withdraw also pays out yield accrued since _sync; hold it for the next sync.
            uint256 yield = musd.balanceOf(address(this)) - before - fromSavings;
            if (yield != 0) knownIdle += yield - _accrueFee(yield);
        }

        musd.forceApprove(address(ntt), amount);
        nttMsgId = ntt.transfer{value: msg.value}(amount, vaultChain, vault, vault, false, nttInstructions);
        emit WithdrawalProcessed(vm.hash, w.nonce, amount, done + amount == w.amount, nttMsgId);
    }

    /// @notice Pay accrued fees to the treasury. A treasury that refuses MUSD only blocks this.
    function claimFees() external nonReentrant returns (uint256 amount) {
        amount = accruedFees;
        accruedFees = 0;
        musd.safeTransfer(treasury, amount);
        emit FeesClaimed(treasury, amount);
    }

    // ------------------------------------------------------------------- owner

    /// @notice New fee applies to yield from now on; earlier yield is charged at the old rate.
    function setFee(uint256 feeBps_) external onlyOwner nonReentrant {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        _sync();
        feeBps = feeBps_;
        emit FeeUpdated(feeBps_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0) || treasury_ == address(musd)) revert BadTreasury();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    // ---------------------------------------------------------------- internal

    /// @return strategyOk False while sMUSD's strategy pays dust (sMUSD deposit/withdraw revert).
    function _sync() internal returns (bool strategyOk) {
        uint256 held = accruedFees + knownIdle;
        uint256 balance = musd.balanceOf(address(this));
        uint256 inflow = balance > held ? balance - held : 0;

        uint256 shares = savings.balanceOf(address(this));
        if (shares > savingsPrincipal) {
            // sMUSD sent to the hub is new principal, not yield.
            inflow += shares - savingsPrincipal;
            savingsPrincipal = shares;
        } else if (shares < savingsPrincipal) {
            savingsPrincipal = shares;
        }
        if (inflow != 0) cumulativeIn += inflow;

        // sMUSD reverts deposit() and withdraw() while its strategy pays a dust amount; then
        // MUSD stays idle here until the next sync.
        strategyOk = true;
        try savings.receiveYieldFromStrategy() {}
        catch {
            strategyOk = false;
        }
        uint256 yield = savings.claimYield();
        uint256 fee = _accrueFee(yield);

        uint256 idle = musd.balanceOf(address(this)) - accruedFees;
        if (strategyOk && idle != 0) {
            musd.forceApprove(address(savings), idle);
            savings.deposit(idle);
            savingsPrincipal += idle;
            idle = 0;
        }
        knownIdle = idle;
        emit Synced(inflow, yield, fee);
    }

    function _accrueFee(uint256 yield) internal returns (uint256 fee) {
        fee = (yield * feeBps) / 10_000;
        accruedFees += fee;
    }

    function _outboundCapacity() internal view returns (uint256) {
        try ntt.getCurrentOutboundCapacity() returns (uint256 capacity) {
            return capacity;
        } catch {
            return type(uint256).max;
        }
    }
}
