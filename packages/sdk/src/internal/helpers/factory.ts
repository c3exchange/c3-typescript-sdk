import {
    Owner,
    EVMSigner,
    SolanaSigner,
    Signer,
    EVMChainName,
    toSupportedChainId,
    toChainId,
    AlgorandSigner,
    Funder,
} from "@c3exchange/common"

import * as algosdk from "algosdk"
import * as ethers from "ethers"
import * as solanaSdk from "@solana/web3.js"
import * as bip39 from "bip39"
import * as nacl from "tweetnacl"

export function isAlgorandSigner(owner: Owner): owner is AlgorandSigner {
    return owner instanceof AlgorandSigner
}

export function isEVMSigner(owner: Owner): owner is EVMSigner {
    return owner instanceof EVMSigner
}

export function isSolanaSigner(owner: Owner): owner is SolanaSigner {
    return owner instanceof SolanaSigner
}

export function createAlgorandOwnerFromPrivateKey(secretKey: Uint8Array): Owner {
    return new Signer().addFromMnemonic(algosdk.secretKeyToMnemonic(secretKey))
}

export function createAlgorandFunderFromPrivateKey(secretKey: Uint8Array): Funder {
    return createAlgorandOwnerFromPrivateKey(secretKey)
}

export function createAlgorandOwnerFromMnemonic(mnemonic: string): Owner {
    return new Signer().addFromMnemonic(mnemonic)
}

export function createAlgorandFunderFromMnemonic(mnemonic: string): Funder {
    return createAlgorandOwnerFromMnemonic(mnemonic)
}

export function createEVMOwnerFromMnemonic(mnemonic: string, provider: ethers.ethers.providers.Provider, chainName: EVMChainName = "ethereum"): Owner {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider)
    return new EVMSigner(
        wallet.address,
        toSupportedChainId(toChainId(chainName)) as any,
        wallet
    )
}

export function createEVMFunderFromMnemonic(mnemonic: string, provider: ethers.ethers.providers.Provider, chainName: EVMChainName = "ethereum"): Funder {
    return createEVMOwnerFromMnemonic(mnemonic, provider, chainName)
}

export async function createEVMOwnerFromSigner(signer: ethers.Signer, chainName: EVMChainName = "ethereum"): Promise<Owner> {
    return new EVMSigner(
        await signer.getAddress(),
        toSupportedChainId(toChainId(chainName)) as any,
        signer
    )
}

export async function createEVMFunderFromSigner(signer: ethers.Signer, chainName: EVMChainName = "ethereum"): Promise<Funder> {
    return createEVMOwnerFromSigner(signer, chainName)
}

export function createEVMOwnerFromPrivateKey(privateKey: Uint8Array, provider: ethers.ethers.providers.Provider, chainName: EVMChainName = "ethereum"): Owner {
    const wallet = new ethers.Wallet(privateKey).connect(provider)
    return new EVMSigner(
        wallet.address,
        toSupportedChainId(toChainId(chainName)) as any,
        wallet
    )
}

export function createEVMFunderFromPrivateKey(privateKey: Uint8Array, provider: ethers.ethers.providers.Provider, chainName: EVMChainName = "ethereum"): Funder {
    return createEVMOwnerFromPrivateKey(privateKey, provider, chainName)
}

const solanaSignCallback = async (tx: any, keypair: solanaSdk.Keypair) => {
    if (tx instanceof solanaSdk.Transaction) {
        tx.partialSign(keypair)
    }
    if (tx instanceof solanaSdk.VersionedTransaction) {
        tx.sign([keypair])
    }
    throw new Error("Unsupported transaction type")
}

export function createSolanaOwnerFromMnemonic(mnemonic: string, connection: solanaSdk.Connection): Owner {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keypair = solanaSdk.Keypair.fromSeed(seed.subarray(0, 32));
    return new SolanaSigner(keypair.publicKey.toBase58(), (tx) => solanaSignCallback(tx, keypair), async (message) => {
        return nacl.sign.detached(message, keypair.secretKey)
    }, connection)
}

export function createSolanaFunderFromMnemonic(mnemonic: string, connection: solanaSdk.Connection): Funder {
    return createSolanaOwnerFromMnemonic(mnemonic, connection)
}

export function createSolanaOwnerFromPrivateKey(privateKey: Uint8Array, connection: solanaSdk.Connection): Owner {
    const keypair = solanaSdk.Keypair.fromSecretKey(privateKey)
    return new SolanaSigner(keypair.publicKey.toBase58(), (tx) => solanaSignCallback(tx, keypair), async (message) => {
        return nacl.sign.detached(message, keypair.secretKey)
    }, connection)
}

export function createSolanaFunderFromPrivateKey(privateKey: Uint8Array, connection: solanaSdk.Connection): Funder {
    return createSolanaOwnerFromPrivateKey(privateKey, connection)
}
