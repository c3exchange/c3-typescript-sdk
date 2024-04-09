import { ABIType, ABIValue, bigIntToBytes, decodeAddress, encodeAddress, isValidAddress } from 'algosdk'
import sha512 from "js-sha512"
import base32 from "hi-base32"
import bs58 from 'bs58';
import assert from 'assert'
import { ethers } from 'ethers'
import { UserAddress, AssetId, Hex, Base64, AppId, AccountId, Account } from '../interfaces'
import { C3_ACCOUNT_TYPE_UTILS, C3AccountType, C3_ACCOUNT_TYPES, C3_ACCOUNT_TYPE_ALGORAND, C3_ACCOUNT_TYPE_EVM, CHAIN_ID_TO_ACCOUNT_TYPE, SupportedChainId, findChainIdByAddress, getPublicKeyByAddress } from '../chains'
import { getEthereumAddressByPublicKey } from '../chains/evm'
import { CHAIN_ID_ALGORAND } from '@certusone/wormhole-sdk'

export const ETH_SIGNATURE_LENGTH = 65
export const MAX_SIGNATURE_LENGTH = ETH_SIGNATURE_LENGTH
export const SHA256_HASH_LENGTH = 32
export const ETHEREUM_ADDRESS_LENGTH = 24
export const PUBLIC_KEY_LENGTH = 32
export const C3_PUBLIC_KEY_LENGTH = 32
export const C3_CHECKSUM_LENGTH = 3
export const C3_MODERN_ACCOUNT_ID_LENGTH = 61
export const C3_LEGACY_ACCOUNT_ID_LENGTH = 59
export const C3_CHECKSUM_PREFIX = new Uint8Array(Buffer.from("(C3.IO)"))

export type AlgorandType = bigint | string | boolean | number | Uint8Array

export type IPackedInfoFixed = {
    type: "address" | "double" | "boolean" | "emptyString" | "signature" | "byte"
}
export type IPackedInfoVariable = {
    type: "string" | "bytes" | "base64" | "uint" | "number"
    size?: number
}
export type IPackedInfoObject = {
    type: "object" | "hash"
    info: IPackedInfo
}

export type IPackedInfoArray = {
    type: "array"
    info: IPackedInfoAny
}

export type IPackedInfoFixedBytes = {
    type: "fixed"
    valueHex: string
}

export type IPackedInfoAny = IPackedInfoFixed | IPackedInfoVariable | IPackedInfoObject | IPackedInfoArray | IPackedInfoFixedBytes
export type IPackedInfo = Record<string, IPackedInfoAny>

export type IStateType = 'uint' | 'bytes'
export type IStateMap = Record<string, IStateType>

export type IStateVar = Uint8Array | bigint
export type IState = Record<string, IStateVar>

// NOTE: !!!! ONLY MODIFY THIS BY APPENDING TO THE END. THE INDEXES EFFECT THE MERKLE LOG HASH VALUES !!!!
export const packedTypeMap = [
    "uint",
    "number",
    "address",
    "double",
    "boolean",
    "string",
    "byte",
    "bytes",
    "base64",
    "object",
    "hash",
    "array",
    "emptyString",
    "fixed",
    "signature",
    "ratio"
]

assert(packedTypeMap.length < 128, 'Too many types in packedTypeMap')

export function packABIString(format: IPackedInfo): string {
    const internalPackABIString = (format: IPackedInfo): string[] => {
        return Object.entries(format).map(([, type]) => {
            switch (type.type) {
                case 'object':
                case 'hash':
                    return "(" + internalPackABIString(type.info) + ")"
                case 'array':
                    return internalPackABIString({ value: type.info }) + "[]"
                case 'address':
                    return 'address'
                case 'byte':
                    return 'byte'
                case 'bytes':
                case 'string':
                case 'base64':
                    return 'byte[' + (type.size ?? "") + ']'
                case 'number':
                case 'uint':
                    return 'uint' + ((type.size ?? 8) * 8)
                case 'fixed':
                    if (type.valueHex.length == 2) {
                        // It's only one byte
                        return 'byte'
                    }
                    return 'byte[' + (type.valueHex.length / 2) + ']'
                default:
                    throw new Error(`Type ${type.type} is not supported or recognized`)
            }
        })
    }
    return "(" + internalPackABIString(format).join(",") + ")"
}

export function packABIValue(value: any): ABIValue {
    switch (typeof value) {
        case 'string':
        case 'number':
        case 'bigint': {
            return value
        }
    }

    if (value instanceof Uint8Array) {
        return value
    }

    if (Array.isArray(value)) {
        return value.map(packABIValue)
    }

    return Object.entries(value).map(([, v]) => packABIValue(v))
}

