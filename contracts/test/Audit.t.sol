// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {LevadaHub} from "../src/LevadaHub.sol";
import {LevadaVault} from "../src/LevadaVault.sol";
import {LevadaMessages} from "../src/libraries/LevadaMessages.sol";
import {IMUSDSavingsRate} from "../src/interfaces/IMUSDSavingsRate.sol";
import {INttManager} from "../src/interfaces/INttManager.sol";
import {IWormhole} from "../src/interfaces/IWormhole.sol";
import {MockMUSD, MockGuardians, MockWormhole, MockNtt, MockSavingsRate} from "./mocks/Mocks.sol";

// =====================================================================================
//  Levada audit tests, 2026-10-23.
//
//  test_<SEVERITY><n>_*  assert the property the protocol needs and FAIL today. Each
//                        failure is the proof of a finding.
//  test_safe_*           PASS and document behaviour that was checked and found safe.
//  invariant_*           AuditInvariantSafety PASSES (accounting, solvency, max*/preview*).
//                        AuditInvariantLiveness FAILS (invariant_H2_*, invariant_L8_*).
//  testFork_*            run against the live Base/Mezo mainnet and testnet contracts;
//                        skipped unless AUDIT_FORK=true.
// =====================================================================================

/// @dev Same world as LevadaTest: Mezo and Base share one EVM and the test is the relayer.
abstract contract AuditBase is Test {
    uint16 constant MEZO = 50;
    uint16 constant BASE = 30;
    bytes constant INSTRUCTIONS = hex"01010101";

    MockGuardians guardians;
    MockWormhole mezoWh;
    MockWormhole baseWh;
    MockMUSD mezoMusd;
    MockMUSD baseMusd;
    MockNtt mezoNtt;
    MockNtt baseNtt;
    MockSavingsRate savings; // unset when a suite overrides _makeSavings
    LevadaHub hub;
    LevadaVault vault;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public virtual {
        vm.warp(1_760_000_000);
        guardians = new MockGuardians();
        mezoWh = new MockWormhole(guardians, MEZO);
        baseWh = new MockWormhole(guardians, BASE);
        mezoMusd = new MockMUSD();
        baseMusd = new MockMUSD();
        mezoNtt = new MockNtt(mezoMusd, false, MEZO);
        baseNtt = new MockNtt(baseMusd, true, BASE);
        mezoMusd.mint(address(mezoNtt), 1e30); // MUSD already locked on Mezo for Base supply
        _deploy(_makeSavings(), _makeHubNtt());
        _fund(alice);
        _fund(bob);
        _fund(carol);
    }

    function _makeSavings() internal virtual returns (IMUSDSavingsRate) {
        savings = new MockSavingsRate(mezoMusd);
        return IMUSDSavingsRate(address(savings));
    }

    function _makeHubNtt() internal virtual returns (INttManager) {
        return INttManager(address(mezoNtt));
    }

    function _deploy(IMUSDSavingsRate savings_, INttManager hubNtt) internal {
        address predictedHub = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        vault = new LevadaVault(
            IERC20(address(baseMusd)),
            INttManager(address(baseNtt)),
            IWormhole(address(baseWh)),
            MEZO,
            _b32(predictedHub),
            200, // VAULT_CONSISTENCY in Deploy.s.sol
            INSTRUCTIONS,
            1_000, // 10% buffer
            1_000_000e18,
            owner
        );
        hub = new LevadaHub(
            IERC20(address(mezoMusd)),
            savings_,
            hubNtt,
            IWormhole(address(mezoWh)),
            BASE,
            _b32(address(vault)),
            202, // HUB_CONSISTENCY in Deploy.s.sol
            INSTRUCTIONS,
            treasury,
            1_000, // 10% performance fee
            owner
        );
        assertEq(address(hub), predictedHub);
    }

    function _fund(address who) internal {
        baseMusd.mint(who, 10_000e18);
        vm.prank(who);
        baseMusd.approve(address(vault), type(uint256).max);
    }

    function _deliverToMezo() internal {
        mezoNtt.deliver(baseNtt, baseNtt.sentCount() - 1);
    }

    function _deliverToBase() internal {
        baseNtt.deliver(mezoNtt, mezoNtt.sentCount() - 1);
    }

    function _report() internal {
        hub.report();
        vault.receiveReport(mezoWh.lastVm());
    }

    function _b32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }

    function _seq(bytes memory encodedVm) internal pure returns (uint64) {
        return abi.decode(encodedVm, (IWormhole.VM)).sequence;
    }

    function _tryProcess(bytes memory encodedVm) internal returns (bool ok) {
        (ok,) = address(hub).call(abi.encodeCall(LevadaHub.processWithdrawal, (encodedVm)));
    }

    function _tryClaim(address who) internal returns (bool ok) {
        (ok,) = address(vault).call(abi.encodeCall(LevadaVault.claim, (who)));
    }
}

// ------------------------------------------------------------------------ helpers

/// @notice Deposits, relays a report and redeems, all in one transaction.
contract ReportSandwich {
    LevadaVault immutable vault;
    IERC20 immutable musd;

    constructor(LevadaVault vault_, IERC20 musd_) {
        vault = vault_;
        musd = musd_;
    }

    function run(bytes calldata reportVm) external {
        uint256 amount = musd.balanceOf(address(this));
        musd.approve(address(vault), amount);
        vault.deposit(amount, address(this));
        vault.receiveReport(reportVm);
        vault.redeem(vault.balanceOf(address(this)), address(this), address(this));
    }
}

interface IPortStrategy {
    function allocate(uint256 amount) external;
    function deallocate(uint256 amount) external;
    function claimYield() external returns (uint256);
}

/// @notice Mezo's IdleStrategy: holds sMUSD principal and yields nothing.
contract PortIdleStrategy is IPortStrategy {
    IERC20 internal immutable musd;
    address internal immutable savingsVault;

    constructor(IERC20 musd_, address savingsVault_) {
        musd = musd_;
        savingsVault = savingsVault_;
    }

    function allocate(uint256 amount) external {
        musd.transferFrom(savingsVault, address(this), amount);
    }

    function deallocate(uint256 amount) external {
        musd.transfer(savingsVault, amount);
    }

    function claimYield() external virtual returns (uint256) {
        return 0;
    }
}

/// @notice A yield strategy whose payout on a given claim is dust (pre-funded with MUSD).
contract PortDustStrategy is PortIdleStrategy {
    uint256 public immutable payout;

    constructor(IERC20 musd_, address savingsVault_, uint256 payout_) PortIdleStrategy(musd_, savingsVault_) {
        payout = payout_;
    }

    function claimYield() external override returns (uint256) {
        musd.transfer(savingsVault, payout);
        return payout;
    }
}

