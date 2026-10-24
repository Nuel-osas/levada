// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Mezo's MUSD Savings Rate vault (sMUSD).
/// @dev Not ERC-4626: deposits and withdrawals are 1:1, and yield accrues to a
///      per-holder index that is paid out in MUSD by claimYield().
interface IMUSDSavingsRate {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimYield() external returns (uint256);
    function receiveYieldFromStrategy() external;
    function balanceOf(address account) external view returns (uint256);
    function claimableYield(address account) external view returns (uint256);
    function supplyYieldIndex(address account) external view returns (uint256);
    function yieldIndex() external view returns (uint256);
    function musdToken() external view returns (address);
}