export function unpackABIValue(value: ABIValue, format: IPackedInfo, index = 0): any {
    assert(value instanceof Array, `Expected value to be an array, got ${typeof value}`)

    const result = Object.entries(format).map(([name, type]) => {
        switch (type.type) {
            case 'string': {
                const data = value[index++]
                assert(data instanceof Uint8Array, `Expected value to be a Uint8Array, got ${typeof data}`)
                return [name, new TextDecoder().decode(data)]
            }
            case 'bytes': {
                const data = value[index++]
                assert(data instanceof Uint8Array, `Expected value to be a Uint8Array, got ${typeof data}`)
                return [name, data]
            }
            case 'base64': {
                const data = value[index++]
                assert(data instanceof Uint8Array, `Expected value to be a Uint8Array, got ${typeof data}`)
                return [name, Buffer.from(data).toString('base64')]
            }
            case 'uint': {
                const data = value[index++]
                assert(typeof data === 'bigint' || typeof data === 'number', `Expected value to be a number or bigint, got ${typeof data}`)
                return [name, data]
            }
            case 'number': {
                const data = value[index++]
                assert(typeof data === 'bigint' || typeof data === 'number', `Expected value to be a number or bigint, got ${typeof data}`)
                return [name, Number(data)]
            }
            case 'byte': {
                const data = value[index++]
                assert(typeof data === 'bigint' || typeof data === 'number', `Expected value to be a number or bigint, got ${typeof data}`)
                return [name, Number(data)]
            }
            case 'address': {
                const data = value[index++]
                assert(data instanceof Uint8Array, `Expected value to be a Uint8Array, got ${typeof data}`)
                return [name, encodeAddress(data)]
            }
            default: {
                throw new Error(`Type ${type.type} is not yet supported`)
            }
        }
    })

    return Object.fromEntries(result)
}

export function encodeABIValue(value: any, encoding: string): Uint8Array {
    return ABIType.from(encoding).encode(packABIValue(value))
}

export function decodeABIValue(value: Uint8Array, encoding: string): any {
    return ABIType.from(encoding).decode(value)
}

export function encodeABIValueWithFormat(value: any, format: IPackedInfo): Uint8Array {
    const abiFormat = packABIString(format)
    return encodeABIValue(value, abiFormat)
}

export function decodeABIValueWithFormat(value: Uint8Array, format: IPackedInfo): any {
    const abiFormat = packABIString(format)
    return unpackABIValue(decodeABIValue(value, abiFormat), format)
}

export function concatArrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((accum, x) => accum + x.length, 0)
    const result = new Uint8Array(totalLength)

    let offset = 0
    arrays.forEach((array) => {
        result.set(array, offset)
        offset += array.length
    })

    return result
}

// Encode the format itself as part of the data for forward compatibility
export function packFormat(format: IPackedInfo): Uint8Array {
    const chunks: Uint8Array[] = []

    // NOTE: Byte-size fields are capped at 128 to allow for future expansion with varints
    // Encode number of fields
    const fieldCount = Object.entries(format).length
    assert(fieldCount < 128, `Too many fields in object: ${fieldCount}`)
    chunks.push(new Uint8Array([fieldCount]))

    for (const [name, type] of Object.entries(format)) {
        // Encode name and type index
        assert(name.length < 128, `Name of property ${name} too long`)
        chunks.push(new Uint8Array([name.length]))
        chunks.push(encodeString(name))

        const typeIndex = packedTypeMap.indexOf(type.type)
        assert(typeIndex >= 0, `Type index not found in packedTypeMap: ${type.type}`)

        chunks.push(new Uint8Array([typeIndex]))

        // For complex types, encode additional data
        switch (type.type) {
            case "string":
            case "bytes":
            case "base64":
                assert(type.size === undefined || type.size < 128, `Sized data was too large: ${type.size}`)
                chunks.push(new Uint8Array([type.size ?? 0]))
                break

            case "hash":
            case "object":
            case "array": {
                const format = packFormat(type.type === 'array' ? { value: type.info } : type.info)
                chunks.push(encodeUint64(format.length))
                chunks.push(format)
                break
            }
            case "fixed": {
                const valueAsBytes = decodeBase16(type.valueHex)
                chunks.push(encodeUint64(valueAsBytes.length))
                chunks.push(valueAsBytes)
                break
            }
        }
    }

    return concatArrays(chunks)
}

