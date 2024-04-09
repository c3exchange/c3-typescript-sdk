import { CHAIN_ID_SOLANA } from "@certusone/wormhole-sdk";
import { Base64, RawSignature, SignMethod, Signature, UserAddress } from "../interfaces";
import { decodeBase64, decodeSolanaAddress } from "../utils";
import { ChainTools } from "./type";
import base58 from "bs58";
import nacl from "tweetnacl";
import { SolanaChainName } from "../wormhole/constants";

// See https://docs.solanalabs.com/proposals/off-chain-message-signing#message-preamble
function getSolanaMessagePreamble(dataLength: number): Uint8Array {
    return new Uint8Array(0)
}

function verifySolanaSignature(signature: Signature|RawSignature, data: Uint8Array|Base64, userAddress: UserAddress): boolean {
    const parsedData = data instanceof Uint8Array ? data : decodeBase64(data)
    const parsedSignature = signature instanceof Uint8Array ? signature : decodeBase64(signature)
    return nacl.sign.detached.verify(parsedData, parsedSignature, decodeSolanaAddress(userAddress))
}

function isValidBase58(str: string) {
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    return base58Regex.test(str);
}

function isValidSolanaTxHash(txHash: string): boolean {
    // Solana tx hash is base58 encoded
    // It is imposible to validate solana tx hash without RPC call
    // So we just check if it is base58 encoded
    return isValidBase58(txHash)
 }

function isValidSolanaAddress(address: string): boolean {
    try {
        const decoded = base58.decode(address);
        return decoded.length === 32;
    } catch (e) {
        return false;
    }
}

function getSolanaAddressFromPublicKey(publicKey: Uint8Array): UserAddress {
    return base58.encode(publicKey);
}

function toValidAddress(address: string): string {
    return address
}

const SolanaUtils: ChainTools = {
    toValidAddress: (address: string) => toValidAddress(address),
    getPublicKey: (address: UserAddress) => decodeSolanaAddress(address),
    getDataPrefix: (dataLength: number) => getSolanaMessagePreamble(dataLength),
    isValidAddress: isValidSolanaAddress,
    getAddressByPublicKey: getSolanaAddressFromPublicKey,
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_SOLANA, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: SolanaChainName, tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ED25519,
    verifySignature: verifySolanaSignature,
    isValidTxHash: isValidSolanaTxHash,
}

export default SolanaUtils