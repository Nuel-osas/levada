// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWormhole} from "../../src/interfaces/IWormhole.sol";

contract MockMUSD is ERC20 {
    constructor() ERC20("Mezo USD", "MUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

/// @notice Stands in for the guardian network: remembers which messages were published.
contract MockGuardians {
    mapping(bytes32 => bool) public signed;

    function sign(bytes32 hash) external {
        signed[hash] = true;
    }
}

/// @notice One Wormhole core per chain. publishMessage "signs" the message; the encoded VM
///         is abi.encode(VM) and is valid on any chain sharing the same guardians.
contract MockWormhole is IWormhole {
    MockGuardians public immutable guardians;
    uint16 public immutable override chainId;
    uint256 public override messageFee;
    mapping(address => uint64) public nextSequence;
    bytes public lastVm;

    constructor(MockGuardians guardians_, uint16 chainId_) {
        guardians = guardians_;
        chainId = chainId_;
    }

    function setMessageFee(uint256 fee) external {
        messageFee = fee;
    }

    function publishMessage(uint32 nonce, bytes memory payload, uint8 consistencyLevel)
        external
        payable
        returns (uint64 sequence)
    {
        require(msg.value == messageFee, "invalid fee");
        sequence = nextSequence[msg.sender]++;
        VM memory vm;
        vm.version = 1;
        vm.timestamp = uint32(block.timestamp);
        vm.nonce = nonce;
        vm.emitterChainId = chainId;
        vm.emitterAddress = bytes32(uint256(uint160(msg.sender)));
        vm.sequence = sequence;
        vm.consistencyLevel = consistencyLevel;
        vm.payload = payload;
        vm.hash = keccak256(abi.encode(chainId, msg.sender, sequence, payload));
        lastVm = abi.encode(vm);
        guardians.sign(vm.hash);
    }

    function parseAndVerifyVM(bytes calldata encodedVM)
        external
        view
        returns (VM memory vm, bool valid, string memory reason)
    {
        vm = abi.decode(encodedVM, (VM));
        valid = guardians.signed(vm.hash);
        if (!valid) reason = "unsigned";
    }
}

/// @notice One NTT manager per chain. Pulls tokens on transfer; the test relays the
///         transfer by calling deliver() on the destination manager.
contract MockNtt {
    struct Transfer {
        uint256 amount;
        uint16 chain;
        bytes32 recipient;
    }

    MockMUSD public immutable musd;
    bool public immutable burning;
    uint16 public immutable chainId;
    Transfer[] public sent;
    bytes public lastInstructions;

    constructor(MockMUSD musd_, bool burning_, uint16 chainId_) {
        musd = musd_;
        burning = burning_;
        chainId = chainId_;
    }

    function token() external view returns (address) {
        return address(musd);
    }

    function getCurrentOutboundCapacity() external pure returns (uint256) {
        return type(uint256).max;
    }

    function transfer(uint256 amount, uint16 recipientChain, bytes32 recipient, bytes32, bool, bytes memory ins)
        external
        payable
        returns (uint64 msgId)
    {
        require(amount % 1e10 == 0, "dust");
        require(amount > 0, "zero");
        IERC20(address(musd)).transferFrom(msg.sender, address(this), amount);
        if (burning) musd.burn(address(this), amount);
        lastInstructions = ins;
        sent.push(Transfer(amount, recipientChain, recipient));
        msgId = uint64(sent.length - 1);
    }

    function sentCount() external view returns (uint256) {
        return sent.length;
    }

    /// @dev Called on the destination manager with the source manager's transfer.
    function deliver(MockNtt source, uint256 id) external {
        (uint256 amount, uint16 chain, bytes32 recipient) = source.sent(id);
        require(chain == chainId, "wrong chain");
        address to = address(uint160(uint256(recipient)));
        if (burning) musd.mint(to, amount);
        else IERC20(address(musd)).transfer(to, amount);
    }
}

/// @notice Mirrors Mezo's MUSDSavingsRate: 1:1 deposits, yield paid by index in MUSD.
contract MockSavingsRate is ERC20 {
    MockMUSD public immutable musd;
    uint256 public yieldIndex;
    mapping(address => uint256) public supplyYieldIndex;
    mapping(address => uint256) public claimableYield;

    constructor(MockMUSD musd_) ERC20("MUSD Savings Rate", "sMUSD") {
        musd = musd_;
    }

    function musdToken() external view returns (address) {
        return address(musd);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "zero");
        IERC20(address(musd)).transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "InsufficientBalance");
        _claim(msg.sender);
        _burn(msg.sender, amount);
        IERC20(address(musd)).transfer(msg.sender, amount);
    }

    function claimYield() external returns (uint256) {
        return _claim(msg.sender);
    }

    function receiveYieldFromStrategy() external {}

    /// @dev Test helper: protocol fees arrive and are spread over all sMUSD.
    function addYield(uint256 amount) external {
        musd.mint(address(this), amount);
        yieldIndex += (amount * 1e18) / totalSupply();
    }

    function _claim(address who) internal returns (uint256 amount) {
        _updateFor(who);
        amount = claimableYield[who];
        claimableYield[who] = 0;
        if (amount > 0) IERC20(address(musd)).transfer(who, amount);
    }

    function _updateFor(address who) internal {
        uint256 bal = balanceOf(who);
        uint256 delta = yieldIndex - supplyYieldIndex[who];
        supplyYieldIndex[who] = yieldIndex;
        if (bal > 0 && delta > 0) claimableYield[who] += (bal * delta) / 1e18;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) _updateFor(from);
        if (to != address(0)) _updateFor(to);
        super._update(from, to, value);
    }
}