/// @notice Non-upgradeable port of Mezo's MUSDSavingsRate (/tmp/claude-501/MUSDSavingsRate.sol)
///         keeping, line for line, the parts Levada depends on: deposit and withdraw re-run
///         receiveYieldFromStrategy() unguarded, _receiveYield reverts AmountTooSmall,
///         withdraw pays claimable yield first, and every transfer updates both indexes.
///         PCV, gauge cap and ERC2771 are left out (no effect on the hub's address).
contract PortedSavingsRate is ERC20 {
    error ZeroAmount();
    error InsufficientBalance();
    error AmountTooSmall();

    IERC20 internal immutable musd;
    IPortStrategy public strategy;
    uint256 public yieldIndex;
    mapping(address => uint256) public supplyYieldIndex;
    mapping(address => uint256) public claimableYield;
    uint256 public pendingYield;
    bool private entered;

    modifier nonReentrant() {
        require(!entered, "reentrancy");
        entered = true;
        _;
        entered = false;
    }

    constructor(IERC20 musd_) ERC20("MUSD Savings Rate", "sMUSD") {
        musd = musd_;
        strategy = new PortIdleStrategy(musd_, address(this));
    }

    function musdToken() external view returns (address) {
        return address(musd);
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        receiveYieldFromStrategy();
        musd.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        musd.approve(address(strategy), amount);
        strategy.allocate(amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();
        receiveYieldFromStrategy();
        _claimYield(msg.sender);
        strategy.deallocate(amount);
        _burn(msg.sender, amount);
        musd.transfer(msg.sender, amount);
    }

    function claimYield() external nonReentrant returns (uint256) {
        return _claimYield(msg.sender);
    }

    function receiveProtocolYield(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        musd.transferFrom(msg.sender, address(this), amount);
        _receiveYield(amount);
    }

    function receiveYieldFromStrategy() public {
        uint256 amount = strategy.claimYield();
        if (amount > 0) _receiveYield(amount);
    }

    /// @dev onlyOwner on Mezo. Same effect as setStrategy + migrate.
    function setStrategy(IPortStrategy newStrategy) external {
        receiveYieldFromStrategy();
        uint256 principal = totalSupply();
        strategy.deallocate(principal);
        strategy = newStrategy;
        musd.approve(address(newStrategy), principal);
        newStrategy.allocate(principal);
    }

    function _claimYield(address depositor) internal returns (uint256 claimable) {
        _updateYieldFor(depositor);
        claimable = claimableYield[depositor];
        if (claimable > 0) {
            claimableYield[depositor] -= claimable;
            musd.transfer(depositor, claimable);
        }
    }

    function _receiveYield(uint256 amount) internal {
        uint256 supply = totalSupply();
        if (supply > 0) {
            uint256 total = amount + pendingYield;
            pendingYield = 0;
            uint256 ratio = (total * 1e18) / supply;
            if (ratio > 0) yieldIndex += ratio;
            else revert AmountTooSmall();
        } else {
            pendingYield += amount;
        }
    }

    function _updateYieldFor(address recipient) internal {
        uint256 supplied = balanceOf(recipient);
        if (supplied > 0) {
            uint256 last = supplyYieldIndex[recipient];
            supplyYieldIndex[recipient] = yieldIndex;
            uint256 delta = yieldIndex - last;
            if (delta > 0) claimableYield[recipient] += (supplied * delta) / 1e18;
        } else {
            supplyYieldIndex[recipient] = yieldIndex;
        }
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != to) {
            _updateYieldFor(from);
            _updateYieldFor(to);
        }
        super._update(from, to, value);
    }
}

/// @notice NTT outbound rate limit in front of a MockNtt. As in NttManager, capacity never
///         exceeds the limit, and with shouldQueue == false an over-capacity transfer reverts.
contract OutboundLimitedNtt {
    MockNtt public immutable inner;
    IERC20 internal immutable musd;
    uint256 public outboundLimit = type(uint256).max;

    constructor(MockNtt inner_) {
        inner = inner_;
        musd = IERC20(inner_.token());
    }

    function token() external view returns (address) {
        return address(musd);
    }

    function setOutboundLimit(uint256 limit) external {
        outboundLimit = limit;
    }

    function getCurrentOutboundCapacity() external view returns (uint256) {
        return outboundLimit;
    }

    function transfer(
        uint256 amount,
        uint16 recipientChain,
        bytes32 recipient,
        bytes32 refundAddress,
        bool shouldQueue,
        bytes memory instructions
    ) external payable returns (uint64) {
        if (amount > outboundLimit && !shouldQueue) revert("NotEnoughCapacity");
        musd.transferFrom(msg.sender, address(this), amount);
        musd.approve(address(inner), amount);
        return inner.transfer(amount, recipientChain, recipient, refundAddress, shouldQueue, instructions);
    }
}

// =============================================================== findings: core