export function unpackFormat(data: Uint8Array): IPackedInfo {
    let index = 0
    // Decode field count
    const fieldCount = data[index]
    index++

    const format: IPackedInfo = {}
    for (let i = 0; i < fieldCount; i++) {
        // Decode name
        const nameLen = data[index]
        index++

        const name = decodeString(data.slice(index, index + nameLen))
        index += nameLen

        // Decode type
        const type = packedTypeMap[data[index]]
        index++

        switch (type) {
            case "uint":
            case "number":
            case "address":
            case "double":
            case "boolean":
            case "emptyString":
            case "signature":
            case "byte":
                format[name] = { type }
                break

            case "string":
            case "bytes":
            case "base64": {
                const size = data[index++]

                format[name] = { type, size: size !== 0 ? size : undefined }
                break
            }

            case "object":
            case "hash":
            case "array": {
                const length = Number(decodeUint64(data.slice(index, index + 8)))
                index += 8

                const info = unpackFormat(data.slice(index, index + length))
                index += length

                if (type === "array") {
                    format[name] = { type, info: info.value }
                } else {
                    format[name] = { type, info }
                }

                break
            }
            case "fixed": {
                const length = Number(decodeUint64(data.slice(index, index + 8)))
                index += 8
                const info = data.slice(index, index + length)
                index += length
                format[name] = { type, valueHex: Buffer.from(info).toString("hex") }
                break
            }
        }
    }

    return format
}

export function packData(value: Record<string, any>, format: IPackedInfo, includeType = false): Uint8Array {
    const chunks: Uint8Array[] = []

    if (includeType) {
        const packedFormat = packFormat(format)
        chunks.push(encodeUint64(packedFormat.length))
        chunks.push(packedFormat)
    }

    // Encode the data fields
    for (const [name, type] of Object.entries(format)) {
        const v = value[name]
        if (v === undefined && type.type !== 'fixed') {
            throw new Error(`Key "${name}" missing from value:\n${value.keys}`)
        }

        switch (type.type) {
            case 'object':
                if (v instanceof Object) {
                    chunks.push(packData(v, type.info, false))
                    break
                } else {
                    throw new Error(`${name}: Expected object, got ${v}`)
                }
            case 'hash':
                if (v instanceof Object) {
                    // NOTE: Hashes always refer to the typed version of the data to enable forward compatibility
                    chunks.push(sha256Hash(packData(v, type.info, true)))
                    break
                } else {
                    throw new Error(`${name}: Expected object for hashing, got ${v}`)
                }
            case 'array':
                if (v instanceof Array) {
                    assert(v.length < 128, `Array too large to be encoded: ${v}`)
                    chunks.push(new Uint8Array([v.length]))
                    v.forEach((value) => {
                        chunks.push(packData({ value }, { value: type.info }, false))
                    })
                    break
                } else {
                    throw new Error(`${name}: Expected array, got ${v}`)
                }

            case 'address':
                if (v instanceof Uint8Array) {
                    if (v.length === 20) {
                        const newValue = decodeEthereumAddress(Buffer.from(v).toString("hex"))
                        chunks.push(newValue)
                    } else if (v.length === 32) {
                        chunks.push(v)
                    } else {
                        throw new Error(`Invalid address byte array length ${v.length}, expected 20 or 32`)
                    }
                } else if (typeof v === 'string') {
                    if (ethers.utils.isAddress(v)) {
                        chunks.push(decodeEthereumAddress(v))
                    } else if (isValidAddress(v)) {
                        chunks.push(decodeAddress(v).publicKey)
                    } else {
                        throw new Error(`Invalid address string ${v}`)
                    }
                } else {
                    throw new Error(`${name}: Expected address, got ${v}`)
                }

                break

            case 'bytes':
                if (v instanceof Uint8Array) {
                    if (v.length === type.size) {
                        chunks.push(v)
                        break
                    } else if (type.size === undefined) {
                        chunks.push(encodeDynamicBytes(v))
                        break
                    } else {
                        throw new Error(`${name}: Bytes length is wrong, expected ${type.size}, got ${v.length}`)
                    }
                } else {
                    throw new Error(`${name}: Expected bytes[${type.size}], got ${v}`)
                }
            case 'base64':
                if (typeof v === 'string') {
                    try {
                        const bytes = decodeBase64(v)
                        if (bytes.length === type.size) {
                            chunks.push(bytes)
                            break
                        } else if (type.size === undefined) {
                            chunks.push(encodeDynamicBytes(bytes))
                            break
                        } else {
                            throw new Error(`${name}: Base64 length is wrong, expected ${type.size}, got ${bytes.length}`)
                        }
                    } catch {
                        throw new Error(`${name}: Base64 encoding is wrong, got ${v}`)
                    }
                } else {
                    throw new Error(`${name}: Expected Base64 string, got ${v}`)
                }
            case 'signature':
                if (typeof v === 'string') {
                    const bytes = decodeBase64(v)
                    if (bytes.length < MAX_SIGNATURE_LENGTH) {
                        chunks.push(padRightUint8Array(bytes, MAX_SIGNATURE_LENGTH))
                    } else if (bytes.length === MAX_SIGNATURE_LENGTH) {
                        chunks.push(bytes)
                    } else {
                        throw new Error(`Signature length cannot be greater than ${MAX_SIGNATURE_LENGTH}`)
                    }
                    break
                } else {
                    throw new Error(`${name}: Expected signature to be a base64 string, got ${v}`)
                }
            case 'double':
                if (typeof v === 'number') {
                    const bytes = new ArrayBuffer(8)
                    Buffer.from(bytes).writeDoubleLE(v, 0)
                    chunks.push(new Uint8Array(bytes))
                    break
                } else {
                    throw new Error(`${name}: Expected double, got ${v}`)
                }
            case 'boolean':
                if (typeof v === 'boolean') {
                    chunks.push(new Uint8Array([v ? 1 : 0]))
                    break
                } else {
                    throw new Error(`${name}: Expected boolean, got ${v}`)
                }
            case 'byte':
                if (typeof v === 'bigint' || typeof v === 'number') {
                    chunks.push(encodeUint8(Number(v)))
                    break
                } else {
                    throw new Error(`${name}: Expected uint or number, got ${v}`)
                }
            case 'number':
            case 'uint':
                if (typeof v === 'bigint' || typeof v === 'number') {
                    const length = type.size ?? 8
                    chunks.push(encodeUint(v, length))
                    break
                } else {
                    throw new Error(`${name}: Expected uint or number, got ${v}`)
                }
            case 'string':
                if (typeof v === 'string') {
                    const str = encodeString(v)
                    if (str.length === type.size) {
                        chunks.push(str)
                        break
                    } else if (type.size === undefined) {
                        chunks.push(encodeDynamicBytes(str))
                        break
                    } else {
                        throw new Error(`${name}: Expected string length ${type.size}, got string length ${str.length}`)
                    }
                } else {
                    throw new Error(`${name}: Expected string length ${type.size}, got ${v}`)
                }
            case 'emptyString':
                if (typeof v === 'string') {
                    break
                } else {
                    throw new Error(`${name}: Expected string, got ${v}`)
                }
            case 'fixed':
                chunks.push(decodeBase16(type.valueHex))
                break
        }
    }

    return concatArrays(chunks)
}

