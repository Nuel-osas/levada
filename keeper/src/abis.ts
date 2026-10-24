import { parseAbi } from "viem";

export const vaultAbi = parseAbi([
  "function bridgeable() view returns (uint256)",
  "function bridgeToHub() payable returns (uint256 amount, uint64 nttMsgId)",
  "function receiveReport(bytes encodedVm)",
  "function claim(address owner) returns (uint256)",
  "function claimExit(uint256 exitId) returns (uint256)",
  "function exitCount() view returns (uint256)",
  "function exits(uint256) view returns (address owner, uint256 assets, uint256 queuePos, bool paid)",
  "function isClaimable(uint256 exitId) view returns (bool)",
  "function owed(address owner) view returns (uint256)",
  "function lastReportSequence() view returns (uint64)",
  "function hasReport() view returns (bool)",
  "function lastReport() view returns (uint256 assets, uint256 cumulativeIn, uint256 cumulativeOut, uint64 timestamp)",
  "event WithdrawRequested(address indexed owner, uint256 indexed exitId, uint256 shares, uint256 assets, uint256 requestedFromHub, uint64 sequence)",
  "error StaleReport()",
  "error NothingToBridge()",
  "error NothingOwed()",
  "error NotArrived(uint256 queuePos, uint256 arrived)",
  "error InvalidVaa(string reason)",
  "error UnknownEmitter(uint16 chain, bytes32 emitter)",
]);

export const hubAbi = parseAbi([
  "function report() payable returns (uint64 sequence)",
  "function processWithdrawal(bytes encodedVm) payable returns (uint64 nttMsgId)",
  "function totalAssets() view returns (uint256)",
  "function cumulativeOut() view returns (uint256)",
  "function knownIdle() view returns (uint256)",
  "function accruedFees() view returns (uint256)",
  "event Reported(uint64 sequence, uint256 assets, uint256 cumulativeIn, uint256 cumulativeOut)",
  "error AlreadyProcessed(bytes32 vaaHash)",
  "error NothingToSend()",
  "error InsufficientBalance()",
  "error InvalidVaa(string reason)",
  "error UnknownEmitter(uint16 chain, bytes32 emitter)",
  "error BadAmount(uint256 amount)",
]);

export const transceiverAbi = parseAbi([
  "function receiveMessage(bytes encodedMessage)",
  "error TransferAlreadyCompleted(bytes32 vaaHash)",
  "error TransceiverAlreadyAttestedToMessage(bytes32 nttManagerMessageHash)",
]);

export const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
