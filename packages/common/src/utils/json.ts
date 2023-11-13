import { encodeBase64, decodeBase64 } from "./encoding"
import { InstrumentAmount } from "../tools/instrumentAmount"
import { MarketPrice } from "../tools/marketPrices"
import { UsdPrice } from "../tools/usdPrice"
import BigNumber from "bignumber.js"

export function addUnsupportedDataTypeToObjects(key: string, value: any): any {
    if (value instanceof Map)
        return { dataType: 'Map', value: Array.from(value.entries()) }
    if (typeof value === "bigint")
        return { dataType: 'bigint', value: value.toString() }
    if (value instanceof Uint8Array)
        return { dataType: 'Uint8Array', value: encodeBase64(value) }
    if (value instanceof InstrumentAmount)
        return { dataType: 'InstrumentAmount', value: value.toC3JSON() }
    if (value instanceof MarketPrice)
        return { dataType: 'MarketPrice', value: value.toC3JSON() }
    if (value instanceof UsdPrice)
        return { dataType: 'UsdPrice', value: value.price.toString() }
    return value
}

export const SINGLE_LINE_OUTPUT = true
export function stringifyJSON<T>(entity: T, singleLine:boolean = false): string {

    let message = JSON.stringify(entity, addUnsupportedDataTypeToObjects)
    if(singleLine){
      message = message.replace('\n','')
    }
    return message
}

export function parseUnsupportedDataTypes(key: string, value: any): any {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map')
            return new Map(value.value)
        if (value.dataType === 'bigint')
            return BigInt(value.value)
        if (value.dataType === 'Uint8Array')
            return decodeBase64(value.value)
        if (value.dataType === 'InstrumentAmount')
            return InstrumentAmount.fromC3JSON(value.value)
        if (value.dataType === 'MarketPrice')
            return MarketPrice.fromC3JSON(value.value)
        if (value.dataType === 'UsdPrice')
            return new UsdPrice(new BigNumber(value.value))
    }
    return value
}

export function parseJSON<T>(jsonEntity: string): T {
    return JSON.parse(jsonEntity, parseUnsupportedDataTypes)
}
