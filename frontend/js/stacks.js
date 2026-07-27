// Stacks wallet integration for BlessMed.
// Loaded as a module so it can import @stacks/connect and
// @stacks/transactions directly from a CDN — no npm install,
// no build step, matches the rest of this plain JS frontend.
//
// IMPORTANT: replace CONTRACT_ADDRESS below with the address
// you get after deploying contracts/blessmed-registry.clar
// (see README.md — "Deploying the smart contract").

import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
  request
} from 'https://esm.sh/@stacks/connect@8';

import {
  Cl,
  cvToValue,
  fetchCallReadOnlyFunction
} from 'https://esm.sh/@stacks/transactions@7';

const CONTRACT_ADDRESS = 'ST000000000000000000002AMW42H'; // placeholder — replace after deploying
const CONTRACT_NAME = 'blessmed-registry';
const NETWORK = 'testnet';

const Stacks = {
  isConnected,

  getAddress() {
    if (!isConnected()) return null;
    const data = getLocalStorage();
    return data?.addresses?.stx?.[0]?.address || null;
  },

  async connectWallet() {
    await connect();
    return Stacks.getAddress();
  },

  disconnectWallet() {
    disconnect();
  },

  // Compute a SHA-256 hash of a File object, returned as a hex string.
  async hashFile(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Store a record's hash on-chain. Requires a connected wallet
  // and prompts the user to sign/broadcast the transaction.
  async storeRecordHash(hexHash) {
    const result = await request('stx_callContract', {
      contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
      functionName: 'store-record-hash',
      functionArgs: [Cl.bufferFromHex(hexHash)],
      network: NETWORK
    });
    return result; // { txid }
  },

  // Look up a hash on-chain — read-only, no wallet prompt needed.
  async getRecord(hexHash) {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-record',
      functionArgs: [Cl.bufferFromHex(hexHash)],
      network: NETWORK,
      senderAddress: CONTRACT_ADDRESS
    });
    return cvToValue(result);
  },

  // Award points to the connected wallet for a healthy action.
  async earnPoints(amount) {
    const result = await request('stx_callContract', {
      contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
      functionName: 'earn-points',
      functionArgs: [Cl.uint(amount)],
      network: NETWORK
    });
    return result; // { txid }
  },

  // Read current point total for an address — no wallet prompt needed.
  async getPoints(address) {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-points',
      functionArgs: [Cl.principal(address)],
      network: NETWORK,
      senderAddress: address
    });
    return cvToValue(result);
  }
};

window.Stacks = Stacks;