contract AuditTest is AuditBase {
    // =================================================================== HIGH

    /// H-1. The share price only moves when a report is relayed; anyone can publish a report
    /// on Mezo and anyone can relay it on Base. In ONE Base transaction an attacker deposits
    /// at the stale price, relays, and redeems at the new price from the buffer their own
    /// deposit just refilled. Their MUSD is never bridged and earns nothing, yet it takes
    /// X/(T+X) of every report's yield.
    function test_H1_jitDepositAroundReportRelayStealsYield() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        vm.warp(block.timestamp + 30 days);
        savings.addYield(9e18); // 30 days of yield on Alice's 900 in sMUSD (8.1 net of fee)

        hub.report(); // the attacker publishes the report themselves
        bytes memory reportVm = mezoWh.lastVm();

        ReportSandwich attacker = new ReportSandwich(vault, IERC20(address(baseMusd)));
        baseMusd.mint(address(attacker), 9_000e18);
        attacker.run(reportVm);

        uint256 attackerEnd = baseMusd.balanceOf(address(attacker));
        emit log_named_decimal_uint("attacker profit, 0 s exposure (MUSD)", attackerEnd - 9_000e18, 18);
        emit log_named_decimal_uint(
            "alice's position, should be 1008.1 (MUSD)", vault.convertToAssets(vault.balanceOf(alice)), 18
        );
        assertLe(attackerEnd, 9_000e18, "H-1: zero-duration deposit captured ~90% of Alice's 30-day yield");
    }

    /// H-2, simplest shape (found by the liveness fuzzer, one user, no claims, no attacker).
    /// freeIdle() nets the first exit's hub part, which has not arrived yet, against the new
    /// deposit, so the second exit asks the hub for it again. Requests then exceed what the
    /// hub will ever hold, and because the hub pays all-or-nothing the last request can never
    /// be honoured. Same result if the first request was processed but its MUSD has not landed.
    function test_H2_twoExitsAroundADepositStrandTheSecond() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub(); // 900 on its way to Mezo

        vm.prank(alice);
        (, uint256 first,) = vault.requestWithdraw(500e18); // 100 from the buffer, 400 from the hub
        bytes memory request1 = baseWh.lastVm();
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vm.prank(alice);
        (, uint256 second,) = vault.requestWithdraw(1_500e18); // everything left
        bytes memory request2 = baseWh.lastVm();
        assertEq(first + second, 900e18, "fixed: never asks the hub for more than it will hold");

        _deliverToMezo();
        assertTrue(_tryProcess(request1));
        _deliverToBase();
        assertEq(baseMusd.balanceOf(address(vault)) + savings.balanceOf(address(hub)), 2_000e18, "all there");
        bool processed = _tryProcess(request2); // 900 asked, 500 held
        bool claimed = _tryClaim(alice); // 2000 owed, 1500 on Base
        assertTrue(processed && claimed, "H-2: Alice's own second exit can never complete");
    }

    /// H-2. claim() pays from any MUSD on Base, so a queued exit can be paid before its
    /// WITHDRAW is honoured, and that WITHDRAW stays valid on Mezo. The hub honours requests
    /// all-or-nothing, in any order, so processing the stale request (FIFO by an honest
    /// keeper, or deliberately by anyone) moves another user's backing to Base and leaves the
    /// hub holding less than that user's request. All of Bob's MUSD exists, part on Base and
    /// part in sMUSD, but no message can ever move the sMUSD part.
    ///
    /// The race happens naturally: WITHDRAW is published at consistency 200 (seconds) while the
    /// NTT transfer from bridgeToHub uses the transceiver's 202 (Base finality, ~20 min), so a
    /// request made soon after a bridge reaches the hub before the funds do.
    function test_H2_staleWithdrawRequestStrandsAnotherUsersExit() public {
        vm.prank(alice);
        uint256 aliceShares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub(); // 900 leaves Base, waits for Base finality, not on Mezo yet

        vm.prank(alice);
        vault.requestWithdraw(aliceShares); // 100 reserved on Base, 900 asked of the hub
        bytes memory requestA = baseWh.lastVm();
        assertFalse(_tryProcess(requestA), "hub cannot pay before the bridged MUSD lands");

        vm.prank(bob);
        uint256 bobShares = vault.deposit(1_500e18, bob);
        assertFalse(_tryClaim(alice), "fixed: Alice is paid from her own MUSD, not Bob's deposit");

        vault.bridgeToHub(); // Bob's deposit above the buffer
        mezoNtt.deliver(baseNtt, 0);
        mezoNtt.deliver(baseNtt, 1);

        vm.prank(bob);
        (uint256 bobAssets, uint256 bobRequested,) = vault.requestWithdraw(bobShares);
        assertEq(bobAssets, 1_500e18);
        assertEq(bobRequested, 1_350e18);
        bytes memory requestB = baseWh.lastVm();

        assertTrue(_tryProcess(requestA), "Alice's request is honoured");
        _deliverToBase();
        assertTrue(_tryProcess(requestB), "and so is Bob's");
        _deliverToBase();
        assertTrue(_tryClaim(alice) && _tryClaim(bob), "fixed: both exits complete");
        assertEq(baseMusd.balanceOf(alice), 10_000e18);
        assertEq(baseMusd.balanceOf(bob), 10_000e18);
    }

    /// H-2, reorg variant. A Base reorg can drop or reorder the transactions around a request
    /// already signed at consistency 200. Here the canonical chain lets Alice exit from the
    /// buffer instead, so the orphaned WITHDRAW is pure excess, and honouring it strands Bob
    /// just as above. "A reorged request only sends MUSD the vault does not count" holds for
    /// the books but not for liveness.
    function test_H2_reorgedWithdrawRequestStrandsAnotherUsersExit() public {
        vm.prank(alice);
        uint256 aliceShares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report(); // 100 on Base, 900 in sMUSD

        uint256 snap = vm.snapshotState();
        vm.prank(alice);
        vault.requestWithdraw(aliceShares); // unsafe Base block, signed at 200
        bytes memory orphan = baseWh.lastVm();
        vm.revertToState(snap); // the reorg; the guardians' signatures survive it
        guardians.sign(abi.decode(orphan, (IWormhole.VM)).hash);

        vm.prank(bob); // canonical order: Bob's deposit lands first
        uint256 bobShares = vault.deposit(2_000e18, bob);
        vm.prank(alice);
        (, uint256 aliceRequested,) = vault.requestWithdraw(aliceShares);
        assertEq(aliceRequested, 0, "canonical chain: Alice never asks the hub");
        vault.claim(alice);

        vault.bridgeToHub();
        _deliverToMezo(); // hub: 900 (Alice's old backing, now Bob's) + 900

        vm.prank(bob);
        (, uint256 bobRequested,) = vault.requestWithdraw(bobShares);
        bytes memory canonical = baseWh.lastVm();
        assertEq(bobRequested, 1_800e18);
        assertEq(_seq(orphan), _seq(canonical), "same emitter sequence, different payload");

        assertTrue(_tryProcess(orphan), "the orphaned VAA is valid and honoured");
        _deliverToBase();
        bool processed = _tryProcess(canonical); // the hub sends what it has left
        _deliverToBase();
        bool claimed = _tryClaim(bob);
        assertTrue(processed && claimed, "fixed: an orphaned WITHDRAW cannot strand Bob's exit");
        assertEq(baseMusd.balanceOf(bob), 10_000e18);
    }

    // ================================================================= MEDIUM

    /// M-1. A queued exit that fits in the buffer reserves MUSD on Base for its owner, but
    /// claim() pays whoever is claimed first from the shared balance. A later requester (or
    /// anyone calling claim for them) takes the reserved MUSD, and the first user now waits on
    /// the later user's cross-chain transfer, including any delay or failure on that path.
    function test_M1_reservedBufferExitCanBeTakenByAnotherClaim() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vm.prank(bob);
        vault.deposit(1_000e18, bob);
        vault.bridgeToHub();
        _deliverToMezo();
        _report(); // 200 on Base

        vm.prank(alice);
        (, uint256 aliceRequested,) = vault.requestWithdraw(200e18);
        assertEq(aliceRequested, 0, "Alice's exit is fully funded on Base");

        vm.prank(bob);
        (, uint256 bobRequested,) = vault.requestWithdraw(150e18);
        assertEq(bobRequested, 150e18, "Bob's exit is asked of the hub");

        assertFalse(_tryClaim(bob), "fixed: Bob waits for his own MUSD from Mezo");
        assertTrue(_tryClaim(alice), "Alice's reserved 200 MUSD is still hers");
    }

    // ==================================================================== LOW

    /// L-1. freeIdle() subtracts every queued exit, including the part still to come from the
    /// hub, from the MUSD on Base right now. While any such exit is in flight, fresh deposits
    /// can be neither withdrawn instantly nor bridged, and maxWithdraw() reports 0 to
    /// integrators although nobody else needs that MUSD.
    function test_L1_inflightQueuedExitFreezesInstantExitsAndBridging() public {
        vm.prank(alice);
        uint256 aliceShares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        vm.prank(alice);
        vault.requestWithdraw(aliceShares); // 100 reserved on Base, 900 coming from Mezo

        vm.prank(bob);
        vault.deposit(500e18, bob);
        assertEq(baseMusd.balanceOf(address(vault)), 600e18, "500 of it is Bob's and owed to nobody");
        emit log_named_decimal_uint("bridgeable with 500 MUSD idle", vault.bridgeable(), 18);
        assertEq(vault.maxWithdraw(bob), 500e18, "L-1: Bob cannot take back his own fresh deposit");
    }

    /// L-2. The APR clamp adds a fixed 1e15 per report and accepts zero elapsed time, so N
    /// reports published in one Mezo second recognise N * 1e15 at once.
    function test_L2_zeroElapsedReportsRatchetPastTheAprClamp() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        savings.addYield(10e18); // a lump the clamp is meant to throttle
        uint256 before = vault.totalAssets();
        for (uint256 i; i < 200; ++i) {
            _report(); // same block, same timestamp
        }
        emit log_named_decimal_uint("recognised in zero seconds (MUSD)", vault.totalAssets() - before, 18);
        assertLe(vault.totalAssets() - before, 1e15, "L-2: 200 reports in one second each added 1e15");
    }

    /// L-3. sMUSD shares sent to the hub count in report.assets but never in cumulativeIn,
    /// so they raise the share price (up to the clamp). This contradicts the stated
    /// "sent without a deposit is ignored" invariant, and lets anyone push the price of
    /// lsMUSD wherever it is used as collateral.
    function test_L3_sMUSDDonatedToTheHubMovesTheSharePrice() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        uint256 price = vault.convertToAssets(1e18);

        address donor = makeAddr("donor");
        mezoMusd.mint(donor, 50e18);
        vm.startPrank(donor);
        mezoMusd.approve(address(savings), 50e18);
        savings.deposit(50e18);
        savings.transfer(address(hub), 50e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        _report();
        assertEq(vault.convertToAssets(1e18), price, "L-3: sMUSD sent to the hub moved the share price");
    }

    /// L-4. requestWithdraw is payable but only spends msg.value when it asks the hub. When
    /// the buffer covers the whole exit, the fee the UI attached stays in the vault, which
    /// has no way to send ETH out. The UI cannot know in advance which case it will hit.
    function test_L4_requestWithdrawKeepsMsgValueWhenTheHubIsNotAsked() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice); // not bridged: all on Base
        vm.prank(alice);
        (, uint256 requested,) = vault.requestWithdraw{value: 0.01 ether}(shares);
        assertEq(requested, 0);
        assertEq(address(vault).balance, 0, "L-4: 0.01 ETH is stuck in the vault forever");
    }

    /// L-7. The hub owner "cannot move deposits", but setTreasury() accepts any non-zero
    /// address, and Mezo MUSD reverts transfers to some (verified on mainnet: to the MUSD
    /// contract itself, "ERC20: transfer to the contract address"). With such a treasury every
    /// _sync() that has yield to charge reverts, freezing report() and every queued exit.
    function test_L7_treasuryMusdRefusesFreezesEveryQueuedExit() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        vm.prank(alice);
        vault.requestWithdraw(shares);
        bytes memory request = baseWh.lastVm();

        vm.warp(block.timestamp + 1 days);
        savings.addYield(0.1e18);
        vm.prank(owner);
        vm.expectRevert(LevadaHub.BadTreasury.selector);
        hub.setTreasury(address(mezoMusd));

        address refusing = makeAddr("refusing");
        vm.prank(owner);
        hub.setTreasury(refusing);
        vm.mockCallRevert(
            address(mezoMusd), abi.encodeWithSelector(IERC20.transfer.selector, refusing), bytes("refused")
        );
        assertTrue(_tryProcess(request), "fixed: fees accrue; a refusing treasury cannot freeze exits");
        vm.expectRevert(bytes("refused"));
        hub.claimFees();
    }

    /// L-8. (found by the liveness fuzzer) receiveReport books profit even when no shares
    /// exist, e.g. yield still at the hub after the last holder left. With
    /// _decimalsOffset() == 0 the next depositor's shares are divided by (totalAssets + 1),
    /// so the share unit is permanently coarse: every later deposit/withdraw rounds by up to
    /// one share-wei of value, small deposits buy zero shares. L-2's slack lets anyone raise
    /// the leftover at ~1e15 per report.
    function test_L8_profitBookedWithZeroSupplyCollapsesTheShareScale() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        vm.warp(block.timestamp + 1 days);
        savings.addYield(0.1e18); // earned, not yet reported
        vm.prank(alice);
        vault.requestWithdraw(shares); // the last holder leaves
        hub.processWithdrawal(baseWh.lastVm());
        _deliverToBase();
        vault.claim(alice);
        assertEq(vault.totalSupply(), 0);

        _report(); // the keeper's routine report books 1e15 with no shares outstanding
        vm.prank(bob);
        uint256 bobShares = vault.deposit(1_000e18, bob);
        emit log_named_uint("lsMUSD-wei minted for 1000 MUSD", bobShares);
        vm.prank(carol);
        uint256 carolShares = vault.deposit(0.0009e18, carol);
        assertGt(carolShares, 0, "L-8: Carol's deposit bought zero shares and now belongs to Bob");
    }

    // ================================================================== INFO

    /// I-1. setFee() does not sync first, so the new rate also applies to yield earned
    /// under the old rate since the last sync.
    function test_I1_feeChangeAppliesToYieldEarnedBeforeIt() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        vm.warp(block.timestamp + 30 days);
        savings.addYield(9e18); // earned while the fee is 10%
        vm.prank(owner);
        hub.setFee(2_000);
        hub.sync();
        assertEq(hub.accruedFees(), 0.9e18, "fixed: yield earned at 10% is charged 10%");
    }

    /// I-2. ERC-4626 says maxMint MUST NOT revert. maxMint = convertToShares(depositCap -
    /// totalAssets) overflows mulDiv once the cap is "unlimited" (type(uint256).max) and the
    /// share price is below 1, e.g. after a hub loss is reported.
    function test_I2_maxMintRevertsWithAnUnlimitedCapAfterALoss() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        vm.prank(owner);
        vault.setDepositCap(type(uint256).max);

        // sMUSD reports 1% less principal for the hub (strategy loss)
        vm.mockCall(
            address(savings), abi.encodeWithSelector(IERC20.balanceOf.selector, address(hub)), abi.encode(891e18)
        );
        vm.warp(block.timestamp + 1);
        _report();
        assertLt(vault.totalAssets(), vault.totalSupply());
        (bool ok,) = address(vault).staticcall(abi.encodeCall(vault.maxMint, (bob)));
        assertTrue(ok, "I-2: maxMint reverted");
    }

    // ================================================================== SAFE

    /// The books survive a reorged request: no value is created or destroyed, the
    /// orphan's MUSD lands as untracked buffer, and a normal follow-up exit completes.
    function test_safe_reorgedRequestLeavesTheBooksExact() public {
        vm.prank(alice);
        uint256 aliceShares = vault.deposit(1_000e18, alice);
        vm.prank(bob);
        vault.deposit(1_000e18, bob);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        uint256 assetsBefore = vault.totalAssets();

        uint256 snap = vm.snapshotState();
        vm.prank(alice);
        vault.requestWithdraw(aliceShares);
        bytes memory orphan = baseWh.lastVm();
        vm.revertToState(snap);
        guardians.sign(abi.decode(orphan, (IWormhole.VM)).hash);

        hub.processWithdrawal(orphan);
        _deliverToBase();
        assertEq(vault.totalAssets(), assetsBefore, "share price unaffected");
        assertEq(vault.freeIdle(), 1_000e18, "orphan MUSD (800) is spare buffer on Base");
        _report();
        assertEq(vault.totalAssets(), assetsBefore, "hub profit unaffected");

        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);
        assertEq(baseMusd.balanceOf(alice), 10_000e18, "alice exits whole");
    }

    /// Wrong emitter chain with the right address is rejected on both sides.
    function test_safe_rightAddressWrongChainIsRejected() public {
        MockWormhole otherChain = new MockWormhole(guardians, 2);
        vm.prank(address(hub)); // same address as the hub, other chain
        otherChain.publishMessage(0, abi.encode(uint8(1), 1e24, 0, 0, uint64(block.timestamp)), 202);
        bytes memory fakeReport = otherChain.lastVm();
        vm.expectRevert(abi.encodeWithSelector(LevadaVault.UnknownEmitter.selector, uint16(2), _b32(address(hub))));
        vault.receiveReport(fakeReport);

        vm.prank(address(vault));
        otherChain.publishMessage(0, abi.encode(uint8(2), 1e20, uint64(1)), 200);
        bytes memory fakeWithdraw = otherChain.lastVm();
        vm.expectRevert(abi.encodeWithSelector(LevadaHub.UnknownEmitter.selector, uint16(2), _b32(address(vault))));
        hub.processWithdrawal(fakeWithdraw);
    }

    /// Each side's own messages cannot be replayed into itself or the other side.
    function test_safe_ownMessagesCannotBeFedBack() public {
        hub.report();
        bytes memory reportVm = mezoWh.lastVm();
        vm.expectRevert(abi.encodeWithSelector(LevadaHub.UnknownEmitter.selector, MEZO, _b32(address(hub))));
        hub.processWithdrawal(reportVm);

        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        vm.prank(alice);
        vault.requestWithdraw(shares);
        bytes memory withdrawVm = baseWh.lastVm();
        vm.expectRevert(abi.encodeWithSelector(LevadaVault.UnknownEmitter.selector, BASE, _b32(address(vault))));
        vault.receiveReport(withdrawVm);
    }
}

