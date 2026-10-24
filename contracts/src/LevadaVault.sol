// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IWormhole} from "./interfaces/IWormhole.sol";
import {INttManager} from "./interfaces/INttManager.sol";
import {LevadaMessages} from "./libraries/LevadaMessages.sol";

/// @title LevadaVault
/// @notice Base side of Levada: an ERC-4626 vault for MUSD that earns Mezo's MUSD Savings
///         Rate. Deposits stay on Base as a buffer for instant exits; the rest is bridged to
///         LevadaHub on Mezo over Wormhole NTT, the bridge MUSD itself uses.
/// @dev Share price. Principal is booked here in real time; the hub only reports the yield
///      it has earned, and each report's gain is released linearly over PROFIT_UNLOCK:
///
///        totalAssets = principal + hubProfit - lockedProfit(now)
///        principal   = deposits - instant withdrawals - queued withdrawals
///        hubProfit   = report.assets + report.cumulativeOut - report.cumulativeIn
///                      (credited while shares exist; absorbed while none do)
///
///      MUSD crossing between chains is principal wherever it is, so stale reports and
///      transfers landing in any order never count it twice, and MUSD sent to either contract
///      without a deposit never moves the price. Releasing yield over time means a deposit
///      made just before a report and redeemed just after earns nothing it did not wait for.
///
///      Exits. MUSD on Base is either reserved for queued exits or free:
///
///        freeIdle = balance + pendingFromHub - totalOwed
///
///      An exit beyond the free buffer reserves what is free and asks the hub for the rest.
///      Each hub request takes a place in one queue (`queuePos`, cumulative MUSD requested) and
///      is paid once that much MUSD has come back from Mezo, first come first served. The hub
///      fills requests in any order and in parts, so the queue always drains.
contract LevadaVault is ERC4626, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using LevadaMessages for LevadaMessages.Withdraw;

    /// @dev NTT carries 8 decimals; MUSD has 18, so bridged amounts must be multiples of 1e10.
    uint256 internal constant NTT_UNIT = 1e10;
    uint256 public constant MAX_BUFFER_BPS = 5_000;
    /// @notice Reports cannot grow hub profit faster than this APR (defence in depth).
    uint256 public constant MAX_REPORT_APR_BPS = 5_000;
    /// @notice Each report's gain is released to the share price linearly over this period.
    uint256 public constant PROFIT_UNLOCK = 12 hours;
    uint256 public constant MIN_BRIDGE = 1e18;

    INttManager public immutable ntt;
    IWormhole public immutable wormhole;
    uint16 public immutable hubChain;
    bytes32 public immutable hub;
    uint8 public immutable consistencyLevel;
    bytes public nttInstructions;

    // Share price
    int256 public principal;
    /// @notice Hub profit credited to shareholders.
    int256 public hubProfit;
    /// @notice Hub profit as last accepted from reports (credited or, with no shares, absorbed).
    int256 public reportedProfit;
    uint256 public lockedProfit;
    uint64 public lockedProfitAt;

    // Bridge accounting
    uint256 public bridgedOut;
    /// @notice All MUSD that arrived without a deposit: returns from the hub (and gifts).
    uint256 public bridgedBack;
    /// @notice MUSD balance as last accounted for; any excess has arrived from the hub.
    uint256 public trackedIdle;

    // Last verified hub report
    LevadaMessages.Report public lastReport;
    uint64 public lastReportSequence;
    bool public hasReport;

    // Exit queue
    struct Exit {
        address owner;
        uint256 assets;
        uint256 queuePos;
        bool paid;
    }

    Exit[] public exits;
    mapping(address => uint256[]) internal _exitsOf;
    mapping(address => uint256) internal _firstOpen;
    uint256 public totalOwed;
    /// @notice All MUSD ever asked of the hub (queue positions are measured against this).
    uint256 public requestedFromHub;
    uint64 public withdrawNonce;

    // Guarded launch
    uint256 public bufferBps;
    uint256 public depositCap;
    bool public depositsPaused;

    event BridgedToHub(uint256 amount, uint64 nttMsgId);
    event ArrivedFromHub(uint256 amount);
    event ReportReceived(uint64 sequence, int256 hubProfit, uint256 assets, bool clamped);
    event WithdrawRequested(
        address indexed owner,
        uint256 indexed exitId,
        uint256 shares,
        uint256 assets,
        uint256 requestedFromHub,
        uint64 sequence
    );
    event WithdrawClaimed(address indexed owner, uint256 indexed exitId, uint256 assets);
    event BufferUpdated(uint256 bufferBps);
    event DepositCapUpdated(uint256 depositCap);
    event DepositsPaused(bool paused);

    error InvalidVaa(string reason);
    error UnknownEmitter(uint16 chain, bytes32 emitter);
    error StaleReport();
    error NothingToBridge();
    error NothingOwed();
    error NotArrived(uint256 queuePos, uint256 arrived);
    error ZeroAssets();
    error ZeroShares();
    error BufferTooHigh(uint256 bufferBps);
    error WrongFee(uint256 sent, uint256 required);
    error RefundFailed();
    error TokenMismatch();

    constructor(
        IERC20 musd_,
        INttManager ntt_,
        IWormhole wormhole_,
        uint16 hubChain_,
        bytes32 hub_,
        uint8 consistencyLevel_,
        bytes memory nttInstructions_,
        uint256 bufferBps_,
        uint256 depositCap_,
        address owner_
    ) ERC20("Levada Savings MUSD", "lsMUSD") ERC4626(musd_) Ownable(owner_) {
        if (ntt_.token() != address(musd_)) revert TokenMismatch();
        if (bufferBps_ > MAX_BUFFER_BPS) revert BufferTooHigh(bufferBps_);
        ntt = ntt_;
        wormhole = wormhole_;
        hubChain = hubChain_;
        hub = hub_;
        consistencyLevel = consistencyLevel_;
        nttInstructions = nttInstructions_;
        bufferBps = bufferBps_;
        depositCap = depositCap_;
        lockedProfitAt = uint64(block.timestamp);
    }

    // ------------------------------------------------------------------ views

    function totalAssets() public view override returns (uint256) {
        int256 total = principal + hubProfit - SafeCast.toInt256(lockedProfitNow());
        return total > 0 ? uint256(total) : 0;
    }

    /// @notice Part of the last reports' gains not yet released to the share price.
    function lockedProfitNow() public view returns (uint256) {
        uint256 elapsed = block.timestamp - lockedProfitAt;
        if (elapsed >= PROFIT_UNLOCK) return 0;
        return lockedProfit - Math.mulDiv(lockedProfit, elapsed, PROFIT_UNLOCK);
    }

    /// @notice All MUSD that has come back without a deposit, including any not yet booked.
    function arrivedFromHub() public view returns (uint256) {
        return bridgedBack + _sub0(_balance(), trackedIdle);
    }

    /// @notice MUSD asked of the hub that has not come back yet.
    function pendingFromHub() public view returns (uint256) {
        return _sub0(requestedFromHub, arrivedFromHub());
    }

    /// @notice MUSD on Base that no queued exit is waiting for.
    function freeIdle() public view returns (uint256) {
        return _sub0(_balance() + pendingFromHub(), totalOwed);
    }

    /// @notice MUSD that bridgeToHub would send now.
    function bridgeable() public view returns (uint256) {
        uint256 target = Math.mulDiv(totalAssets(), bufferBps, 10_000);
        uint256 free = freeIdle();
        if (free <= target) return 0;
        uint256 amount = ((free - target) / NTT_UNIT) * NTT_UNIT;
        return amount < MIN_BRIDGE ? 0 : amount;
    }

    function exitCount() external view returns (uint256) {
        return exits.length;
    }

    function exitsOf(address owner) external view returns (uint256[] memory) {
        return _exitsOf[owner];
    }

    /// @notice MUSD owed to `owner` by queued exits not yet paid.
    function owed(address owner) public view returns (uint256 total) {
        uint256[] storage ids = _exitsOf[owner];
        for (uint256 i = _firstOpen[owner]; i < ids.length; ++i) {
            Exit storage e = exits[ids[i]];
            if (!e.paid) total += e.assets;
        }
    }

    function isClaimable(uint256 exitId) public view returns (bool) {
        Exit storage e = exits[exitId];
        return !e.paid && e.queuePos <= arrivedFromHub();
    }

    function maxDeposit(address) public view override returns (uint256) {
        if (depositsPaused) return 0;
        return _sub0(depositCap, totalAssets());
    }

    /// @dev Saturates instead of overflowing (ERC-4626: maxMint must not revert).
    function maxMint(address receiver) public view override returns (uint256) {
        uint256 assets = maxDeposit(receiver);
        if (totalSupply() == 0) return assets;
        (bool ok, uint256 scaled) = Math.tryMul(assets, totalSupply() + 10 ** _decimalsOffset());
        if (!ok) return type(uint256).max;
        return scaled / (totalAssets() + 1);
    }

    /// @notice Instant withdrawals are limited to the free buffer on Base.
    function maxWithdraw(address owner) public view override returns (uint256) {
        return Math.min(super.maxWithdraw(owner), freeIdle());
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return Math.min(balanceOf(owner), _convertToShares(freeIdle(), Math.Rounding.Floor));
    }

    // ---------------------------------------------------------- permissionless

    /// @notice Bridge free MUSD above the buffer target to the hub on Mezo.
    /// @dev msg.value is forwarded to the NTT manager and must equal its delivery price.
    function bridgeToHub() external payable nonReentrant returns (uint256 amount, uint64 nttMsgId) {
        _settleIdle();
        amount = bridgeable();
        if (amount == 0) revert NothingToBridge();
        trackedIdle -= amount;
        bridgedOut += amount;
        IERC20(asset()).forceApprove(address(ntt), amount);
        nttMsgId = ntt.transfer{value: msg.value}(
            amount, hubChain, hub, bytes32(uint256(uint160(msg.sender))), false, nttInstructions
        );
        emit BridgedToHub(amount, nttMsgId);
    }

    /// @notice Accept a Wormhole-verified report from the hub.
    function receiveReport(bytes calldata encodedVm) external nonReentrant {
        IWormhole.VM memory vm = _verify(encodedVm);
        if (hasReport && vm.sequence <= lastReportSequence) revert StaleReport();
        LevadaMessages.Report memory r = LevadaMessages.decodeReport(vm.payload);
        LevadaMessages.Report memory prev = lastReport;
        if (
            r.cumulativeIn < prev.cumulativeIn || r.cumulativeOut < prev.cumulativeOut
                || r.timestamp < prev.timestamp
        ) revert StaleReport();

        int256 delta = SafeCast.toInt256(r.assets) + SafeCast.toInt256(r.cumulativeOut)
            - SafeCast.toInt256(r.cumulativeIn) - reportedProfit;
        // Defence in depth: profit only grows with time, by bounded yield on the vault's own
        // books (never on a figure from the report itself). The rest is offered again later.
        bool clamped;
        if (delta > 0) {
            uint256 elapsed = hasReport ? r.timestamp - prev.timestamp : 0;
            int256 booked = principal + hubProfit;
            int256 maxDelta = SafeCast.toInt256(
                Math.mulDiv(booked > 0 ? uint256(booked) : 0, MAX_REPORT_APR_BPS * elapsed, 10_000 * 365 days)
            );
            if (delta > maxDelta) (delta, clamped) = (maxDelta, true);
        }
        reportedProfit += delta;

        _settleIdle();
        if (delta > 0 && totalSupply() == 0) {
            // Nobody to credit: the gain is absorbed and the share price stays where it is.
            (lockedProfit, lockedProfitAt) = (0, uint64(block.timestamp));
        } else if (delta != 0) {
            // A gain is locked and released over PROFIT_UNLOCK; a loss is netted against
            // profit not yet released. Reports without change leave the schedule alone.
            uint256 locked = lockedProfitNow();
            hubProfit += delta;
            if (delta > 0) {
                locked += uint256(delta);
            } else {
                uint256 loss = uint256(-delta);
                locked = loss >= locked ? 0 : locked - loss;
            }
            (lockedProfit, lockedProfitAt) = (locked, uint64(block.timestamp));
        }
        lastReport = r;
        lastReportSequence = vm.sequence;
        hasReport = true;
        emit ReportReceived(vm.sequence, hubProfit, r.assets, clamped);
    }

    /// @notice Exit beyond the buffer: burn shares at today's price, reserve whatever free
    ///         MUSD is on Base, and ask the hub for the rest. It is paid out by claim() once
    ///         it lands, which anyone (usually the keeper) can call.
    /// @dev When the hub is asked, msg.value must cover the Wormhole message fee; any excess,
    ///      and all of msg.value when the hub is not asked, is refunded. The part asked of the
    ///      hub is rounded down to the NTT unit, so the hub is never asked for more than it
    ///      holds; the dust stays with the vault.
    function requestWithdraw(uint256 shares)
        external
        payable
        nonReentrant
        returns (uint256 assets, uint256 requested, uint64 sequence)
    {
        _settleIdle();
        assets = previewRedeem(shares);
        uint256 free = freeIdle();
        if (assets > free) {
            requested = ((assets - free) / NTT_UNIT) * NTT_UNIT;
            assets = free + requested;
        }
        if (assets == 0) revert ZeroAssets();
        _burn(msg.sender, shares);
        principal -= SafeCast.toInt256(assets);
        totalOwed += assets;

        uint256 queuePos;
        uint256 fee;
        if (requested != 0) {
            // MUSD that already came back beyond what was asked cannot back a new request.
            if (bridgedBack > requestedFromHub) requestedFromHub = bridgedBack;
            requestedFromHub += requested;
            queuePos = requestedFromHub;
            fee = wormhole.messageFee();
            if (msg.value < fee) revert WrongFee(msg.value, fee);
            sequence = wormhole.publishMessage{value: fee}(
                0, LevadaMessages.Withdraw({amount: requested, nonce: ++withdrawNonce}).encode(), consistencyLevel
            );
        }
        uint256 exitId = exits.length;
        exits.push(Exit({owner: msg.sender, assets: assets, queuePos: queuePos, paid: false}));
        _exitsOf[msg.sender].push(exitId);
        emit WithdrawRequested(msg.sender, exitId, shares, assets, requested, sequence);

        if (msg.value > fee) {
            (bool ok,) = msg.sender.call{value: msg.value - fee}("");
            if (!ok) revert RefundFailed();
        }
    }

    /// @notice Pay out one queued exit whose MUSD has landed. Anyone can call it.
    function claimExit(uint256 exitId) public nonReentrant returns (uint256 assets) {
        _settleIdle();
        Exit storage e = exits[exitId];
        if (e.paid) revert NothingOwed();
        if (e.queuePos > bridgedBack) revert NotArrived(e.queuePos, bridgedBack);
        assets = _pay(exitId, e);
    }

    /// @notice Pay out every queued exit of `owner` whose MUSD has landed. Anyone can call it.
    function claim(address owner) external nonReentrant returns (uint256 total) {
        _settleIdle();
        uint256[] storage ids = _exitsOf[owner];
        uint256 i = _firstOpen[owner];
        bool waiting;
        for (; i < ids.length; ++i) {
            Exit storage e = exits[ids[i]];
            if (e.paid) continue;
            if (e.queuePos > bridgedBack) {
                waiting = true;
                continue;
            }
            total += _pay(ids[i], e);
        }
        while (_firstOpen[owner] < ids.length && exits[ids[_firstOpen[owner]]].paid) ++_firstOpen[owner];
        if (total == 0) {
            if (waiting) revert NotArrived(0, bridgedBack);
            revert NothingOwed();
        }
    }

    // ------------------------------------------------------------------- owner

    function setBuffer(uint256 bufferBps_) external onlyOwner {
        if (bufferBps_ > MAX_BUFFER_BPS) revert BufferTooHigh(bufferBps_);
        bufferBps = bufferBps_;
        emit BufferUpdated(bufferBps_);
    }

    function setDepositCap(uint256 depositCap_) external onlyOwner {
        depositCap = depositCap_;
        emit DepositCapUpdated(depositCap_);
    }

    /// @notice Pauses deposits only. Withdrawals and claims always stay open.
    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }

    // ---------------------------------------------------------------- internal

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        if (shares == 0) revert ZeroShares();
        _settleIdle();
        super._deposit(caller, receiver, assets, shares);
        trackedIdle += assets;
        principal += SafeCast.toInt256(assets);
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        _settleIdle();
        trackedIdle -= assets;
        principal -= SafeCast.toInt256(assets);
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /// @dev With no shares outstanding, shares are minted 1:1 so rounding dust left behind by
    ///      earlier exits cannot coarsen the share unit; the dust goes to the next depositor.
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        if (totalSupply() == 0) return assets;
        return super._convertToShares(assets, rounding);
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        if (totalSupply() == 0) return shares;
        return super._convertToAssets(shares, rounding);
    }

    function _pay(uint256 exitId, Exit storage e) internal returns (uint256 assets) {
        assets = e.assets;
        e.paid = true;
        totalOwed -= assets;
        trackedIdle -= assets;
        IERC20(asset()).safeTransfer(e.owner, assets);
        emit WithdrawClaimed(e.owner, exitId, assets);
    }

    /// @dev Books MUSD that arrived without a deposit as returned from the hub.
    function _settleIdle() internal {
        uint256 idle = _balance();
        if (idle > trackedIdle) {
            uint256 arrived = idle - trackedIdle;
            bridgedBack += arrived;
            emit ArrivedFromHub(arrived);
        }
        trackedIdle = idle;
    }

    function _balance() internal view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function _verify(bytes calldata encodedVm) internal view returns (IWormhole.VM memory vm) {
        bool valid;
        string memory reason;
        (vm, valid, reason) = wormhole.parseAndVerifyVM(encodedVm);
        if (!valid) revert InvalidVaa(reason);
        if (vm.emitterChainId != hubChain || vm.emitterAddress != hub) {
            revert UnknownEmitter(vm.emitterChainId, vm.emitterAddress);
        }
    }

    function _sub0(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : 0;
    }
}
