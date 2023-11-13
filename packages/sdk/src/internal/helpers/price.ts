import { tenPower, InstrumentAmount, MarketPrice } from "@c3exchange/common"
import { MarketInfo } from "./parser"

interface MarketValidationLimits {
    minBaseAmount: InstrumentAmount
    maxBaseAmount: InstrumentAmount
    incrementBaseAmount: InstrumentAmount
    priceIncrement: MarketPrice
}

function getMarketValidationLimits(market: MarketInfo): MarketValidationLimits {
    const minBaseAmount = market.minQuantity
    const maxBaseAmount = market.maxQuantity
    const incrementBaseAmount = market.quantityIncrement
    const priceIncrement = market.priceIncrement
    return { minBaseAmount, maxBaseAmount, incrementBaseAmount, priceIncrement }
}

function getGroupingPrices(pair: MarketInfo): string[] {
    const multipliers = [BigInt(1), BigInt(2), BigInt(5)]
    const values = []
    for (let i = 0; i < 5; i++) {
        values.push(...multipliers.map(m => pair.priceIncrement.multiplyBy(m * tenPower(i)).toDecimal()))
    }
    return values
}

export type {
    MarketValidationLimits,
}

export {
    getMarketValidationLimits,
    getGroupingPrices
}