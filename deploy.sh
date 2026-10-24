#!/usr/bin/env bash
# Deploys LevadaVault on Base and LevadaHub on Mezo, each knowing the other's address.
# The hub address is predicted from the deployer's next Mezo nonce, so do not send other
# Mezo transactions from the deployer between the two steps.
# Usage: NETWORK=testnet OWNER=0x... TREASURY=0x... ./deploy.sh
# OWNER and TREASURY should be the team's wallet, not the keeper's hot key.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env.keeper; set +a
NETWORK=${NETWORK:-testnet}
CFG=deployments/networks.json
MEZO_RPC=$(jq -r ".$NETWORK.mezo.rpc" $CFG)
BASE_RPC=$(jq -r ".$NETWORK.base.rpc" $CFG)
: "${OWNER:?set OWNER to the team wallet}" "${TREASURY:?set TREASURY to the team wallet}"
export NETWORK OWNER TREASURY

NONCE=$(cast nonce "$KEEPER_ADDRESS" --rpc-url "$MEZO_RPC")
export HUB_ADDRESS=$(cast compute-address "$KEEPER_ADDRESS" --nonce "$NONCE" | awk '{print $NF}')
echo "predicted hub $HUB_ADDRESS (mezo nonce $NONCE)"

cd contracts
forge script script/Deploy.s.sol:DeployVault --rpc-url "$BASE_RPC" --private-key "$KEEPER_PRIVATE_KEY" --broadcast --slow -q
VAULT_ADDRESS=$(jq -r '.transactions[] | select(.transactionType=="CREATE" and .contractName=="LevadaVault") | .contractAddress' \
  broadcast/Deploy.s.sol/$(jq -r ".$NETWORK.base.chainId" ../$CFG)/run-latest.json)
export VAULT_ADDRESS
echo "vault $VAULT_ADDRESS"

forge script script/Deploy.s.sol:DeployHub --rpc-url "$MEZO_RPC" --private-key "$KEEPER_PRIVATE_KEY" --broadcast --slow --legacy -q
HUB=$(jq -r '.transactions[] | select(.transactionType=="CREATE" and .contractName=="LevadaHub") | .contractAddress' \
  broadcast/Deploy.s.sol/$(jq -r ".$NETWORK.mezo.chainId" ../$CFG)/run-latest.json)
[ "$(echo "$HUB" | tr A-F a-f)" = "$(echo "$HUB_ADDRESS" | tr A-F a-f)" ] || { echo "hub $HUB != predicted $HUB_ADDRESS; vault stays paused"; exit 1; }
forge script script/Deploy.s.sol:FinishVault --rpc-url "$BASE_RPC" --private-key "$KEEPER_PRIVATE_KEY" --broadcast --slow -q
echo "deposits open; vault ownership offered to $OWNER (accept with acceptOwnership)"

BASE_BLOCK=$(cast block-number --rpc-url "$BASE_RPC"); MEZO_BLOCK=$(cast block-number --rpc-url "$MEZO_RPC")
cat > ../deployments/$NETWORK.json <<JSON
{ "vault": "$VAULT_ADDRESS", "hub": "$HUB", "vaultBlock": $BASE_BLOCK, "hubBlock": $MEZO_BLOCK }
JSON
echo "wrote deployments/$NETWORK.json"