// ========================================================= findings: real sMUSD

/// @dev Same flows against a faithful port of Mezo's MUSDSavingsRate instead of the mock.
contract AuditRealSavingsTest is AuditBase {
    PortedSavingsRate real;

    function _makeSavings() internal override returns (IMUSDSavingsRate) {
        real = new PortedSavingsRate(IERC20(address(mezoMusd)));
        return IMUSDSavingsRate(address(real));
    }

    function _protocolYield(uint256 amount) internal {
        mezoMusd.mint(address(this), amount);
        mezoMusd.approve(address(real), amount);
        real.receiveProtocolYield(amount);
    }

    /// L-5. _sync() wraps receiveYieldFromStrategy() in try/catch to survive a dust strategy
    /// payout, but sMUSD.deposit() and sMUSD.withdraw() call it again, unguarded. While the
    /// strategy's payout is dust, processWithdrawal always reverts AmountTooSmall, and report()
    /// does too whenever MUSD has arrived to be deposited.
    function test_L5_dustStrategyPayoutStillRevertsDespiteTryCatch() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        PortDustStrategy dust = new PortDustStrategy(IERC20(address(mezoMusd)), address(real), 1);
        mezoMusd.mint(address(dust), 1e18);
        real.setStrategy(dust); // Mezo's owner moves sMUSD to a strategy that pays dust

        // New deposits still arrive and reports still work: the hub holds MUSD idle.
        vm.prank(bob);
        vault.deposit(1_000e18, bob);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        assertEq(hub.knownIdle(), 900e18, "fixed: deposit into sMUSD skipped, MUSD held idle");

        // Exits are paid from idle MUSD while sMUSD.withdraw would revert.
        vm.prank(alice);
        vault.requestWithdraw(shares / 2);
        assertTrue(_tryProcess(baseWh.lastVm()), "fixed: exit served from idle MUSD");
        _deliverToBase();
        assertTrue(_tryClaim(alice));
    }

    /// End to end against the real yield mechanics, protocol yield via receiveProtocolYield.
    function test_safe_endToEndAgainstPortedSavingsRate() public {
        vm.prank(alice);
        uint256 aShares = vault.deposit(1_000e18, alice);
        vm.prank(bob);
        uint256 bShares = vault.deposit(3_000e18, bob);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        assertEq(real.balanceOf(address(hub)), 3_600e18);

        vm.warp(block.timestamp + 30 days);
        _protocolYield(36e18); // hub is the only sMUSD holder; divides exactly
        _report();
        hub.claimFees();
        assertEq(mezoMusd.balanceOf(treasury), 3.6e18, "10% of 36");
        vm.warp(block.timestamp + vault.PROFIT_UNLOCK());
        assertEq(vault.totalAssets(), 4_032.4e18);

        vm.prank(alice);
        (uint256 aAssets,,) = vault.requestWithdraw(aShares);
        hub.processWithdrawal(baseWh.lastVm());
        _deliverToBase();
        vault.claim(alice);
        vm.prank(bob);
        (uint256 bAssets,,) = vault.requestWithdraw(bShares);
        hub.processWithdrawal(baseWh.lastVm());
        _deliverToBase();
        vault.claim(bob);

        assertApproxEqAbs(aAssets + bAssets, 4_032.4e18, 1e11);
        assertApproxEqAbs(baseMusd.balanceOf(alice), 10_008.1e18, 2e10);
        assertApproxEqAbs(baseMusd.balanceOf(bob), 10_024.3e18, 2e10);
        assertEq(vault.totalSupply(), 0);
    }

    /// With a yield-paying strategy, sMUSD pays the hub yield inside withdraw() (credited during
    /// _sync's own deposit). _compound(balanceOf) after the NTT send charges it exactly once.
    function test_safe_feeTakenExactlyOnceOnYieldPaidInsideWithdraw() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        PortDustStrategy paying = new PortDustStrategy(IERC20(address(mezoMusd)), address(real), 1e18);
        mezoMusd.mint(address(paying), 100e18);
        real.setStrategy(paying); // every deposit/withdraw/receive now distributes 1 MUSD

        // MUSD arriving at the hub makes _sync deposit, which credits yield claimable mid-withdraw.
        mezoMusd.mint(address(hub), 10e18);
        vm.prank(alice);
        vault.requestWithdraw(shares / 2);

        uint256 smusdBefore = real.balanceOf(address(hub));
        uint256 feeBefore = hub.accruedFees();
        uint256 outBefore = hub.cumulativeOut();
        uint256 inBefore = hub.cumulativeIn();
        hub.processWithdrawal(baseWh.lastVm());

        uint256 fee = hub.accruedFees() - feeBefore;
        uint256 inflow = hub.cumulativeIn() - inBefore;
        uint256 claimed = real.balanceOf(address(hub)) + hub.knownIdle() + (hub.cumulativeOut() - outBefore) + fee
            - smusdBefore - inflow;
        assertEq(mezoMusd.balanceOf(address(hub)), hub.accruedFees() + hub.knownIdle(), "idle MUSD fully booked");
        assertGt(claimed, 2.99e18, "yield claimed in _sync and paid inside withdraw()");
        assertApproxEqAbs(fee, claimed / 10, 2, "10% of everything claimed, once");
        hub.sync();
        assertEq(hub.knownIdle(), 0, "held yield is deposited on the next sync");
    }
}

