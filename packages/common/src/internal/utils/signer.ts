import { getPublicKeyByAddress, getSigningMethodByAddress, getDataPrefixByAddress } from "../../chains"
import { UserAddress, UnixTimestamp } from "../../interfaces"
import { IPackedInfo, concatArrays, encodeABIValueWithFormat, encodeBase64 } from "../../utils"
import assert from "assert"

export const signedHeaderFormat: IPackedInfo = {
    target: { type: "bytes", size: 32 },
    lease: { type: "bytes", size: 32 },
    lastValid: { type: "number" },
}

export const signedMessageFormat: IPackedInfo = {
    header: {
        type: "object",
        info: signedHeaderFormat,
    },
    operation: { type: "base64" },
    encodedSignedData: { type: "base64" },
    signMethod: { type: "number", size: 1 },
    signature: { type: "base64" },
    signer: { type: "bytes", size: 32 },
    prefix: { type: "base64" },
}

export function getDataToSign(operation: Uint8Array, target: Uint8Array, lease: Uint8Array, lastValid: UnixTimestamp): Uint8Array {
    const header = { target, lease, lastValid }
    const bytesToEncode = concatArrays([Buffer.from("(C3.IO)0"), encodeABIValueWithFormat(header, signedHeaderFormat), operation])
    return new Uint8Array(Buffer.from(encodeBase64(bytesToEncode)))
}

export function getSignedPayload(operation: Uint8Array, signature: Uint8Array, signer: UserAddress, target: Uint8Array, lease: Uint8Array, lastValid: UnixTimestamp): Object {
    assert(lease.length === 32)
    const header = { target, lease, lastValid }
    const signMethod = getSigningMethodByAddress(signer)
    const publicKey = getPublicKeyByAddress(signer)
    const encodedSignedData = getDataToSign(operation, target, lease, lastValid)
    const prefix = getDataPrefixByAddress(signer, encodedSignedData.length)
    return { header, operation, encodedSignedData, signMethod, signature, signer: publicKey, prefix }
}

export function encodeSignedPayload(operation: Uint8Array, signature: Uint8Array, signer: UserAddress, target: Uint8Array, lease: Uint8Array, lastValid: UnixTimestamp): Uint8Array {
    const message = getSignedPayload(operation, signature, signer, target, lease, lastValid)
    return encodeABIValueWithFormat(message, signedMessageFormat)
}
