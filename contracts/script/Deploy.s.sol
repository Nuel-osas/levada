// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LevadaHub} from "../src/LevadaHub.sol";
import {LevadaVault} from "../src/LevadaVault.sol";
import {IMUSDSavingsRate} from "../src/interfaces/IMUSDSavingsRate.sol";
import {INttManager} from "../src/interfaces/INttManager.sol";
import {IWormhole} from "../src/interfaces/IWormhole.sol";

/// @dev Reads addresses from ../deployments/networks.json. NETWORK is "testnet" or "mainnet".
abstract contract NetworkScript is Script {
    /// @dev Base finality is ~20 minutes; a reorged withdrawal request only makes the hub send
    ///      MUSD the vault does not count, so the vault publishes at instant finality.
    uint8 internal constant VAULT_CONSISTENCY = 200;
    /// @dev Mezo has single-slot finality.
    uint8 internal constant HUB_CONSISTENCY = 202;

    string internal json;
    string internal net;

    function _load() internal {
        net = string.concat(".", vm.envString("NETWORK"));
        json = vm.readFile("../deployments/networks.json");
    }

    function _addr(string memory key) internal view returns (address) {
        return vm.parseJsonAddress(json, string.concat(net, key));
    }

    function _uint(string memory key) internal view returns (uint256) {
        return vm.parseJsonUint(json, string.concat(net, key));
    }

    function _instructions() internal view returns (bytes memory) {
        return vm.parseJsonBytes(json, string.concat(net, ".nttInstructions"));
    }
}

/// @dev The deployer owns the vault until the hub is verified at its predicted address;
///      deposits stay paused until then (see FinishVault).
contract DeployVault is NetworkScript {
    function run() external returns (LevadaVault vault) {
        _load();
        address hub = vm.envAddress("HUB_ADDRESS");
        vm.startBroadcast();
        vault = new LevadaVault(
            IERC20(_addr(".base.musd")),
            INttManager(_addr(".base.ntt")),
            IWormhole(_addr(".base.wormhole")),
            uint16(_uint(".mezo.wormholeChain")),
            bytes32(uint256(uint160(hub))),
            VAULT_CONSISTENCY,
            _instructions(),
            vm.envOr("BUFFER_BPS", uint256(1_000)),
            vm.envOr("DEPOSIT_CAP", uint256(10_000e18)),
            msg.sender
        );
        vault.setDepositsPaused(true);
        vm.stopBroadcast();
        console.log("LevadaVault", address(vault));
    }
}

/// @dev Run on Base once the hub is live: opens deposits and hands the vault to OWNER
///      (who must call acceptOwnership).
contract FinishVault is NetworkScript {
    function run() external {
        LevadaVault vault = LevadaVault(vm.envAddress("VAULT_ADDRESS"));
        vm.startBroadcast();
        vault.setDepositsPaused(false);
        address owner = vm.envAddress("OWNER");
        if (owner != msg.sender) vault.transferOwnership(owner);
        vm.stopBroadcast();
    }
}

contract DeployHub is NetworkScript {
    function run() external returns (LevadaHub hub) {
        _load();
        address vault = vm.envAddress("VAULT_ADDRESS");
        vm.startBroadcast();
        hub = new LevadaHub(
            IERC20(_addr(".mezo.musd")),
            IMUSDSavingsRate(_addr(".mezo.savings")),
            INttManager(_addr(".mezo.ntt")),
            IWormhole(_addr(".mezo.wormhole")),
            uint16(_uint(".base.wormholeChain")),
            bytes32(uint256(uint160(vault))),
            HUB_CONSISTENCY,
            _instructions(),
            vm.envAddress("TREASURY"),
            vm.envOr("FEE_BPS", uint256(1_000)),
            vm.envAddress("OWNER")
        );
        vm.stopBroadcast();
        console.log("LevadaHub", address(hub));
    }
}
