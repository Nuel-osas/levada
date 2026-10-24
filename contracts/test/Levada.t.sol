// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LevadaHub} from "../src/LevadaHub.sol";
import {LevadaVault} from "../src/LevadaVault.sol";
import {IMUSDSavingsRate} from "../src/interfaces/IMUSDSavingsRate.sol";
import {INttManager} from "../src/interfaces/INttManager.sol";
import {IWormhole} from "../src/interfaces/IWormhole.sol";
import {MockMUSD, MockGuardians, MockWormhole, MockNtt, MockSavingsRate} from "./mocks/Mocks.sol";

/// @dev Mezo and Base live in one EVM here; the test plays the relayer between them.
contract LevadaTest is Test {
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
    MockSavingsRate savings;
    LevadaHub hub;
    LevadaVault vault;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vm.warp(1_760_000_000);
        guardians = new MockGuardians();
        mezoWh = new MockWormhole(guardians, MEZO);
        baseWh = new MockWormhole(guardians, BASE);
        mezoMusd = new MockMUSD();
        baseMusd = new MockMUSD();
        mezoNtt = new MockNtt(mezoMusd, false, MEZO);
        baseNtt = new MockNtt(baseMusd, true, BASE);
        mezoMusd.mint(address(mezoNtt), 1e30); // MUSD already locked on Mezo for Base supply
        savings = new MockSavingsRate(mezoMusd);

        address predictedHub = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        vault = new LevadaVault(
            IERC20(address(baseMusd)),
            INttManager(address(baseNtt)),
            mezoOrBase(BASE),
            MEZO,
            _b32(predictedHub),
            202,
            INSTRUCTIONS,
            1_000, // 10% buffer
            1_000_000e18,
            owner
        );
        hub = new LevadaHub(
            IERC20(address(mezoMusd)),
            IMUSDSavingsRate(address(savings)),
            INttManager(address(mezoNtt)),
            mezoOrBase(MEZO),
            BASE,
            _b32(address(vault)),
            202,
            INSTRUCTIONS,
            treasury,
            1_000, // 10% performance fee
            owner
        );
        assertEq(address(hub), predictedHub);

        baseMusd.mint(alice, 10_000e18);
        baseMusd.mint(bob, 10_000e18);
        vm.prank(alice);
        baseMusd.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        baseMusd.approve(address(vault), type(uint256).max);
    }

    // ------------------------------------------------------------- happy path

    function test_depositEarnsMezoSavingsRateAndExits() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        assertEq(vault.totalAssets(), 1_000e18);

        (uint256 sent,) = vault.bridgeToHub();
        assertEq(sent, 900e18, "keeps a 10% buffer");
        _deliverToMezo();
        _report();
        assertEq(savings.balanceOf(address(hub)), 900e18);
        assertEq(vault.totalAssets(), 1_000e18, "no value lost crossing chains");

        vm.warp(block.timestamp + 30 days);
        savings.addYield(9e18); // hub is the only sMUSD holder
        _report();
        assertEq(vault.totalAssets(), 1_000e18, "a new report's yield is locked at first");
        vm.warp(block.timestamp + vault.PROFIT_UNLOCK());
        assertEq(vault.totalAssets(), 1_000e18 + 8.1e18, "yield net of 10% fee, released over 12h");
        assertEq(hub.accruedFees(), 0.9e18);
        hub.claimFees();
        assertEq(mezoMusd.balanceOf(treasury), 0.9e18);

        // Exit everything: 100 is on Base, the rest comes back from Mezo.
        vm.prank(alice);
        (uint256 assets, uint256 requested,) = vault.requestWithdraw(shares);
        assertApproxEqAbs(assets, 1_008.1e18, 1e10);
        assertEq(requested, assets - 100e18);
        _processOnMezo();
        _deliverToBase();
        vault.claim(alice);
        assertEq(baseMusd.balanceOf(alice), 10_000e18 - 1_000e18 + assets);
        assertEq(vault.totalSupply(), 0);
    }

    function test_instantWithdrawWithinBuffer() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        assertEq(vault.maxWithdraw(alice), 100e18);
        vm.prank(alice);
        vault.withdraw(60e18, alice, alice);
        assertEq(baseMusd.balanceOf(alice), 10_000e18 - 1_000e18 + 60e18);
        assertEq(vault.totalAssets(), 940e18);
    }

    function test_queuedWithdrawOnlyAsksHubForShortfall() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        vm.prank(alice);
        (uint256 assets, uint256 requested,) = vault.requestWithdraw(shares / 2);
        assertEq(assets, 500e18);
        assertEq(requested, 400e18, "100 reserved from the buffer");
        assertEq(vault.freeIdle(), 0);
        assertEq(vault.maxWithdraw(alice), 0, "buffer reserved for the queue");
    }

    // --------------------------------------------------------------- accounting

    /// The bug class this design avoids: MUSD landing on Base before the hub's next
    /// report must not be counted both on Base and in the stale hub figure.
    function test_returnLandingBeforeReportIsNotDoubleCounted() public {
        vm.prank(alice);
        uint256 aliceShares = vault.deposit(1_000e18, alice);
        vm.prank(bob);
        vault.deposit(1_000e18, bob);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        vm.prank(alice);
        vault.requestWithdraw(aliceShares);
        uint256 before = vault.totalAssets();
        _processOnMezo();
        _deliverToBase(); // lands before any new report
        assertEq(vault.totalAssets(), before);
        assertApproxEqAbs(vault.convertToAssets(vault.balanceOf(bob)), 1_000e18, 1e10, "bob's claim unchanged");
        _report();
        assertEq(vault.totalAssets(), before);
    }

    function test_donationsDoNotMoveSharePrice() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();
        uint256 price = vault.convertToAssets(1e18);

        baseMusd.mint(address(vault), 500e18);
        mezoMusd.mint(address(hub), 500e18);
        _report();
        assertEq(vault.convertToAssets(1e18), price);
    }

    function test_hubRetriesUntilFundsArrive() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        vault.bridgeToHub(); // not delivered yet
        vm.prank(alice);
        vault.requestWithdraw(shares);
        bytes memory request = baseWh.lastVm();

        vm.expectRevert(LevadaHub.NothingToSend.selector);
        hub.processWithdrawal(request);

        _deliverToMezo();
        hub.processWithdrawal(request);
        _deliverToBase();
        vault.claim(alice);
        assertEq(baseMusd.balanceOf(alice), 10_000e18);
    }

    // ----------------------------------------------------------------- security

    function test_reportGrowthIsBounded() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        vm.warp(block.timestamp + 1 days);
        savings.addYield(500e18); // 55% in a day
        _report();
        uint256 booked = 1_000e18;
        uint256 maxYield = (booked * 5_000 * 1 days) / (10_000 * 365 days) + 1e15;
        assertLe(vault.totalAssets(), 1_000e18 + maxYield);
    }

    function test_clampedYieldCatchesUpOverTime() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        vault.bridgeToHub();
        _deliverToMezo();
        _report();

        // A week of 4.24% APR lands in one lump an hour after the last report.
        vm.warp(block.timestamp + 1 hours);
        savings.addYield(0.9e18);
        _report();
        assertLt(vault.totalAssets(), 1_000.81e18, "throttled at first");

        for (uint256 i; i < 40; ++i) {
            vm.warp(block.timestamp + 1 hours);
            _report();
        }
        assertEq(vault.totalAssets(), 1_000.81e18, "fully recognised within two days");
    }

    function test_rejectsReplaysAndForeignEmitters() public {
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        hub.report();
        bytes memory reportVm = mezoWh.lastVm();
        vault.receiveReport(reportVm);
        vm.expectRevert(LevadaVault.StaleReport.selector);
        vault.receiveReport(reportVm);

        // A message from some other contract on Mezo
        vm.prank(makeAddr("impostor"));
        mezoWh.publishMessage(0, abi.encode(uint8(1), 1e30, 0, 0, uint64(block.timestamp)), 202);
        bytes memory forged = mezoWh.lastVm();
        vm.expectRevert();
        vault.receiveReport(forged);
        vm.expectRevert();
        hub.processWithdrawal(forged);

        // A withdrawal request cannot be honoured twice
        vault.bridgeToHub();
        _deliverToMezo();
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.requestWithdraw(shares);
        bytes memory request = baseWh.lastVm();
        hub.processWithdrawal(request);
        vm.expectRevert();
        hub.processWithdrawal(request);
    }

    function test_ownerCannotTouchFunds() public {
        vm.startPrank(owner);
        vm.expectRevert();
        hub.setFee(2_001);
        vm.expectRevert();
        vault.setBuffer(5_001);
        vault.setDepositsPaused(true);
        vm.stopPrank();

        assertEq(vault.maxDeposit(alice), 0);
        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(1e18, alice);
    }

    function test_depositCap() public {
        vm.prank(owner);
        vault.setDepositCap(1_500e18);
        vm.prank(alice);
        vault.deposit(1_000e18, alice);
        assertEq(vault.maxDeposit(bob), 500e18);
        vm.prank(bob);
        vm.expectRevert();
        vault.deposit(501e18, bob);
    }

    // --------------------------------------------------------------------- fuzz

    /// Two depositors, yield, partial exits through both paths: everyone ends whole.
    function testFuzz_everyoneExitsWhole(uint96 a, uint96 b, uint64 yieldAmt, uint16 exitBps) public {
        uint256 aliceIn = bound(a, 1e18, 5_000e18);
        uint256 bobIn = bound(b, 1e18, 5_000e18);
        uint256 y = yieldAmt; // bounded below once deposits are known
        uint256 portion = bound(exitBps, 1, 10_000);

        vm.prank(alice);
        uint256 aShares = vault.deposit(aliceIn, alice);
        _tryBridge();
        vm.prank(bob);
        uint256 bShares = vault.deposit(bobIn, bob);
        _tryBridge();
        _report();

        // Realistic yield: under the vault's 50% APR report cap over the week.
        y = bound(y, 0, ((aliceIn + bobIn) * 9) / 1_000);
        vm.warp(block.timestamp + 7 days);
        if (y > 0 && savings.totalSupply() > 0) savings.addYield(y);
        else y = 0;
        _report();
        vm.warp(block.timestamp + vault.PROFIT_UNLOCK()); // let the report's yield release

        // Alice leaves partly through the buffer, then queues the rest.
        uint256 instant = vault.maxRedeem(alice) * portion / 10_000;
        if (instant > 0) {
            vm.prank(alice);
            vault.redeem(instant, alice, alice);
        }
        _exitQueued(alice, aShares - instant);
        _exitQueued(bob, bShares);

        uint256 netYield = y - (y * 1_000) / 10_000;
        assertApproxEqAbs(
            baseMusd.balanceOf(alice) + baseMusd.balanceOf(bob), 20_000e18 + netYield, 1e11, "nothing lost or created"
        );
        assertGe(baseMusd.balanceOf(alice) + 1e11, 10_000e18, "alice whole");
        assertGe(baseMusd.balanceOf(bob) + 1e11, 10_000e18, "bob whole");
    }

    // ---------------------------------------------------------------- helpers

    function _exitQueued(address who, uint256 shares) internal {
        if (shares == 0) return;
        vm.prank(who);
        (uint256 assets, uint256 requested,) = vault.requestWithdraw(shares);
        if (requested > 0) {
            _processOnMezo();
            _deliverToBase();
        }
        if (assets > 0) vault.claim(who);
    }

    function _tryBridge() internal {
        if (vault.bridgeable() > 0) {
            vault.bridgeToHub();
            _deliverToMezo();
        }
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

    function _processOnMezo() internal {
        hub.processWithdrawal(baseWh.lastVm());
    }

    function mezoOrBase(uint16 chain) internal view returns (IWormhole) {
        return chain == MEZO ? IWormhole(address(mezoWh)) : IWormhole(address(baseWh));
    }

    function _b32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }
}
