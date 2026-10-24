import { parseAbi } from "viem";

/** LevadaVault on Base: ERC-4626 vault for MUSD, share token lsMUSD ("Levada Savings MUSD", 18 decimals). */
export const vaultAbi = parseAbi([
  // ERC-20 and ERC-4626
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function asset() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function maxDeposit(address receiver) view returns (uint256)",
  "function maxMint(address receiver) view returns (uint256)",
  /** Instant exits only: limited to the free buffer on Base. */
  "function maxWithdraw(address owner) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewMint(uint256 shares) view returns (uint256)",
  "function previewWithdraw(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function mint(uint256 shares, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",

  // Where the MUSD is
  "function freeIdle() view returns (uint256)",
  "function pendingFromHub() view returns (uint256)",
  "function arrivedFromHub() view returns (uint256)",
  "function bridgeable() view returns (uint256)",
  "function bridgedOut() view returns (uint256)",
  "function bridgedBack() view returns (uint256)",
  "function totalOwed() view returns (uint256)",
  "function requestedFromHub() view returns (uint256)",

  // Share price: principal is booked on Base, the hub reports yield, each gain unlocks over 12 h
  "function principal() view returns (int256)",
  "function hubProfit() view returns (int256)",
  "function reportedProfit() view returns (int256)",
  "function lockedProfitNow() view returns (uint256)",
  "function PROFIT_UNLOCK() view returns (uint256)",
  "function lastReport() view returns (uint256 assets, uint256 cumulativeIn, uint256 cumulativeOut, uint64 timestamp)",
  "function hasReport() view returns (bool)",

  // Guarded launch (owner settings; none of them can move funds)
  "function bufferBps() view returns (uint256)",
  "function depositCap() view returns (uint256)",
  "function depositsPaused() view returns (bool)",

  // Exit queue: first in, first out
  "function exitCount() view returns (uint256)",
  "function exits(uint256) view returns (address owner, uint256 assets, uint256 queuePos, bool paid)",
  "function exitsOf(address owner) view returns (uint256[])",
  "function isClaimable(uint256 exitId) view returns (bool)",
  "function owed(address owner) view returns (uint256 total)",
  "function requestWithdraw(uint256 shares) payable returns (uint256 assets, uint256 requested, uint64 sequence)",
  "function claimExit(uint256 exitId) returns (uint256 assets)",
  "function claim(address owner) returns (uint256 total)",

  "event WithdrawRequested(address indexed owner, uint256 indexed exitId, uint256 shares, uint256 assets, uint256 requestedFromHub, uint64 sequence)",
  "event WithdrawClaimed(address indexed owner, uint256 indexed exitId, uint256 assets)",

  "error NotArrived(uint256 queuePos, uint256 arrived)",
  "error NothingOwed()",
  "error ZeroShares()",
  "error ZeroAssets()",
  "error WrongFee(uint256 sent, uint256 required)",
  "error RefundFailed()",
  "error ERC4626ExceededMaxDeposit(address receiver, uint256 assets, uint256 max)",
  "error ERC4626ExceededMaxWithdraw(address owner, uint256 assets, uint256 max)",
  "error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
]);

/** LevadaHub on Mezo, read with a public client. */
export const hubAbi = parseAbi([
  "function totalAssets() view returns (uint256)",
  "function cumulativeIn() view returns (uint256)",
  "function cumulativeOut() view returns (uint256)",
  "function knownIdle() view returns (uint256)",
  "function accruedFees() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function sendable() view returns (uint256)",
  "function savingsPrincipal() view returns (uint256)",
  /** MUSD sent back so far against one withdrawal message, keyed by its VAA hash. */
  "function sent(bytes32 vaaHash) view returns (uint256)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
