import { Signature, RawSignature, Base64, UserAddress } from "../interfaces";
import { concatArrays, decodeBase64 } from "../utils";
import * as ethers from "ethers"

const ETHEREUM_PUBLICKEY_START_BYTE = 12
const ETHEREUM_PUBLICKEY_LENGTH = 20

export function getEthereumDataPrefix (dataLength: number): Uint8Array {
    return concatArrays([
        // "\x19Ethereum Signed Message:\n" + data.length.toString()
        new Uint8Array(Buffer.from("GUV0aGVyZXVtIFNpZ25lZCBNZXNzYWdlOgo=", "base64")),
        new Uint8Array(Buffer.from(dataLength.toString()))
    ])
}

const publicKeyToString = (publicKeyAddress: Uint8Array) => `0x${Buffer.from(publicKeyAddress).toString('hex')}`
const isZero = (b: number) => b === 0
export function getEthereumAddressByPublicKey (publicKeyAddress: Uint8Array): UserAddress {
    if (publicKeyAddress.length < ETHEREUM_PUBLICKEY_LENGTH) {
        throw new Error("Ethereum address must have 20/32 bytes length")
    }
    let ethAddress: string|undefined
    const first12Bytes = publicKeyAddress.subarray(0, ETHEREUM_PUBLICKEY_START_BYTE)
    if (first12Bytes.every(isZero)) {
        const ethPublicKey = publicKeyAddress.subarray(ETHEREUM_PUBLICKEY_START_BYTE)
        ethAddress = publicKeyToString(ethPublicKey)
    } else if (publicKeyAddress.length === ETHEREUM_PUBLICKEY_LENGTH) {
        ethAddress = publicKeyToString(publicKeyAddress)
    } else {
        throw new Error("Ethereum address must have 20 bytes length")
    }    
    try {
        return getEthereumAddressWithChecksum(ethAddress)
    } catch {
        throw new Error("Invalid address type")
    }
}

export function verifyEthereumSignature (signature: Signature|RawSignature, data: Uint8Array|Base64, userAddress: UserAddress): boolean {
    const parsedData = data instanceof Uint8Array ? data : decodeBase64(data)
    const parsedSignature = signature instanceof Uint8Array ? signature : decodeBase64(signature)
    const address = ethers.utils.verifyMessage(parsedData, parsedSignature)
    return address === userAddress
}

export function isValidEVMTxHash (txHash: string): boolean {
    return ethers.utils.isHexString(txHash, 32)
}

export function isValidEthereumAddress(address: string, strict = false): boolean {
    // We need to ensure the address contains the checksum
    try {
        const addressWithChecksum = getEthereumAddressWithChecksum(address)
        if (strict) {
            return address === addressWithChecksum
        }
        return address.toLowerCase() === addressWithChecksum.toLocaleLowerCase()
    } catch (error) { }
    return false;    
}

export function toValidEthereumAddress(address: string): UserAddress {
    return getEthereumAddressWithChecksum(address)
}

function getEthereumAddressWithChecksum(address: string): string {
    return ethers.utils.getAddress(address)
}
