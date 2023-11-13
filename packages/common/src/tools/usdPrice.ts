import BigNumber from "bignumber.js"
import { Instrument } from "../interfaces"
import { InstrumentAmount } from "./instrumentAmount"
import { AssetId } from "../interfaces"

export type UsdAmount = BigNumber
export type PicoUsdAmount = bigint

export const PICO_USD_EXPONENT = 12

export class UsdPrice {

    constructor(public readonly price: BigNumber) { }

    static fromOraclePrice(priceExp: number, rawPrice: bigint): UsdPrice {
        return new UsdPrice(fromBigIntAndExponent(rawPrice, priceExp))
    }

    public toUSD(amount: InstrumentAmount): UsdAmount {
        return this.price.times(amount.toDecimal())
    }

    public toScaledPrice(instrument: Instrument): PicoUsdAmount {
        // Return the price as Pico USDs per Asset Micro Unit
        return BigInt(this.price.shiftedBy(PICO_USD_EXPONENT - instrument.asaDecimals).toFixed(0))
    }
}

export function fromBigIntAndExponent(value: bigint, exp: number): BigNumber {
    return BigNumber(value.toString()).shiftedBy(exp)
}

export function toUSDAmount(picoUsdAmount: PicoUsdAmount): UsdAmount {
    return new BigNumber(picoUsdAmount.toString()).shiftedBy(-PICO_USD_EXPONENT)
}

export function toBigIntAndExponent(usdAmount: UsdAmount): [bigint, number] {
    const decimalPlaces = usdAmount.decimalPlaces() ?? 0
    const bigIntValue = BigInt(usdAmount.toFixed().replace('.', ''))
    return [bigIntValue, -decimalPlaces]
}

export type UsdPrices = Map<AssetId, UsdPrice>

export const ZERO_PRICE = new UsdPrice(BigNumber(0))