export function unpackPartialData(data: Uint8Array, formatOpt?: IPackedInfo, offset = 0): {result: Record<string, any>, bytesRead: number} {

    let format: IPackedInfo
    let index = offset

    // Decode format
    if (formatOpt) {
        format = formatOpt
    } else {
        const length = Number(decodeUint64(data.slice(index, index + 8)))
        index += 8
        format = unpackFormat(data.slice(index, index + length))
        index += length
    }

    // Decode data
    // NOTE: This needs to be an inner function to maintain the index across calls
    const unpackInner = (data: Uint8Array, format: IPackedInfo) => {
        const object: Record<string, any> = {}
        for (const [name, type] of Object.entries(format)) {
            if (index >= data.length) {
                throw new Error(`Unpack data length was not enough for the format provided. Data: ${data}, format: ${JSON.stringify(format)}`)
            }
            let value: any
            switch (type.type) {
                case 'object':
                    value = unpackInner(data, type.info)
                    break
                case 'hash':
                    value = new Uint8Array(data.slice(index, index + SHA256_HASH_LENGTH))
                    index += SHA256_HASH_LENGTH
                    break
                case 'array': {
                    const count = data[index++]
                    value = []
                    for (let i = 0; i < count; i++) {
                        value.push(unpackInner(data, { value: type.info }).value)
                    }
                    break
                }
                case 'address':
                    // FIXME: THIS DOESN'T ENCODE ETHEREUM ADDRESS WE ARE ALL GOING TO DIE
                    value = encodeAddress(data.slice(index, index + 32))
                    index += 32
                    break
                case 'bytes': {
                    let size: number
                    if (type.size === undefined) {
                        size = decodeUint16(data.slice(index, index + 2))
                        index += 2
                    } else {
                        size = type.size
                    }
                    value = new Uint8Array(data.slice(index, index + size))
                    index += size
                    break
                }
                case 'base64': {
                    let size: number
                    if (type.size === undefined) {
                        size = decodeUint16(data.slice(index, index + 2))
                        index += 2
                    } else {
                        size = type.size
                    }
                    value = encodeBase64(data.slice(index, index + size))
                    index += size
                    break
                }
                case 'signature':
                    value = encodeBase64(data.slice(index, index + MAX_SIGNATURE_LENGTH))
                    index += MAX_SIGNATURE_LENGTH
                    break
                case 'double':
                    value = Buffer.from(data.slice(index, index + 8)).readDoubleLE(0)
                    index += 8
                    break
                case 'boolean':
                    value = data.slice(index, index + 1)[0] === 1
                    index += 1
                    break
                case 'number': {
                    const length = type.size ?? 8
                    value = Number(decodeUint(data.slice(index, index + length), length))
                    index += length
                    break
                }
                case 'uint': {
                    const length = type.size ?? 8
                    value = decodeUint(data.slice(index, index + length), length)
                    index += length
                    break
                }
                case 'string': {
                    let size: number
                    if (type.size === undefined) {
                        size = decodeUint16(data.slice(index, index + 2))
                        index += 2
                    } else {
                        size = type.size
                    }

                    value = decodeString(data.slice(index, index + size))
                    index += size
                    break
                }
                case 'emptyString':
                    value = ""
                    break
                case 'fixed':
                    value = decodeBase16(type.valueHex)
                    index += value.length
                    break
                default:
                    throw new Error(`Unknown decode type: ${type}`)
            }

            object[name] = value
        }

        return object
    }

    return {result: unpackInner(data, format), bytesRead: index - offset}
}