// ======================================================= findings: NTT limits

contract AuditRateLimitTest is AuditBase {
    OutboundLimitedNtt limited;

    function _makeHubNtt() internal override returns (INttManager) {
        limited = new OutboundLimitedNtt(mezoNtt);
        return INttManager(address(limited));
    }

    /// L-6. The hub sends with shouldQueue = false and all-or-nothing. If Mezo's NTT owner sets
    /// an outbound limit (today it is uint64.max), any single queued exit above the limit can
    /// never be processed: capacity refills to the limit, never above it, and the user's
    /// shares are already burned.
    function test_L6_exitAboveTheMezoOutboundLimitCanNeverBeProcessed() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        limited.setOutboundLimit(500e18); // e.g. 500 MUSD per 24 h
        vm.prank(alice);
        vault.requestWithdraw(shares); // 900 asked of the hub
        vm.warp(block.timestamp + 30 days);
        assertTrue(_tryProcess(baseWh.lastVm()), "L-6: a 900 MUSD request can never pass a 500 MUSD limit");
    }
}

// ================================================================== invariants

/// @notice Random sequences of every permissionless action, with every relay and delivery
///         order allowed. Flags any call that max*/state said would succeed but reverted.
contract LevadaHandler is Test {
    LevadaVault immutable vault;
    LevadaHub immutable hub;
    MockMUSD immutable baseMusd;
    MockMUSD immutable mezoMusd;
    MockNtt immutable baseNtt;
    MockNtt immutable mezoNtt;
    MockWormhole immutable baseWh;
    MockWormhole immutable mezoWh;
    MockSavingsRate immutable savings;
    address[3] actors;

    mapping(uint256 => bool) public deliveredToMezo;
    mapping(uint256 => bool) public deliveredToBase;
    bytes[] public requests;
    mapping(uint256 => bool) public requestDone;
    bytes[] public reports;

    uint256 public arrivedBack;
    uint256 public donatedBase;
    uint256 public donatedHub;
    uint256 public unexpected;
    string public lastUnexpected;
    uint256 public lastYield;
    mapping(address => uint256) public startBalance;

    constructor(
        LevadaVault vault_,
        LevadaHub hub_,
        MockMUSD baseMusd_,
        MockMUSD mezoMusd_,
        MockNtt baseNtt_,
        MockNtt mezoNtt_,
        MockWormhole baseWh_,
        MockWormhole mezoWh_,
        MockSavingsRate savings_,
        address[3] memory actors_
    ) {
        vault = vault_;
        hub = hub_;
        baseMusd = baseMusd_;
        mezoMusd = mezoMusd_;
        baseNtt = baseNtt_;
        mezoNtt = mezoNtt_;
        baseWh = baseWh_;
        mezoWh = mezoWh_;
        savings = savings_;
        actors = actors_;
        lastYield = block.timestamp;
        for (uint256 i; i < 3; ++i) {
            startBalance[actors_[i]] = baseMusd_.balanceOf(actors_[i]);
        }
    }

    // ----------------------------------------------------------------- actions

    function deposit(uint256 seed, uint256 amount) external {
        address a = actors[seed % 3];
        uint256 cap = vault.maxDeposit(a);
        uint256 bal = baseMusd.balanceOf(a);
        amount = bound(amount, 0, cap < bal ? cap : bal);
        if (amount == 0) return;
        uint256 preview = vault.previewDeposit(amount);
        if (preview == 0) return; // zero-share deposits revert by design (L-8 fix)
        vm.prank(a);
        try vault.deposit(amount, a) returns (uint256 shares) {
            if (shares != preview) _flag("deposit != previewDeposit");
        } catch {
            _flag("deposit <= maxDeposit reverted");
        }
    }

    function mint(uint256 seed, uint256 shares) external {
        address a = actors[seed % 3];
        shares = bound(shares, 0, vault.maxMint(a));
        if (shares == 0 || vault.previewMint(shares) > baseMusd.balanceOf(a)) return;
        uint256 preview = vault.previewMint(shares);
        vm.prank(a);
        try vault.mint(shares, a) returns (uint256 assets) {
            if (assets != preview) _flag("mint != previewMint");
        } catch {
            _flag("mint <= maxMint reverted");
        }
    }

    function withdraw(uint256 seed, uint256 amount) external {
        address a = actors[seed % 3];
        amount = bound(amount, 0, vault.maxWithdraw(a));
        if (amount == 0) return;
        uint256 preview = vault.previewWithdraw(amount);
        vm.prank(a);
        try vault.withdraw(amount, a, a) returns (uint256 shares) {
            if (shares != preview) _flag("withdraw != previewWithdraw");
        } catch {
            _flag("withdraw <= maxWithdraw reverted");
        }
    }

    function redeem(uint256 seed, uint256 shares) external {
        address a = actors[seed % 3];
        shares = bound(shares, 0, vault.maxRedeem(a));
        if (shares == 0) return;
        uint256 preview = vault.previewRedeem(shares);
        vm.prank(a);
        try vault.redeem(shares, a, a) returns (uint256 assets) {
            if (assets != preview) _flag("redeem != previewRedeem");
        } catch {
            _flag("redeem <= maxRedeem reverted");
        }
    }

    function requestWithdraw(uint256 seed, uint256 shares) external {
        address a = actors[seed % 3];
        uint256 bal = vault.balanceOf(a);
        if (bal == 0) return;
        shares = bound(shares, 1, bal);
        vm.prank(a);
        try vault.requestWithdraw(shares) returns (uint256, uint256 requested, uint64) {
            if (requested != 0) requests.push(baseWh.lastVm());
        } catch {}
    }

    function claim(uint256 seed) external {
        address a = actors[seed % 3];
        uint256[] memory ids = vault.exitsOf(a);
        bool claimable;
        for (uint256 i; i < ids.length; ++i) {
            if (vault.isClaimable(ids[i])) claimable = true;
        }
        (bool ok,) = address(vault).call(abi.encodeCall(LevadaVault.claim, (a)));
        if (claimable && !ok) _flag("claim reverted with a claimable exit");
    }

    function bridge() external {
        uint256 amount = vault.bridgeable();
        (bool ok,) = address(vault).call(abi.encodeCall(LevadaVault.bridgeToHub, ()));
        if (amount != 0 && !ok) _flag("bridgeToHub reverted with bridgeable > 0");
    }

    function deliverToMezo(uint256 seed) external {
        uint256 n = baseNtt.sentCount();
        if (n == 0) return;
        uint256 i = seed % n;
        if (deliveredToMezo[i]) return;
        deliveredToMezo[i] = true;
        mezoNtt.deliver(baseNtt, i);
    }

    function deliverToBase(uint256 seed) external {
        uint256 n = mezoNtt.sentCount();
        if (n == 0) return;
        uint256 i = seed % n;
        if (deliveredToBase[i]) return;
        deliveredToBase[i] = true;
        (uint256 amount,,) = mezoNtt.sent(i);
        arrivedBack += amount;
        baseNtt.deliver(mezoNtt, i);
    }

    function report() external {
        try hub.report() {
            reports.push(mezoWh.lastVm());
        } catch {
            _flag("hub.report reverted");
        }
    }

    function relay(uint256 seed) external {
        if (reports.length == 0) return;
        try vault.receiveReport(reports[seed % reports.length]) {} catch {}
    }

    function process(uint256 seed) external {
        if (requests.length == 0) return;
        uint256 i = seed % requests.length;
        if (requestDone[i]) return;
        _process(i);
    }

    /// @dev Requests fill in parts; a request is done once the hub says AlreadyProcessed.
    function _process(uint256 i) internal {
        (bool ok, bytes memory ret) = address(hub).call(abi.encodeCall(LevadaHub.processWithdrawal, (requests[i])));
        if (!ok && ret.length >= 4 && bytes4(ret) == LevadaHub.AlreadyProcessed.selector) requestDone[i] = true;
    }

    function addYield(uint256 amount) external {
        uint256 supply = savings.totalSupply();
        if (supply == 0) return;
        uint256 cap = (supply * 1_000 * (block.timestamp - lastYield)) / (10_000 * 365 days); // <= 10% APR
        lastYield = block.timestamp;
        amount = bound(amount, 0, cap);
        if ((amount * 1e18) / supply == 0) return;
        savings.addYield(amount);
    }

    function warp(uint256 dt) external {
        vm.warp(block.timestamp + bound(dt, 1, 3 days));
    }

    function donateBase(uint256 amount) external {
        amount = bound(amount, 0, 100e18);
        baseMusd.mint(address(vault), amount);
        donatedBase += amount;
    }

    function donateHub(uint256 amount) external {
        amount = bound(amount, 0, 100e18);
        mezoMusd.mint(address(hub), amount);
        donatedHub += amount;
    }

    // --------------------------------------------------------------- end state

    /// @notice Delivers and processes everything (FIFO, repeatedly), then everyone exits.
    function drainAndExitAll() external {
        for (uint256 round; round < 4; ++round) {
            _deliverAll();
            for (uint256 pass; pass < 3; ++pass) {
                for (uint256 i; i < requests.length; ++i) {
                    if (!requestDone[i]) _process(i);
                }
                _deliverAll();
            }
            for (uint256 k; k < 3; ++k) {
                address a = actors[k];
                (bool claimed,) = address(vault).call(abi.encodeCall(LevadaVault.claim, (a)));
                claimed;
                uint256 bal = vault.balanceOf(a);
                if (bal == 0) continue;
                vm.prank(a);
                try vault.requestWithdraw(bal) returns (uint256, uint256 requested, uint64) {
                    if (requested != 0) requests.push(baseWh.lastVm());
                } catch {}
            }
        }
    }

    function _deliverAll() internal {
        for (uint256 i; i < baseNtt.sentCount(); ++i) {
            if (!deliveredToMezo[i]) {
                deliveredToMezo[i] = true;
                mezoNtt.deliver(baseNtt, i);
            }
        }
        for (uint256 i; i < mezoNtt.sentCount(); ++i) {
            if (!deliveredToBase[i]) {
                deliveredToBase[i] = true;
                (uint256 amount,,) = mezoNtt.sent(i);
                arrivedBack += amount;
                baseNtt.deliver(mezoNtt, i);
            }
        }
    }

    // ------------------------------------------------------------------- views

    function inflightToMezo() public view returns (uint256 sum) {
        for (uint256 i; i < baseNtt.sentCount(); ++i) {
            if (!deliveredToMezo[i]) {
                (uint256 amount,,) = baseNtt.sent(i);
                sum += amount;
            }
        }
    }

    function inflightToBase() public view returns (uint256 sum) {
        for (uint256 i; i < mezoNtt.sentCount(); ++i) {
            if (!deliveredToBase[i]) {
                (uint256 amount,,) = mezoNtt.sent(i);
                sum += amount;
            }
        }
    }

    function actor(uint256 i) external view returns (address) {
        return actors[i];
    }

    function _flag(string memory what) internal {
        ++unexpected;
        lastUnexpected = what;
    }
}

