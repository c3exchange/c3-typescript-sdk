import algosdk from "algosdk"
import { Base64, RawSignature, SignMethod, Signature, UserAddress } from "../interfaces"
import { decodeBase64 } from "../utils"
import { ChainTools } from "./type"
import { CHAIN_ID_ALGORAND } from "../wormhole"
import base32 from "hi-base32"

export const ALGORAND_ZERO_ADDRESS_STRING = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

const AlgorandUtils: ChainTools = {
    getPublicKey: (address: UserAddress) => algosdk.decodeAddress(address).publicKey,
    getAddressByPublicKey: (publickKeyAddress: Uint8Array) => algosdk.encodeAddress(publickKeyAddress),
    getDataPrefix: () => new Uint8Array(Buffer.from([77, 88])), // "MX"
    isValidAddress: algosdk.isValidAddress,
    toValidAddress: (address: string) => {
        if (!algosdk.isValidAddress(address)) {
            throw new Error(`Address is invalid: ${address}`)
        }
        return address
    },
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_ALGORAND, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: "algorand", tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ED25519,
    verifySignature: (signature: Signature|RawSignature, data: Uint8Array|Base64, userAddress: UserAddress): boolean => {
        const parsedSignature = signature instanceof Uint8Array ? signature : decodeBase64(signature)
        const parsedData = data instanceof Uint8Array ? data : decodeBase64(data)
        return algosdk.verifyBytes(parsedData, parsedSignature, userAddress)
    },
    isValidTxHash: (txHash: string) => {
        try {
            return base32.decode.asBytes(txHash).length === 32
        } catch (e) {
            return false
        }
    },
}
export default AlgorandUtils