export function unpackData(data: Uint8Array, formatOpt?: IPackedInfo): Record<string, any> {
    const partial = unpackPartialData(data, formatOpt)
    if (partial.bytesRead !== data.length) {
        throw new Error(`Data consumed(${partial.bytesRead} bytes) did not match expected (${data.length} bytes) for format\nFormat: ${JSON.stringify(formatOpt)}\nValue: ${Buffer.from(data).toString('hex')}`)
    }
    return partial.result
}

export function decodeC3PyTealDictionary(keys: Uint8Array, values: Uint8Array): Map<AssetId, bigint> {
    const decodedDictionary = new Map<AssetId, bigint> ()

    const numericFields: [string, IPackedInfoAny][] = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }])
    const decodingFields: [string, IPackedInfoAny][] = [
        ...numericFields,
        ['length', { type: 'bytes', size: 1 } ]
    ]
    const decodingInfo = Object.fromEntries(decodingFields)

    const decodedIds = unpackData(keys, decodingInfo)
    const decodedValues = unpackData(values, decodingInfo)
    const lengthIds = decodedIds["length"]
    const lengthValues = decodedValues["length"]
    if (!lengthIds || !lengthValues || lengthIds[0] !== lengthValues[0])
        throw new Error("Deposits dictionary is corrupted")
    for (let i = 0; i < lengthIds[0]; i++)
        decodedDictionary.set(Number(decodedIds[i.toString()]), BigInt(decodedValues[i.toString()]))
    return decodedDictionary
}

export function encodeC3PyTealDictionary(dictionary: Map<AssetId, bigint>): {
    keys: Uint8Array
    values: Uint8Array
} {
    // @NOTE: length should be placed at 120th byte index at the end in the list
    // @NOTE: empty key-value pairs should be encoded as 0 bytes in the list
    // @NOTE: the maximun length of pairs is 15 in the list
    const length = dictionary.size
    const numericFields: [string, IPackedInfoAny][] = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }])
    const encodingFields: [string, IPackedInfoAny][] = [
        ['length', { type: 'bytes', size: 1 } ],
        ...numericFields
    ]
    const encodingInfo = Object.fromEntries(encodingFields)

    const encodedIds: Record<string, any> = {
        "length": Uint8Array.from([length])
    }
    const encodedValues: Record<string, any> = {
        "length": Uint8Array.from([length])
    }
    let i = 0;
    dictionary.forEach((value, key) => {
        encodedIds[i.toString()] = key;
        encodedValues[i.toString()] = value;
        i++;
    })
    while (i < 15) {
        encodedIds[i.toString()] = 0;
        encodedValues[i.toString()] = 0;
        i++;
    }

    const keys = packData(encodedIds, encodingInfo)
    const values = packData(encodedValues, encodingInfo)

    return {
        keys,
        values
    }
}

export function encodeArgArray(params: AlgorandType[]): Uint8Array[] {
    return params.map(param => {
        if (param instanceof Uint8Array)
            return new Uint8Array(param)
        if (typeof param === "string")
            return encodeString(param)
        if (typeof param === "boolean")
            param = BigInt(param ? 1 : 0)
        if (typeof param === "number")
            param = BigInt(param)
        return encodeUint64(param)
    })
}

