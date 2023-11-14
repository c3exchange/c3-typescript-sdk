import { expect } from "chai"
import { localTestConfig } from "../setup"
import { C3SDK, MarketInfo, MarketOrderbook, MarketStats } from "../../../src"
import { Instrument, InstrumentAmount, MarketPrice } from "@c3exchange/common/src"

export const sdk = new C3SDK(localTestConfig)

export const typeofAndNotUndefined = (obtainedResult: any, expectedType: string) => {
    expect(obtainedResult).not.undefined
    expect(typeof obtainedResult).eq(expectedType)
}

type Spect_Setup = {
    obtainedResult: any,
    expectedType: string
}

const typeofAndNotUndefinedForArray = (specsSetup: Spect_Setup[]) => {
    specsSetup.forEach((spec: Spect_Setup) => {
        typeofAndNotUndefined(spec.obtainedResult, spec.expectedType)
    })
}

export const typeAndNotUndefinedForInstruments = (obtainedInstrument: Instrument) => {
    const specSetup = [
        {obtainedResult: obtainedInstrument.id, expectedType: 'string'},
        {obtainedResult: obtainedInstrument.asaId, expectedType: 'number'},
        {obtainedResult: obtainedInstrument.asaName, expectedType: 'string'},
        {obtainedResult: obtainedInstrument.asaUnitName, expectedType: 'string'},
        {obtainedResult: obtainedInstrument.asaDecimals, expectedType: 'number'}
    ]
    typeofAndNotUndefinedForArray(specSetup)
}

const typeofAndNotUndefinedForMarketPrices = (priceIncrement: MarketPrice) => {
    typeAndNotUndefinedForInstruments(priceIncrement.market.baseInstrument)
    typeAndNotUndefinedForInstruments(priceIncrement.market.quoteInstrument)
    expect(typeof priceIncrement.raw).eq('bigint')
}

const typeofAndNotUndefinedForInstrumentAmount = (obtainedInstrumentAmount: InstrumentAmount) => {
    typeAndNotUndefinedForInstruments(obtainedInstrumentAmount.instrument)
    expect(typeof obtainedInstrumentAmount.raw).eq('bigint')
}

export const marketInfoSpec = (obtainedMarketInfo: MarketInfo) => {
    typeofAndNotUndefined(obtainedMarketInfo.id, 'string')
    typeAndNotUndefinedForInstruments(obtainedMarketInfo.baseInstrument)
    typeAndNotUndefinedForInstruments(obtainedMarketInfo.quoteInstrument)
    typeofAndNotUndefinedForMarketPrices(obtainedMarketInfo.priceIncrement)
    typeofAndNotUndefinedForInstrumentAmount(obtainedMarketInfo.quantityIncrement)
    typeofAndNotUndefinedForInstrumentAmount(obtainedMarketInfo.minQuantity)
    typeofAndNotUndefinedForInstrumentAmount(obtainedMarketInfo.maxQuantity)
    typeofAndNotUndefinedForMarketPrices(obtainedMarketInfo.priceGroupings)
}

export const marketStatSpec = (obtainedMarketStat: MarketStats) => {
    typeofAndNotUndefined(obtainedMarketStat.id, 'string')
    typeofAndNotUndefined(obtainedMarketStat.status, 'string')
    typeofAndNotUndefined(obtainedMarketStat['24hrBar'].start, 'number')
    typeofAndNotUndefined(obtainedMarketStat["24hrBar"].end, 'number')
    typeofAndNotUndefinedForMarketPrices(obtainedMarketStat['24hrBar'].openPrice)
    typeofAndNotUndefinedForMarketPrices(obtainedMarketStat['24hrBar'].closePrice)
    typeofAndNotUndefinedForMarketPrices(obtainedMarketStat['24hrBar'].highPrice)
    typeofAndNotUndefinedForMarketPrices(obtainedMarketStat['24hrBar'].lowPrice)
    typeofAndNotUndefinedForInstrumentAmount(obtainedMarketStat['24hrBar'].baseVolume)
    typeofAndNotUndefinedForInstrumentAmount(obtainedMarketStat['24hrBar'].quoteVolume)
}

export const marketOrderbookSpec = (obtainedMarketOrderbook: MarketOrderbook) => {
    typeofAndNotUndefined(obtainedMarketOrderbook.id, 'string')
    typeofAndNotUndefined(obtainedMarketOrderbook.priceGrouping, 'string')
    const reg = new RegExp(/^\d+\.\d+$|^\d+$/)
    expect(reg.test(obtainedMarketOrderbook.priceGrouping)).true
    expect(obtainedMarketOrderbook.bids.length >= 0).true
    expect(obtainedMarketOrderbook.asks.length >= 0).true
}

export const callWithAllMarketsIds = async (marketsIds: string[], call: (param: string) => any) => {
    const responses = await Promise.all(marketsIds.map(marketId => {
        const res = call(marketId)
        return res
    }))
    return responses
}