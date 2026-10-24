// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Wire format for the two messages Levada sends over Wormhole.
library LevadaMessages {
    uint8 internal constant REPORT = 1;
    uint8 internal constant WITHDRAW = 2;

    error WrongMessageType(uint8 expected, uint8 actual);
    error BadPayloadLength(uint256 length);

    /// @notice Hub -> vault. A snapshot of everything the hub holds for the vault.
    /// @param assets MUSD value of the hub position, net of the performance fee.
    /// @param cumulativeIn All MUSD the hub has ever received from the vault.
    /// @param cumulativeOut All MUSD the hub has ever sent back to the vault.
    struct Report {
        uint256 assets;
        uint256 cumulativeIn;
        uint256 cumulativeOut;
        uint64 timestamp;
    }

    /// @notice Vault -> hub. Send `amount` MUSD back to the vault.
    struct Withdraw {
        uint256 amount;
        uint64 nonce;
    }

    uint256 private constant REPORT_LENGTH = 5 * 32;
    uint256 private constant WITHDRAW_LENGTH = 3 * 32;

    function encode(Report memory r) internal pure returns (bytes memory) {
        return abi.encode(REPORT, r.assets, r.cumulativeIn, r.cumulativeOut, r.timestamp);
    }

    function encode(Withdraw memory w) internal pure returns (bytes memory) {
        return abi.encode(WITHDRAW, w.amount, w.nonce);
    }

    function decodeReport(bytes memory payload) internal pure returns (Report memory r) {
        if (payload.length != REPORT_LENGTH) revert BadPayloadLength(payload.length);
        uint8 kind;
        (kind, r.assets, r.cumulativeIn, r.cumulativeOut, r.timestamp) =
            abi.decode(payload, (uint8, uint256, uint256, uint256, uint64));
        if (kind != REPORT) revert WrongMessageType(REPORT, kind);
    }

    function decodeWithdraw(bytes memory payload) internal pure returns (Withdraw memory w) {
        if (payload.length != WITHDRAW_LENGTH) revert BadPayloadLength(payload.length);
        uint8 kind;
        (kind, w.amount, w.nonce) = abi.decode(payload, (uint8, uint256, uint64));
        if (kind != WITHDRAW) revert WrongMessageType(WITHDRAW, kind);
    }
}
