import type { SignMethod } from "../interfaces/signer"
import type { Base64, RawSignature, Signature, UserAddress } from "../interfaces/types"
import type { XAddress, XContractAddress } from "../wormhole"

interface ChainTools {
    getPublicKey: (address: UserAddress) => Uint8Array
    getAddressByPublicKey: (publicKey: Uint8Array) => UserAddress
    getSigningMethod: () => SignMethod
    getDataPrefix: ((dataLength: number) => Uint8Array)
    getXAddress: (address: UserAddress) => XAddress
    getXContractAddress: (tokenAddress: string) => XContractAddress
    isValidAddress: (address: UserAddress) => boolean,
    verifySignature: (signature: Signature | RawSignature, data: Uint8Array | Base64, address: UserAddress) => boolean
    isValidTxHash: (txHash: string) => boolean
}

export type {
    ChainTools,
}
