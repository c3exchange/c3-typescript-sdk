import { InstrumentAmount } from "./instrumentAmount"

type FixedPoint = bigint
const FIXED_POINT_DIGITS = 40
const FIXED_POINT_DECIMALS = 20
const ALL_ZEROS = "0".repeat(FIXED_POINT_DIGITS)

function tenPower(exp: number): bigint {
    return BigInt("1" + "0".repeat(exp))
}

function removeTrailingZeros(value: string): string {
    while(value.endsWith('0')) {
        value = value.substring(0, value.length - 1)
    }
    return value
}

function fixedPointToDecimal(price: FixedPoint, decimalPoint = FIXED_POINT_DECIMALS): string {
    const negative = price < 0
    const abs = negative ? -price : price
    const paddedLeftResult = (ALL_ZEROS + abs.toString()).slice(-FIXED_POINT_DIGITS)
    const resultWithDecimalPoint = (negative ? "-" : "") + BigInt(paddedLeftResult.slice(0, decimalPoint)).toString() + "." + removeTrailingZeros(paddedLeftResult.slice(decimalPoint))
    if (resultWithDecimalPoint.endsWith('.'))
        return resultWithDecimalPoint.substring(0, resultWithDecimalPoint.length - 1)
    return resultWithDecimalPoint
}

function decimalToFixedPoint(decimal: string, decimalPoint = FIXED_POINT_DECIMALS): FixedPoint {
    const parts = /^(-)?([0-9]+|0)(\.([0-9]+))?$/.exec(decimal)
    if (parts === null)
        throw new Error(`Invalid decimal number ${decimal}`)
    const sign = parts[1] ?? ""
    const integer = parts[2]
    const decimals = parts[4] ?? ""
    if (decimalPoint - decimals.length < 0)
        throw new Error(`Invalid decimal point ${decimalPoint} for decimal ${decimal}`)
    return BigInt(sign + integer + decimals + "0".repeat(decimalPoint - decimals.length))
}

function scaleInstrumentAmount(instrumentAmount: InstrumentAmount,x: number): InstrumentAmount {
    const decimals = instrumentAmount.instrument.asaDecimals
    const fixedPoint = tenPower(decimals)
    const scaledX = decimalToFixedPoint(x.toFixed(decimals),instrumentAmount.instrument.asaDecimals)
    return InstrumentAmount.fromRaw(instrumentAmount.instrument,  scaledX*instrumentAmount.raw/fixedPoint)
}

export {
    tenPower,
    fixedPointToDecimal,
    decimalToFixedPoint,
    scaleInstrumentAmount,
    FIXED_POINT_DECIMALS,
    FIXED_POINT_DIGITS,
}

export type {
    FixedPoint
}