export function encodeString(value: string | Uint8Array): Uint8Array {
    return new Uint8Array(Buffer.from(value))
}

export function decodeString(value: Uint8Array): string {
    return Buffer.from(value).toString('utf-8')
}

export function decodeState(state: Record<string, Record<string, string>>[], stateMap: IStateMap, errorOnMissing = true): IState {
    const result: IState = {}
    for (const [name, type] of Object.entries(stateMap)) {
        const stateName = encodeBase64(encodeString(name))
        const key = state.find((v: any) => v['key'] === stateName)
        if (errorOnMissing && key === undefined) {
            throw new Error(`Expected key ${name} was not found in state`)
        }

        const value = key ? key['value'][type] : undefined
        if (errorOnMissing && value === undefined) {
            throw new Error(`Expected value for key ${name} was not found in state`)
        }

        const typedValue = type === 'bytes' ? decodeBase64(value ?? '') : BigInt(value ?? '')
        result[name] = typedValue
    }
    return result
}

export function encodeDynamicBytes(value: Uint8Array): Uint8Array {
    return concatArrays([encodeUint16(value.length), value])
}

export function encodeUint(value: number | bigint, length: number): Uint8Array {
    const bigValue = BigInt(value)
    assert(bigValue >= BigInt(0) && bigValue < BigInt(1) << BigInt(length * 8))
    const bytes: Buffer = Buffer.alloc(length)
    for (let index = 0; index < length; index++) {
        bytes[length - index - 1] = Number((bigValue >> BigInt(index * 8)) & BigInt(0xFF))
    }
    return new Uint8Array(bytes)
}

export function decodeUint(value: Uint8Array, length: number): bigint {
    assert(value.length >= length, `Expected at least 8 bytes to decode a uint64, but got ${value.length} bytes\nValue: ${Buffer.from(value).toString('hex')}`)
    let num = BigInt(0)
    for (let index = 0; index < length; index++) {
        num = (num << BigInt(8)) | BigInt(value[index])
    }
    return num
}

export function encodeUint64(value: number | bigint): Uint8Array {
    return encodeUint(value, 8)
}

export function decodeUint64(value: Uint8Array): bigint {
    return decodeUint(value, 8)
}

export function convertUint64toInt64(value: bigint): bigint {
    if (value <= BigInt("0x8000000000000000"))
        return value
    return value - BigInt("0x10000000000000000")
}

export function decodeInt64(value: Uint8Array): bigint {
    return convertUint64toInt64(BigInt(decodeUint64(value)))
}

export function encodeInt64(value: bigint) {
    if (value < BigInt(0))
        value = BigInt("0x10000000000000000") + value
    return encodeUint64(value)
}

export function encodeUint32(value: number): Uint8Array {
    if (value >= 2 ** 32 || value < 0) {
        throw new Error(`Out of bound value in Uint32: ${value}`)
    }
    return new Uint8Array([value >> 24, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF])
}

export function decodeUint32(value: Uint8Array): number {
    // NOTE: The >>> and + are required to meet JS's exciting type rules
    return ((value[0] << 24) >>> 0) + (value[1] << 16) + (value[2] << 8) + value[3]
}

export function decodeInt32(value: Uint8Array): number {
    const decoded = decodeUint32(value)
    if (decoded < 0x80000000)
        return decoded
    return decoded - 0x100000000
}

export function encodeUint16(value: number | bigint): Uint8Array {
    value = Number(value)
    if (value >= 2 ** 16 || value < 0) {
        throw new Error(`Out of bound value in Uint16: ${value}`)
    }
    return new Uint8Array([value >> 8, value & 0xFF])
}

export function decodeUint16(value: Uint8Array): number {
    if (value.length !== 2) {
        throw new Error(`Invalid value length, expected 2, got ${value.length}`)
    }

    return (value[0] << 8) | value[1]
}

export function encodeUint8(value: number): Uint8Array {
    if (value >= 2 ** 8 || value < 0) {
        throw new Error(`Out of bound value in Uint8: ${value}`)
    }

    return new Uint8Array([value])
}

export function decodeUint8(value: Uint8Array): number {
    if (value.length !== 1) {
        throw new Error(`Invalid value length, expected 1, got ${value.length}`)
    }

    return value[0]
}

export function encodeUnsignedVarint(value: number | bigint): Uint8Array {
    value = BigInt(value)

    if (value < 0 || value >= (BigInt(1) << BigInt(64))) {
        throw new Error(`Out of bound value in UnsignedVarint: ${value}`)
    }

    const result: number[] = []
    while (value >= BigInt(0x80)) {
        result.push(Number(value & BigInt(0x7F)) | 0x80)
        value >>= BigInt(7)
    }

    result.push(Number(value))

    return new Uint8Array(result)
}

