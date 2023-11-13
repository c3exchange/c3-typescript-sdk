import {
    Instrument,
    MarketInfoResponse,
    MarketPrice,
    InstrumentAmount,
    Market,
    MarketId,
    MarketStatsResponse,
    UnixTimestamp,
    MarketBarResponse,
    MarketOrderbookResponse,
    InstrumentRiskParameters,
    InstrumentWithRiskParameters,
    InstrumentWithRiskParametersResponse,
    RiskParameters,
    RiskParametersResponse,
    PercentageAmount,
    Margin,
    MarginResponse,
    InstrumentRiskParametersResponse,
} from "@c3exchange/common"

interface MarketInfo extends Market {
    priceIncrement: MarketPrice
    quantityIncrement: InstrumentAmount
    minQuantity: InstrumentAmount
    maxQuantity: InstrumentAmount
    priceGroupings: MarketPrice
}

function asMarketInfo (response: MarketInfoResponse): MarketInfo {
    const market: Market = {
        id: response.id,
        baseInstrument: response.baseInstrument,
        quoteInstrument: response.quoteInstrument
    }
    return {
        ...market,
        priceIncrement: MarketPrice.fromDecimal(market, response.priceIncrement),
        quantityIncrement: InstrumentAmount.fromDecimal(response.baseInstrument, response.quantityIncrement),
        minQuantity: InstrumentAmount.fromDecimal(response.baseInstrument, response.minQuantity),
        maxQuantity: InstrumentAmount.fromDecimal(response.baseInstrument, response.maxQuantity),
        priceGroupings: MarketPrice.fromDecimal(market, response.priceGroupings),
    }
}

interface MarketStats {
    id: MarketId;
    status: string;
    "24hrBar": {
        start: UnixTimestamp;
        end: UnixTimestamp;
        openPrice: MarketPrice;
        closePrice: MarketPrice;
        highPrice: MarketPrice;
        lowPrice: MarketPrice;
        baseVolume: InstrumentAmount;
        quoteVolume: InstrumentAmount;
    };
}

function asMarketStatsInfo (response: MarketStatsResponse, marketInfo: MarketInfo): MarketStats {
    const market: Market = marketInfo
    return {
        id: response.id,
        status: response.status,
        "24hrBar": {
            start: response["24hrBar"].start,
            end: response["24hrBar"].end,
            openPrice: MarketPrice.fromDecimal(market, response["24hrBar"].openPrice),
            closePrice: MarketPrice.fromDecimal(market, response["24hrBar"].closePrice),
            highPrice: MarketPrice.fromDecimal(market, response["24hrBar"].highPrice),
            lowPrice: MarketPrice.fromDecimal(market, response["24hrBar"].lowPrice),
            baseVolume: InstrumentAmount.fromDecimal(market.baseInstrument, response["24hrBar"].baseVolume),
            quoteVolume: InstrumentAmount.fromDecimal(market.quoteInstrument, response["24hrBar"].quoteVolume),
        }
    }
}

interface MarketBars {
    timestamp: UnixTimestamp;
    open: MarketPrice;
    close: MarketPrice;
    high: MarketPrice;
    low: MarketPrice;
    baseVolume: InstrumentAmount;
    quoteVolume: InstrumentAmount;
}

function asMarketBar (bar: MarketBarResponse, marketInfo: MarketInfo): MarketBars {
    const market: Market = marketInfo
    return {
        timestamp: bar.timestamp,
        open: MarketPrice.fromDecimal(market, bar.open),
        close: MarketPrice.fromDecimal(market, bar.close),
        high: MarketPrice.fromDecimal(market, bar.high),
        low: MarketPrice.fromDecimal(market, bar.low),
        baseVolume: InstrumentAmount.fromDecimal(market.baseInstrument, bar.baseVolume),
        quoteVolume: InstrumentAmount.fromDecimal(market.quoteInstrument, bar.quoteVolume),
    }
}

interface OrderbookEntry {
    price: MarketPrice
    volume: InstrumentAmount
}

interface MarketOrderbook {
    id: MarketId
    priceGrouping: string
    bids: OrderbookEntry[]
    asks: OrderbookEntry[]
}

function asMarketOrderbook (response: MarketOrderbookResponse, marketInfo: MarketInfo): MarketOrderbook {
    const market: Market = marketInfo
    return {
        id: response.id,
        priceGrouping: response.priceGrouping,
        bids: response.bids.map((bid) => ({ price: MarketPrice.fromDecimal(market, bid.price), volume: InstrumentAmount.fromDecimal(market.baseInstrument, bid.volume)})),
        asks: response.asks.map((ask) => ({ price: MarketPrice.fromDecimal(market, ask.price), volume: InstrumentAmount.fromDecimal(market.baseInstrument, ask.volume)})),
    }
}

function asRiskParameters( riskParametersResponse: RiskParametersResponse) : RiskParameters{
    return {
        haircut: PercentageAmount.fromDecimal(riskParametersResponse.haircut),
        margin: PercentageAmount.fromDecimal(riskParametersResponse.margin),
    }
}

function asInstrumentRiskParameters( instrumentRiskParametersResponse: InstrumentRiskParametersResponse) : InstrumentRiskParameters{
    return {
        initial: asRiskParameters(instrumentRiskParametersResponse.initial),
        maintenance: asRiskParameters(instrumentRiskParametersResponse.maintenance),
        optUtilization: PercentageAmount.fromDecimal(instrumentRiskParametersResponse.optUtilization),
    }
}
function asInstrumentWithRiskParameters( instrumentResponse: InstrumentWithRiskParametersResponse) : InstrumentWithRiskParameters{
    const instrument = instrumentResponse as Instrument
    return {
        ...instrument,
        riskParameters: asInstrumentRiskParameters(instrumentResponse.riskParameters),
    }
}

function asMargin(marginRespose: MarginResponse): Margin {
    const margin: Margin = {
        isInitialMargin: marginRespose.isInitialMargin,
        support: BigInt(marginRespose.support),
        requirement: BigInt(marginRespose.requirement),
        unoffsetLiabilities: new Map(),
        shortfalls: new Map(),
        prices: new Map(),
    }
    for (const info of marginRespose.assetInfo) {
        const assetId = info.assetId
        margin.prices.set(assetId, BigInt(info.price))
        margin.shortfalls.set(assetId, BigInt(info.shortfall))
        margin.unoffsetLiabilities.set(assetId, BigInt(info.unoffsetLiability))
    }
    return margin
}

export type {
    MarketInfo,
    MarketStats,
    MarketBars,
    OrderbookEntry,
    MarketOrderbook,
}

export {
    asMarketInfo,
    asMarketStatsInfo,
    asMarketBar,
    asMarketOrderbook,
    asInstrumentWithRiskParameters,
    asMargin
}