// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Subset of the Wormhole NTT manager that bridges MUSD between Mezo and Base.
/// @dev Mezo runs the manager in locking mode, Base in burning mode. Both pull tokens
///      from the caller with transferFrom, so the caller approves the manager first.
interface INttManager {
    function transfer(
        uint256 amount,
        uint16 recipientChain,
        bytes32 recipient,
        bytes32 refundAddress,
        bool shouldQueue,
        bytes memory encodedInstructions
    ) external payable returns (uint64 msgId);

    function token() external view returns (address);

    /// @notice MUSD that can be sent now without hitting the outbound rate limit.
    function getCurrentOutboundCapacity() external view returns (uint256);
}