export function encodeBase16(value: Uint8Array): string {
    return Buffer.from(value).toString('hex')
}

export function decodeBase16(value: string): Uint8Array {
    return Buffer.from(value, 'hex')
}

export function encodeBase64(value: Uint8Array): string {
    return Buffer.from(value).toString('base64')
}

export function decodeBase64(value: string): Uint8Array {
    return Uint8Array.from(Buffer.from(value, 'base64'))
}

export function sha256Hash(arr: sha512.Message): Uint8Array {
    return new Uint8Array(sha512.sha512_256.arrayBuffer(arr))
}

export function encodeApplicationAddress(id: number): UserAddress {
    const APP_ID_PREFIX = Buffer.from('appID');
    const toBeSigned = concatArrays([APP_ID_PREFIX, encodeUint64(BigInt(id))]);
    return encodeAddress(sha256Hash(toBeSigned));
}

function getDelta(response: any, key: string): any | undefined {
    const delta = response['global-state-delta'].find((v: any) => v.key === key)
    if (delta === undefined)
        return undefined
    return delta['value']
}

export function getDeltaUint(response: any, key: string): bigint | undefined {
    const delta = getDelta(response, key)
    if (delta === undefined)
        return undefined
    return BigInt(delta['uint'])
}

export function getDeltaBytes(response: any, key: string): Uint8Array | undefined {
    const delta = getDelta(response, key)
    if (delta === undefined)
        return undefined
    return decodeBase64(delta['bytes'])
}

export function padLeftUint8Array(value: Uint8Array, totalLength: number): Uint8Array {
    if (value.length > totalLength) {
        throw new Error(`Invalid value length, expected ${totalLength} but received ${value.length}`)
    }
    const newArray = new Uint8Array(totalLength)
    newArray.fill(0)
    newArray.set(value, totalLength - value.length)
    return newArray
}

export function padRightUint8Array(value: Uint8Array, totalLength: number): Uint8Array {
    if (value.length > totalLength) {
        throw new Error(`Invalid value length, expected ${totalLength} but received ${value.length}`)
    }
    const newArray = new Uint8Array(totalLength)
    newArray.fill(0)
    newArray.set(value)
    return newArray
}

/*
* Example:
* ethereumAddress = '0x8FEEC332843503209B58100e7D2b91829A82a260'
* return '0000000000000000000000008feec332843503209b58100e7d2b91829a82a260' as Uint8Array
*/
export function decodeEthereumAddress(ethereumAddress: string): Uint8Array {
    if (ethereumAddress.startsWith("0x")) {
        ethereumAddress = ethereumAddress.substring(2)
    }
    return padLeftUint8Array(new Uint8Array(Buffer.from(ethereumAddress, "hex")), 32)
}

export function decodeSolanaAddress(solanaAddress: string): Uint8Array {
    return bs58.decode(solanaAddress)
}

export function base16ToBase64 (hexValue: Hex): Base64 {
    if (hexValue.startsWith("0x")) {
        hexValue = hexValue.slice(2)
    }
    return encodeBase64(decodeBase16(hexValue))
}

export const getAlgorandIdAsString = (asset: bigint | string | number): string => {
    if (typeof asset == "string") return asset
    return Buffer.from(bigIntToBytes(asset, 32)).toString('hex')
}

export const toBigInt = (appId: AppId): bigint => {
    return BigInt(appId.toString());
}

export const zeroPadBytes = (value: string, length: number) => {
    while (value.length < 2 * length) {
        value = "0" + value
    }
    return value
}

export function arrayEqual(arrayA: Uint8Array, arrayB: Uint8Array): boolean {
    return arrayA.length === arrayB.length && arrayA.every((byte, index) => arrayB[index] === byte)
}

export function getChecksum(c3AccountType: Uint8Array, publicKey: Uint8Array): Uint8Array {
    return sha256Hash(concatArrays([C3_CHECKSUM_PREFIX, c3AccountType, publicKey])).slice(SHA256_HASH_LENGTH - C3_CHECKSUM_LENGTH)
}

