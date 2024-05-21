import "mocha"
import { expect } from "chai"
import {
    createAlgorandFunderFromMnemonic,
    createAlgorandOwnerFromMnemonic,
    createEVMFunderFromMnemonic,
    createEVMFunderFromSigner,
    createEVMOwnerFromMnemonic,
    createEVMOwnerFromSigner,
    createSolanaFunderFromMnemonic,
    createSolanaOwnerFromMnemonic,
    createAlgorandFunderFromPrivateKey,
    createAlgorandOwnerFromPrivateKey,
    createEVMFunderFromPrivateKey,
    createEVMOwnerFromPrivateKey,
    createSolanaFunderFromPrivateKey,
    createSolanaOwnerFromPrivateKey,
} from "../../../src/internal/helpers/factory"

import { AlgorandSigner, AvalancheChainName, CHAIN_ID_ALGORAND, CHAIN_ID_AVAX, CHAIN_ID_ETH, CHAIN_ID_SOLANA, EVMSigner, SolanaSigner } from "@c3exchange/common"

import * as ethers from "ethers"
import algosdk from "algosdk"
import { Connection, Keypair } from "@solana/web3.js"

describe("Factory tests", () => {
    const algorandMnemonic = "right icon safe ethics yard kitten oil carbon first trumpet solar spoil defy ready cycle timber dawn board cloud tobacco yellow foam bid about aunt"
    const algorandAddress = "2QHE3XOGQA5QR5UAXG2QW7PNEVRL5SKRUAM3OLJMEXTR72V2SE6ECG4V7E"
    const bip39Mnemonic = "duty birth mass way vague achieve man siren faith renew ride april"
    const evmAddress = "0x4B3D98F3037209C1F12FE9CD755de4CF2b5e3d2E"
    const solAddress = "Ct5M4oDrmosbsASAFkAV15S5XTT7s9f8ESLv1uicYJUL"
    const ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8545")
    const solanaConnection = new Connection("http://localhost:8899")

    it("Should create an Algorand owner from mnemonic", () => {
        const owner = createAlgorandOwnerFromMnemonic(algorandMnemonic)
        expect(owner).to.be.instanceOf(AlgorandSigner)
        expect((owner as AlgorandSigner).address).to.be.equal(algorandAddress)
        expect((owner as AlgorandSigner).chainId).to.be.equal(CHAIN_ID_ALGORAND)
    })
    it("Should create an Algorand funder from mnemonic", () => {
        const funder = createAlgorandFunderFromMnemonic(algorandMnemonic)
        expect(funder).to.be.instanceOf(AlgorandSigner)
        expect((funder as AlgorandSigner).address).to.be.equal(algorandAddress)
        expect((funder as AlgorandSigner).chainId).to.be.equal(CHAIN_ID_ALGORAND)
    })
    it("Should create an Algorand owner from private key", () => {
        const secretKey = algosdk.mnemonicToSecretKey(algorandMnemonic).sk
        const owner = createAlgorandOwnerFromPrivateKey(secretKey)
        expect(owner).to.be.instanceOf(AlgorandSigner)
        expect((owner as AlgorandSigner).address).to.be.equal(algorandAddress)
        expect((owner as AlgorandSigner).chainId).to.be.equal(CHAIN_ID_ALGORAND)
    })
    it("Should create an Algorand funder from private key", () => {
        const secretKey = algosdk.mnemonicToSecretKey(algorandMnemonic).sk
        const funder = createAlgorandFunderFromPrivateKey(secretKey)
        expect(funder).to.be.instanceOf(AlgorandSigner)
        expect((funder as AlgorandSigner).address).to.be.equal(algorandAddress)
        expect((funder as AlgorandSigner).chainId).to.be.equal(CHAIN_ID_ALGORAND)
    })
    it("Should create an EVM owner from mnemonic", () => {
        const owner = createEVMOwnerFromMnemonic(bip39Mnemonic, ethersProvider, AvalancheChainName)
        expect(owner).to.be.instanceOf(EVMSigner)
        expect((owner as EVMSigner).address).to.be.equal(evmAddress)
        expect((owner as EVMSigner).chainId).to.be.equal(CHAIN_ID_AVAX)
    })
    it("Should create an EVM funder from mnemonic", () => {
        const funder = createEVMFunderFromMnemonic(bip39Mnemonic, ethersProvider, AvalancheChainName)
        expect(funder).to.be.instanceOf(EVMSigner)
        expect((funder as EVMSigner).address).to.be.equal(evmAddress)
        expect((funder as EVMSigner).chainId).to.be.equal(CHAIN_ID_AVAX)
    })
    it("Should create an EVM owner from signer", async () => {
        const signer = ethers.Wallet.fromMnemonic(bip39Mnemonic).connect(ethersProvider)
        const owner = await createEVMOwnerFromSigner(signer)
        expect(owner).to.be.instanceOf(EVMSigner)
        expect((owner as EVMSigner).address).to.be.equal(evmAddress)
        expect((owner as EVMSigner).chainId).to.be.equal(CHAIN_ID_ETH)
    })
    it("Should create an EVM funder from signer", async () => {
        const signer = ethers.Wallet.fromMnemonic(bip39Mnemonic).connect(ethersProvider)
        const funder = await createEVMFunderFromSigner(signer)
        expect(funder).to.be.instanceOf(EVMSigner)
        expect((funder as EVMSigner).address).to.be.equal(evmAddress)
        expect((funder as EVMSigner).chainId).to.be.equal(CHAIN_ID_ETH)
    })
    it("Should create an EVM owner from private key", () => {
        const privateKey = ethers.Wallet.fromMnemonic(bip39Mnemonic).privateKey.substring(2) // Remove the 0x prefix
        const owner = createEVMOwnerFromPrivateKey(new Uint8Array(Buffer.from(privateKey, "hex")), ethersProvider)
        expect(owner).to.be.instanceOf(EVMSigner)
        expect((owner as EVMSigner).address).to.be.equal(evmAddress)
        expect((owner as EVMSigner).chainId).to.be.equal(CHAIN_ID_ETH)
    })
    it("Should create an EVM funder from private key", () => {
        const privateKey = ethers.Wallet.fromMnemonic(bip39Mnemonic).privateKey.substring(2) // Remove the 0x prefix
        const funder = createEVMFunderFromPrivateKey(new Uint8Array(Buffer.from(privateKey, "hex")), ethersProvider)
        expect(funder).to.be.instanceOf(EVMSigner)
        expect((funder as EVMSigner).address).to.be.equal(evmAddress)
        expect((funder as EVMSigner).chainId).to.be.equal(CHAIN_ID_ETH)
    })
    it("Should create a Solana owner from mnemonic", () => {
        const owner = createSolanaOwnerFromMnemonic(bip39Mnemonic, solanaConnection)
        expect(owner).to.be.instanceOf(SolanaSigner)
        expect((owner as SolanaSigner).address).to.be.equal(solAddress)
        expect((owner as SolanaSigner).chainId).to.be.equal(CHAIN_ID_SOLANA)
    })
    it("Should create a Solana funder from mnemonic", () => {
        const funder = createSolanaFunderFromMnemonic(bip39Mnemonic, solanaConnection)
        expect(funder).to.be.instanceOf(SolanaSigner)
        expect((funder as SolanaSigner).address).to.be.equal(solAddress)
        expect((funder as SolanaSigner).chainId).to.be.equal(CHAIN_ID_SOLANA)
    })
    it("Should create a Solana owner from private key", () => {
        const newKeypair = Keypair.generate()
        const owner = createSolanaOwnerFromPrivateKey(newKeypair.secretKey, solanaConnection)
        expect(owner).to.be.instanceOf(SolanaSigner)
        expect((owner as SolanaSigner).address).to.be.equal(newKeypair.publicKey.toBase58())
        expect((owner as SolanaSigner).chainId).to.be.equal(CHAIN_ID_SOLANA)
    })
    it("Should create a Solana funder from private key", () => {
        const newKeypair = Keypair.generate()
        const funder = createSolanaFunderFromPrivateKey(newKeypair.secretKey, solanaConnection)
        expect(funder).to.be.instanceOf(SolanaSigner)
        expect((funder as SolanaSigner).address).to.be.equal(newKeypair.publicKey.toBase58())
        expect((funder as SolanaSigner).chainId).to.be.equal(CHAIN_ID_SOLANA)
    })
})