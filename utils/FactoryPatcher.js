const CONFIG = require('../config/config.json')

const { Wallet, BigNumber, ethers } = require('ethers');

/**
 * @param {string} factoryTx 
 * @param {Wallet} signingWallet 
 */
async function _rebuildFactoryTx(factoryTx, signingWallet) {
    /** @type {import('ethers').Transaction} */
    const tx = ethers.utils.parseTransaction(factoryTx);
    // Delete signature + hash
    delete tx.r;
    delete tx.s;
    delete tx.v;
    delete tx.hash;
    tx.from = await signingWallet.getAddress(); 
    // increase gasLimit (reason why Factory contract could not be deployed 
    // on evm shanghai)
    tx.gasLimit = tx.gasLimit.mul(2);
    // @ts-ignore
    return signingWallet.signTransaction(tx);
}

/**
 * @param {string} owner 
 * @param {number} nonce 
 */
function _contractAddress(owner, nonce) {
    // Convert owner address to bytes
    const owner_bytes = ethers.utils.arrayify(owner);
    // Convert nonce integer to bytes
    const nonce_bn = BigNumber.from(nonce);
    const nonce_bytes = ethers.utils.stripZeros(ethers.utils.arrayify(nonce_bn.toHexString()));
    // RLP encode the pair (owner,nonce)
    const rlp = ethers.utils.RLP.encode([owner_bytes, nonce_bytes]);
    // Keccak the whole stuff
    const hash = ethers.utils.keccak256(rlp);
    // Keep the last 40-nibbles 
    const hash_40 = ethers.utils.hexDataSlice(hash, 12);
    return ethers.utils.getAddress(hash_40);
}

/**
 * @param {boolean} doShanghaiPatch 
 */
async function _loadFactory(doShanghaiPatch) {
    const IEXEC_FACTORY = require('@iexec/solidity/deployment/factory.json');
    if (!doShanghaiPatch) {
        return IEXEC_FACTORY;
    }

    // Use a dummy public temporary wallet
    const factorySigningWallet = new Wallet("0x687d5d883e69b288fca732f6230cf76b504a29998075350f86d64f5ca59f34c1");
    const SHANGHAI_FACTORY = { ...IEXEC_FACTORY };
    // skip for mainnet and testnet use
    if (factorySigningWallet) {
        SHANGHAI_FACTORY.deployer = await factorySigningWallet.getAddress();
        SHANGHAI_FACTORY.address = _contractAddress(SHANGHAI_FACTORY.deployer, 0);
        // @ts-ignore
        SHANGHAI_FACTORY.cost = BigNumber.from(IEXEC_FACTORY.cost).mul(2);
        SHANGHAI_FACTORY.tx = await _rebuildFactoryTx(IEXEC_FACTORY.tx, factorySigningWallet);
    }
    return SHANGHAI_FACTORY;
}

/**
 * @param {*} FACTORY 
 */
async function patchFACTORY(FACTORY) {
    const doShanghaiPatch = !!process.env.PATCH_SHANGHAI_FACTORY;
    if (!doShanghaiPatch) {
        return;
    }

    const SHANGHAI_FACTORY = await _loadFactory(true /* do shanghai patch */);

    // Apply patch
    FACTORY.address = SHANGHAI_FACTORY.address;
    FACTORY.cost = SHANGHAI_FACTORY.cost;
    FACTORY.tx = SHANGHAI_FACTORY.tx;
    FACTORY.deployer = SHANGHAI_FACTORY.deployer;
}

async function loadFACTORY() {
    const doShanghaiPatch = !!process.env.PATCH_SHANGHAI_FACTORY;
    if (!doShanghaiPatch) {
        return;
    }
    const FACTORY = await _loadFactory(doShanghaiPatch);
    return FACTORY;
}

module.exports = { patchFACTORY, loadFACTORY }