export function decodeAccountIdFull(accountId: AccountId): { publicKey: Uint8Array, c3AccountType: C3AccountType } {
    let encodedC3AccountType = new Uint8Array()
    let bytes: Uint8Array
    let c3AccountType: C3AccountType
    if (accountId.length === C3_LEGACY_ACCOUNT_ID_LENGTH) {
        const parts = /^C3_([A-Z2-7]+)$/.exec(accountId)
        if (parts === null)
            throw new Error(`Invalid account id ${accountId}`)
        bytes = new Uint8Array(base32.decode.asBytes(parts[1]))
        const EVM_KEY_LENGTH = 20
        const C3_KEY_LENGTH = 32
        if (bytes.slice(0, C3_KEY_LENGTH - EVM_KEY_LENGTH).every(byte => byte === 0)) {
            c3AccountType = C3_ACCOUNT_TYPE_EVM
        } else {
            c3AccountType = C3_ACCOUNT_TYPE_ALGORAND
        }
    } else if (accountId.length === C3_MODERN_ACCOUNT_ID_LENGTH) {
        const parts = /^C3_([0-9A-F][0-9A-F])([A-Z2-7]+)$/.exec(accountId)
        if (parts === null)
            throw new Error(`Invalid account id ${accountId}`)
        c3AccountType = parseInt(parts[1], 16)
        if (!C3_ACCOUNT_TYPES.includes(c3AccountType))
            throw new Error(`Invalid account type ${c3AccountType}`)
        encodedC3AccountType = encodeUint8(c3AccountType)
        bytes = new Uint8Array(base32.decode.asBytes(parts[2]))
    } else {
        throw new Error(`Invalid account id length for ${accountId}`)
    }
    const publicKey = bytes.slice(0, C3_PUBLIC_KEY_LENGTH)
    const checksum = bytes.slice(C3_PUBLIC_KEY_LENGTH)
    if (!arrayEqual(getChecksum(encodedC3AccountType, publicKey), checksum))
        throw new Error(`Invalid checksum for ${accountId}`)
    return { publicKey, c3AccountType }
}

export function decodeAccountId(accountId: AccountId): Uint8Array {
    return decodeAccountIdFull(accountId).publicKey
}

export function isValidAccountId(accountId: AccountId): boolean {
    try {
        decodeAccountId(accountId)
        return true
    } catch {
        return false
    }
}

export function encodeAccountId(publicKey: Uint8Array, chainId: SupportedChainId): AccountId {
    const c3AccountType = CHAIN_ID_TO_ACCOUNT_TYPE[chainId]
    if (publicKey.length !== C3_PUBLIC_KEY_LENGTH)
        throw new Error(`Invalid public key length for ${publicKey}`)
    const useLegacy = c3AccountType === undefined || c3AccountType == C3_ACCOUNT_TYPE_ALGORAND || c3AccountType == C3_ACCOUNT_TYPE_EVM
    const encodedType = useLegacy ? new Uint8Array() : encodeUint8(c3AccountType)
    const checksum = getChecksum(encodedType, publicKey)
    return "C3_" + Buffer.from(encodedType).toString('hex') + base32.encode(concatArrays([publicKey, checksum]))
}

export function algorandAddressToAccountId(address: UserAddress): AccountId {
    return encodeAccountId(decodeAddress(address).publicKey, CHAIN_ID_ALGORAND)
}

export function userAddressToAccountId(address: UserAddress): AccountId {
    const chainId = findChainIdByAddress(address)
    const c3AccountType = CHAIN_ID_TO_ACCOUNT_TYPE[chainId]
    const publicKey = C3_ACCOUNT_TYPE_UTILS[c3AccountType].getPublicKey(address)
    return encodeAccountId(publicKey, chainId)
}

export function accountIdToUserAddress(accountId: AccountId): UserAddress {
    const { publicKey, c3AccountType } = decodeAccountIdFull(accountId)
    return C3_ACCOUNT_TYPE_UTILS[c3AccountType].getAddressByPublicKey(publicKey)
}

export function decodeSignature(encodedSignature: string): Uint8Array {
    const decodedSignature = decodeBase64(encodedSignature)
    const ETH_V_VALUE_INDEX = ETH_SIGNATURE_LENGTH - 1
    const ETH_LEGACY_V_VALUE = 27
    // If we have an Ethereum Signature, we need to ensure the v value is in the legacy format {27, 28}
    // Normally wallets can return the standard mathemathical value of {0, 1} so we need to change it
    // WARNING: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md mentions other set of values
    // based on {0,1} + CHAIN_ID * 2 + 35, so we need to be careful that wallets are not outputting these
    if (decodedSignature.length === ETH_SIGNATURE_LENGTH) {
        if (decodedSignature[ETH_V_VALUE_INDEX] < ETH_LEGACY_V_VALUE) {
            decodedSignature[ETH_V_VALUE_INDEX] += ETH_LEGACY_V_VALUE
        }
    }
    return decodedSignature
}