abstract contract AuditInvariantBase is AuditBase {
    LevadaHandler handler;

    function setUp() public override {
        super.setUp();
        handler = new LevadaHandler(
            vault, hub, baseMusd, mezoMusd, baseNtt, mezoNtt, baseWh, mezoWh, savings, [alice, bob, carol]
        );
        targetContract(address(handler));
        bytes4[] memory actions = new bytes4[](17);
        actions[0] = LevadaHandler.deposit.selector;
        actions[1] = LevadaHandler.mint.selector;
        actions[2] = LevadaHandler.withdraw.selector;
        actions[3] = LevadaHandler.redeem.selector;
        actions[4] = LevadaHandler.requestWithdraw.selector;
        actions[5] = LevadaHandler.claim.selector;
        actions[6] = LevadaHandler.bridge.selector;
        actions[7] = LevadaHandler.deliverToMezo.selector;
        actions[8] = LevadaHandler.deliverToBase.selector;
        actions[9] = LevadaHandler.report.selector;
        actions[10] = LevadaHandler.relay.selector;
        actions[11] = LevadaHandler.process.selector;
        actions[12] = LevadaHandler.addYield.selector;
        actions[13] = LevadaHandler.warp.selector;
        actions[14] = LevadaHandler.donateBase.selector;
        actions[15] = LevadaHandler.donateHub.selector;
        actions[16] = LevadaHandler.requestWithdraw.selector; // exits twice as likely
        targetSelector(FuzzSelector({addr: address(handler), selectors: actions}));
    }
}

