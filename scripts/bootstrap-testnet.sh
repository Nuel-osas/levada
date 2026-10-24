#!/usr/bin/env bash
# Testnet bootstrap for demos: borrow test MUSD on Mezo testnet (a MUSD trove), bridge it to
# Base Sepolia over Wormhole NTT (relayed by hand, as Mezo's testnet bridge has no relayer),
# and stock the judges' faucet with MUSD and a little ETH for gas.
# Usage: ./scripts/bootstrap-testnet.sh            (reads .env.keeper and .env.faucet)
#   COLL=0.045ether DEBT=1800 FAUCET_MUSD=1500 KEEPER_MUSD=200 FAUCET_ETH=0.01ether
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.keeper; source .env.faucet; set +a

MEZO=$(jq -r .testnet.mezo.rpc deployments/networks.json)
BASE=$(jq -r .testnet.base.rpc deployments/networks.json)
SCAN=$(jq -r .testnet.wormholescan deployments/networks.json)
MUSD=$(jq -r .testnet.mezo.musd deployments/networks.json)
NTT=$(jq -r .testnet.mezo.ntt deployments/networks.json)
BASE_TRANSCEIVER=$(jq -r .testnet.base.transceiver deployments/networks.json)
BASE_MUSD=$(jq -r .testnet.base.musd deployments/networks.json)
BO=$(jq -r .testnet.mezo.borrowerOperations deployments/networks.json)
TM=0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0
HH=0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6
ST=0x722E4D24FD6Ff8b0AC679450F3D91294607268fA
K="--private-key $KEEPER_PRIVATE_KEY"

COLL=${COLL:-0.045ether}
DEBT=$(cast to-wei "${DEBT:-1800}")
FAUCET_MUSD=$(cast to-wei "${FAUCET_MUSD:-1500}")
KEEPER_MUSD=$(cast to-wei "${KEEPER_MUSD:-200}")
FAUCET_ETH=${FAUCET_ETH:-0.01ether}
pad() { printf '0x000000000000000000000000%s' "$(echo "${1#0x}" | tr A-F a-f)"; }

echo "keeper $KEEPER_ADDRESS: $(cast balance $KEEPER_ADDRESS --rpc-url $MEZO --ether) BTC on Mezo testnet, $(cast balance $KEEPER_ADDRESS --rpc-url $BASE --ether) ETH on Base Sepolia"

# 1. A MUSD trove for the keeper (one per address), with Liquity-style insert hints.
STATUS=$(cast call $TM "getTroveStatus(address)(uint8)" $KEEPER_ADDRESS --rpc-url $MEZO)
if [ "$STATUS" != "1" ]; then
  COLL_WEI=$(cast to-wei "${COLL%ether}")
  FEE=$(cast call $BO "getBorrowingFee(uint256)(uint256)" $DEBT --rpc-url $MEZO | awk '{print $1}')
  TOTAL=$(python3 -c "print($DEBT+$FEE+200*10**18)")
  NICR=$(python3 -c "print($COLL_WEI*10**20//$TOTAL)")
  SIZE=$(cast call $ST "getSize()(uint256)" --rpc-url $MEZO | awk '{print $1}')
  TRIALS=$(python3 -c "import math;print(math.ceil(math.sqrt($SIZE))*15)")
  APPROX=$(cast call $HH "getApproxHint(uint256,uint256,uint256)(address,uint256,uint256)" $NICR $TRIALS 42 --rpc-url $MEZO | head -1)
  read UPPER LOWER <<<"$(cast call $ST "findInsertPosition(uint256,address,address)(address,address)" $NICR $APPROX $APPROX --rpc-url $MEZO | tr '\n' ' ')"
  echo "opening trove: $COLL collateral, $(cast from-wei $DEBT) MUSD"
  cast send $BO "openTrove(uint256,address,address)" $DEBT $UPPER $LOWER --value $COLL --rpc-url $MEZO $K >/dev/null
fi
echo "keeper holds $(cast from-wei $(cast call $MUSD 'balanceOf(address)(uint256)' $KEEPER_ADDRESS --rpc-url $MEZO | awk '{print $1}')) MUSD on Mezo testnet"

# 2. Bridge MUSD to Base Sepolia (faucet stock and the keeper's own demo deposit).
bridge() { # amount recipient
  cast send $MUSD "approve(address,uint256)" $NTT $1 --rpc-url $MEZO $K >/dev/null
  local tx
  tx=$(cast send $NTT "transfer(uint256,uint16,bytes32,bytes32,bool,bytes)" $1 10004 "$(pad $2)" "$(pad $KEEPER_ADDRESS)" false 0x01010101 \
    --rpc-url $MEZO $K --json | jq -r .transactionHash)
  echo "  bridged $(cast from-wei $1) MUSD to $2: $tx"
  local vaa=""
  for _ in $(seq 1 60); do
    vaa=$(curl -s "$SCAN/api/v1/operations?txHash=$tx" | python3 -c "
import json,sys,base64
ops=json.load(sys.stdin).get('operations',[])
raw=(ops[0].get('vaa') or {}).get('raw') if ops else None
print('0x'+base64.b64decode(raw).hex() if raw else '')")
    [ -n "$vaa" ] && break; sleep 5
  done
  [ -n "$vaa" ] || { echo "  VAA not signed yet; rerun later to relay"; return 1; }
  cast send $BASE_TRANSCEIVER "receiveMessage(bytes)" $vaa --rpc-url $BASE $K >/dev/null
  echo "  delivered on Base Sepolia"
}
bridge $FAUCET_MUSD $FAUCET_ADDRESS
bridge $KEEPER_MUSD $KEEPER_ADDRESS

# 3. Gas for the faucet's own transfers.
cast send $FAUCET_ADDRESS --value $FAUCET_ETH --rpc-url $BASE $K >/dev/null
echo "faucet $FAUCET_ADDRESS: $(cast from-wei $(cast call $BASE_MUSD 'balanceOf(address)(uint256)' $FAUCET_ADDRESS --rpc-url $BASE | awk '{print $1}')) MUSD, $(cast balance $FAUCET_ADDRESS --rpc-url $BASE --ether) ETH on Base Sepolia"
