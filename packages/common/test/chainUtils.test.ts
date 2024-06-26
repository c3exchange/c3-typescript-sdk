import "mocha"
import {
    CHAIN_UTILS,
    isChainIdSupported,
    isValidAddress,
    getDataPrefixByAddress,
    getPublicKeyByAddress,
    getSigningMethodByAddress,
    verifySignatureByAddress,
    toSupportedChainId,
    SUPPORTED_CHAIN_IDS,
    SUPPORTED_CHAIN_NAMES,
    SupportedChainName,
} from "../src/chains"
import { SignMethod } from "../src/interfaces"
import { CHAIN_ID_ALGORAND, CHAIN_ID_ETH, CHAIN_ID_AVAX, toChainName, CHAIN_ID_SOLANA } from "../src/wormhole"
import algosdk from "algosdk"
import * as ethers from "ethers"
import { expect } from "chai"
import { base16ToBase64 } from "../src/utils"
import { Keypair } from "@solana/web3.js"
import nacl from "tweetnacl"

describe("CHAIN_UTILS tests", () => {
    const algorandAddress = "X6MNR4AVJQEMJRHAPZ6F4O4SVDIYN67ZRMD2O3ULPY4QFMANQNZOEYHODE"
    const ethereumAddress = "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8"
    const avaxAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const solanaAddress = "C4g4fRKT1xF6tFvo8QoPccVGsrzFgbHZnMRXfsSNQ8dm"

    const addressesWithChains = [
        { address: algorandAddress, chainId: CHAIN_ID_ALGORAND, signingMethod: SignMethod.SIGNING_METHOD_ED25519 },
        { address: ethereumAddress, chainId: CHAIN_ID_ETH, signingMethod: SignMethod.SIGNING_METHOD_ECDSA },
        { address: avaxAddress, chainId: CHAIN_ID_AVAX, signingMethod: SignMethod.SIGNING_METHOD_ECDSA },
        { address: solanaAddress, chainId: CHAIN_ID_SOLANA, signingMethod: SignMethod.SIGNING_METHOD_ED25519 },
    ]

    it("Should verify that SupportedChainId are the same than SupportedChainName", () => {
        for (const chainId of SUPPORTED_CHAIN_IDS) {
            expect(CHAIN_UTILS[chainId]).to.not.be.undefined
            expect(SUPPORTED_CHAIN_NAMES.includes(toChainName(chainId) as SupportedChainName)).to.be.true
            expect(isChainIdSupported(chainId)).to.be.true
        }
    })

    it ("Should fail by accessing to an unsupported chain", () => {
        const unsupportedChainId = 29 // CHAIN_ID_BTC
        expect(isChainIdSupported(unsupportedChainId)).to.be.false
        expect(() => toSupportedChainId(unsupportedChainId)).to.throw()
    })

    it("Should verify if an address is valid or no", () => {
        const validAddresses = addressesWithChains.map(({ address }) => address)
        const invalidAddresses = [
            "ZMWPXNULSR3US737FFOSEJJB4B345BJQRYCVYPJSP7IUBRXUN3LF4MG2NB",
            "0x8435177aB297bA92A06054cE80a58Ed4DBd7ed3a",
            "0x30ac0Fb4F2D84898e4D9E7b4DaB3C24599a6D553",
            "C4g4fRKT1xF6tFvoz0oPccVGsrzFgbHZnMRXfsSNQ8dm"
        ]
        for (const address of validAddresses) {
            expect(isValidAddress(address)).to.be.true
        }
        for (const address of invalidAddresses) {
            expect(isValidAddress(address)).to.be.false
        }
    })
    it ("Should return the respective data prefix", () => {
        const dataLength = 10
        // Algorand
        const algorandDataPrefix = getDataPrefixByAddress(algorandAddress, dataLength)
        expect(CHAIN_UTILS[CHAIN_ID_ALGORAND].getDataPrefix(dataLength), "Algorand address").to.be.deep.equal(algorandDataPrefix)
        // Ethereum
        const ethereumDataPrefix = getDataPrefixByAddress(ethereumAddress, dataLength)
        expect(CHAIN_UTILS[CHAIN_ID_ETH].getDataPrefix(dataLength), "Ethereum address").to.be.deep.equal(ethereumDataPrefix)
        // Solana
        const solanaDataPrefix = getDataPrefixByAddress(solanaAddress, dataLength)
        expect(CHAIN_UTILS[CHAIN_ID_SOLANA].getDataPrefix(dataLength), "Solana address").to.be.deep.equal(solanaDataPrefix)

    })
    it ("Should return the respective public key", () => {
        expect(getPublicKeyByAddress(algorandAddress), "Algorand address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_ALGORAND].getPublicKey(algorandAddress))
        expect(getPublicKeyByAddress(ethereumAddress), "Ethereum address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_ETH].getPublicKey(ethereumAddress))
        expect(getPublicKeyByAddress(solanaAddress), "Solana address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_SOLANA].getPublicKey(solanaAddress))
    })
    it ("Should return the respective signing method", () => {
        expect(getSigningMethodByAddress(algorandAddress), "Algorand address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_ALGORAND].getSigningMethod())
        expect(getSigningMethodByAddress(ethereumAddress), "Ethereum address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_ETH].getSigningMethod())
        expect(getSigningMethodByAddress(solanaAddress), "Solana address").to.be.deep.equal(CHAIN_UTILS[CHAIN_ID_SOLANA].getSigningMethod())
    })
    it ("Should work verifySignatureByAddress", async () => {
        const dataToSign = new Uint8Array(Buffer.from("Hello World", "ascii"))
        // Algorand
        const account = algosdk.generateAccount()
        const signature = algosdk.signBytes(dataToSign, account.sk)
        expect(verifySignatureByAddress(signature, dataToSign, account.addr), "Algorand address").to.be.true
        // Ethereum
        const ethAccount = ethers.Wallet.createRandom()
        const ethSignature = await ethAccount.signMessage(dataToSign)
        const parsedEthSignature = base16ToBase64(ethSignature)
        expect(verifySignatureByAddress(parsedEthSignature, dataToSign, ethAccount.address), "Ethereum address").to.be.true
        // Solana
        const keypair = new Keypair()
        const solSignature = nacl.sign.detached(dataToSign, keypair.secretKey)
        expect(verifySignatureByAddress(solSignature, dataToSign, keypair.publicKey.toString()), "Solana address").to.be.true
    })
    it ("Should work getXAddress method", () => {
        for (const addressWithChain of addressesWithChains) {
            const { address, chainId } = addressWithChain
            const xAddress = CHAIN_UTILS[chainId].getXAddress(address)
            expect(xAddress).to.be.deep.equal({
                address,
                chainId
            })
        }
    })
    it ("Should work getXContractAddress method", () => {
        for (const addressWithChain of addressesWithChains) {
            const { address, chainId } = addressWithChain
            const xContractAddress = CHAIN_UTILS[chainId].getXContractAddress(address)
            expect(xContractAddress).to.be.deep.equal({
                tokenAddress: address,
                chain: toChainName(chainId)
            })
        }
    })
    it ("Should work getPublicKey and getAddressByPublicKey", () => {
        for (const addressWithChain of addressesWithChains) {
            const { address, chainId } = addressWithChain
            const publicKey = CHAIN_UTILS[chainId].getPublicKey(address)
            expect(publicKey).to.be.instanceOf(Uint8Array)
            expect(publicKey.length).to.be.equal(32)
            const derivedAddress = CHAIN_UTILS[chainId].getAddressByPublicKey(publicKey).toUpperCase()
            expect(derivedAddress).to.be.equal(address.toUpperCase())
        }
    })
    it ("Should work getSigningMethod", () => {
        for (const addressWithChain of addressesWithChains) {
            const { chainId, signingMethod } = addressWithChain
            const signMethod = CHAIN_UTILS[chainId].getSigningMethod()
            expect(signMethod).to.be.equal(signingMethod)
        }
    })
})