/// @notice Accounting and view-consistency invariants. These hold.
contract AuditInvariantSafety is AuditInvariantBase {
    /// Base-side conservation: principal = balance - owed + bridgedOut - arrivedBack - donations.
    function invariant_baseFlowIdentity() public view {
        int256 rhs = int256(baseMusd.balanceOf(address(vault))) - int256(vault.totalOwed()) + int256(vault.bridgedOut())
            - int256(handler.arrivedBack()) - int256(handler.donatedBase());
        assertEq(vault.principal(), rhs);
    }

    /// Never promises more than exists across Base, Mezo and both bridges.
    function invariant_solvent() public view {
        uint256 real = baseMusd.balanceOf(address(vault)) + handler.inflightToBase() + hub.totalAssets()
            + handler.inflightToMezo();
        assertGe(real + 1e6, vault.totalAssets() + vault.totalOwed());
    }

    /// Recognised hub profit never exceeds what the hub really earned. Idle MUSD not yet
    /// synced is in hub.totalAssets() but not yet in cumulativeIn, so it is taken out.
    function invariant_hubProfitNotOverstated() public view {
        uint256 unsynced = mezoMusd.balanceOf(address(hub)) - hub.accruedFees() - hub.knownIdle();
        int256 realProfit = int256(hub.totalAssets()) + int256(hub.cumulativeOut()) - int256(hub.cumulativeIn())
            - int256(unsynced);
        assertLe(vault.hubProfit(), realProfit + 1e6);
    }

    /// max* and preview* never lie to an integrator.
    function invariant_viewsHonest() public view {
        assertEq(handler.unexpected(), 0, handler.lastUnexpected());
    }
}

/// @notice Liveness: after delivering and processing everything, every user can exit whole.
///         Both FAIL. invariant_H2 shrinks to: deposit, bridge, request, deposit, request.
///         invariant_L8 shrinks to: donate to hub, yield, report, relay, deposit, ...
contract AuditInvariantLiveness is AuditInvariantBase {
    /// forge-config: default.invariant.runs = 2000
    /// forge-config: default.invariant.depth = 100
    function invariant_H2_everyQueuedExitCompletes() public {
        uint256 snap = vm.snapshotState();
        handler.drainAndExitAll();
        for (uint256 i; i < 3; ++i) {
            address a = handler.actor(i);
            assertEq(vault.owed(a), 0, "H-2: a queued exit can no longer complete");
            assertLt(vault.convertToAssets(vault.balanceOf(a)), 1e10, "shares left that cannot exit");
        }
        vm.revertToState(snap);
    }

    /// forge-config: default.invariant.runs = 2000
    /// forge-config: default.invariant.depth = 100
    function invariant_L8_nobodyLosesPrincipal() public {
        uint256 snap = vm.snapshotState();
        handler.drainAndExitAll();
        for (uint256 i; i < 3; ++i) {
            address a = handler.actor(i);
            if (vault.owed(a) != 0) continue; // stranded: that is H-2
            assertGe(baseMusd.balanceOf(a) + 1e12, handler.startBalance(a), "L-8: principal lost to share rounding");
        }
        vm.revertToState(snap);
    }
}

// ======================================================= live-contract checks

interface INttQuote {
    function quoteDeliveryPrice(uint16 recipientChain, bytes memory transceiverInstructions)
        external
        view
        returns (uint256[] memory, uint256);
}

/// @notice Runs Levada against the live NTT managers, Wormhole cores, MUSD and sMUSD.
///         AUDIT_FORK=true forge test --match-contract AuditForkTest -vv
contract AuditForkTest is Test {
    struct Net {
        string baseRpc;
        string mezoRpc;
        uint16 baseChain;
        address baseMusd;
        address baseNtt;
        address baseWh;
        address mezoMusd;
        address mezoNtt;
        address mezoWh;
        address smusd;
    }

    function _mainnet() internal pure returns (Net memory) {
        return Net(
            "base",
            "mezo",
            30,
            0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186,
            0x3EB418BdBE95b4b9cf465ecfBD8424685ACD1Bc1,
            0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6,
            0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186,
            0x7efb386675d75280D39Aae42964A6776DE0ee0bD,
            0xaBf89de706B583424328B54dD05a8fC986750Da8,
            0xb4D498029af77680cD1eF828b967f010d06C51CC
        );
    }

    function _testnet() internal pure returns (Net memory) {
        return Net(
            "base_sepolia",
            "mezo_testnet",
            10004,
            0x560985f804De8187E8FBA94F7127Bc4c0e54AEA5,
            0x6590DFF6abEd7C077839E8227A4f12Ec90E6D85F,
            0x79A1027a6A159502049F10906D333EC57E95F083,
            0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503,
            0x20888B20e2F5F405d44261dA96467a1b1acE15be,
            0x268557122Ffd64c85750d630b716471118F323c8,
            0x6f461c68B2c5492C0F5CCEc5a264d692aA7A8e16
        );
    }

    function _skipUnlessFork() internal {
        if (!vm.envOr("AUDIT_FORK", false)) vm.skip(true);
    }

    function testFork_mainnet_vaultOnLiveBase() public {
        _skipUnlessFork();
        _vaultOnLiveBase(_mainnet());
    }

    function testFork_mainnet_hubOnLiveMezo() public {
        _skipUnlessFork();
        _hubOnLiveMezo(_mainnet());
    }

    function testFork_testnet_vaultOnLiveBaseSepolia() public {
        _skipUnlessFork();
        _vaultOnLiveBase(_testnet());
    }

    function testFork_testnet_hubOnLiveMezoTestnet() public {
        _skipUnlessFork();
        _hubOnLiveMezo(_testnet());
    }

    /// bridgeToHub and requestWithdraw on the live Base NTT with nttInstructions 0x01010101
    /// and msg.value 0: instruction index 1 parses against the registered transceivers, the
    /// Wormhole fee is 0, consistency 200 is accepted, and overpaying reverts RefundFailed.
    function _vaultOnLiveBase(Net memory n) internal {
        vm.createSelectFork(n.baseRpc);
        vm.setEvmVersion("cancun");
        address alice = makeAddr("alice");
        LevadaVault v = new LevadaVault(
            IERC20(n.baseMusd),
            INttManager(n.baseNtt),
            IWormhole(n.baseWh),
            50,
            bytes32(uint256(uint160(makeAddr("hub")))),
            200,
            hex"01010101",
            1_000,
            1_000_000e18,
            address(this)
        );
        deal(n.baseMusd, alice, 1_000e18);
        vm.startPrank(alice);
        IERC20(n.baseMusd).approve(address(v), type(uint256).max);
        uint256 shares = v.deposit(1_000e18, alice);
        vm.stopPrank();

        vm.deal(address(this), 1 ether);
        vm.expectRevert(abi.encodeWithSignature("RefundFailed(uint256)", 1));
        v.bridgeToHub{value: 1}(); // NTT refunds msg.sender; the vault has no receive()

        // Keepers cannot quote the fee for these instructions: the quote parses them against the
        // enabled transceiver count (1), transfer() against the registered count (2).
        vm.expectRevert(abi.encodeWithSignature("InvalidInstructionIndex(uint256,uint256)", 1, 1));
        INttQuote(n.baseNtt).quoteDeliveryPrice(50, hex"01010101");

        uint256 supply = IERC20(n.baseMusd).totalSupply();
        (uint256 sent,) = v.bridgeToHub();
        assertEq(sent, 900e18);
        assertEq(supply - IERC20(n.baseMusd).totalSupply(), 900e18, "burned by the live NTT");
        assertEq(IERC20(n.baseMusd).balanceOf(address(v)), 100e18);

        vm.prank(alice);
        (, uint256 requested,) = v.requestWithdraw(shares);
        assertEq(requested, 900e18);
    }

    /// report() and processWithdrawal() against live sMUSD, NTT and Wormhole on Mezo; only
    /// parseAndVerifyVM is mocked, to stand in for guardian signatures.
    function _hubOnLiveMezo(Net memory n) internal {
        vm.createSelectFork(n.mezoRpc);
        address vaultAddr = makeAddr("vault");
        LevadaHub h = new LevadaHub(
            IERC20(n.mezoMusd),
            IMUSDSavingsRate(n.smusd),
            INttManager(n.mezoNtt),
            IWormhole(n.mezoWh),
            n.baseChain,
            bytes32(uint256(uint160(vaultAddr))),
            202,
            hex"01010101",
            makeAddr("treasury"),
            1_000,
            address(this)
        );
        deal(n.mezoMusd, address(h), 1_000e18); // stands in for an NTT unlock from the vault
        h.report();
        assertEq(IMUSDSavingsRate(n.smusd).balanceOf(address(h)), 1_000e18);
        assertEq(h.cumulativeIn(), 1_000e18);

        IWormhole.VM memory w;
        w.emitterChainId = n.baseChain;
        w.emitterAddress = bytes32(uint256(uint160(vaultAddr)));
        w.payload = LevadaMessages.encode(LevadaMessages.Withdraw({amount: 400e18, nonce: 1}));
        w.hash = keccak256("withdraw-1");
        vm.mockCall(n.mezoWh, abi.encodeWithSelector(IWormhole.parseAndVerifyVM.selector), abi.encode(w, true, ""));
        uint256 lockedBefore = IERC20(n.mezoMusd).balanceOf(n.mezoNtt);
        h.processWithdrawal("");
        assertEq(IERC20(n.mezoMusd).balanceOf(n.mezoNtt) - lockedBefore, 400e18, "locked in the live NTT");
        assertEq(h.cumulativeOut(), 400e18);
        assertEq(IMUSDSavingsRate(n.smusd).balanceOf(address(h)), 600e18);
        assertEq(IERC20(n.mezoMusd).balanceOf(address(h)), 0, "nothing idle");
    }
}
