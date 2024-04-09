import type { Instrument } from "../entities"
import type { FillId, MarketId, UnixTimestamp } from "../types"

enum AccountSide {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
    BOTH = 'BOTH',
}

interface MarketInfoResponse {
    id: MarketId
    baseInstrument: Instrument
    quoteInstrument: Instrument
    priceIncrement: string
    quantityIncrement: string
    minQuantity: string
    maxQuantity: string
    priceGroupings: string
}

interface MarketStatsResponse {
    id: MarketId
    status: string
    "24hrBar": {
        start: UnixTimestamp
        end: UnixTimestamp
        openPrice: string
        closePrice: string
        highPrice: string
        lowPrice: string
        baseVolume: string
        quoteVolume: string
    }
}

interface MarketBarResponse {
	timestamp: UnixTimestamp,
	open: string,
	close: string,
	high: string,
	low: string,
	baseVolume: string,
	quoteVolume: string,
}

interface OrderbookEntryResponse {
    price: string
    volume: string
}

interface MarketOrderbookResponse {
    id: MarketId
    priceGrouping: string
    bids: OrderbookEntryResponse[]
    asks: OrderbookEntryResponse[]
}

interface MarketTradeResponse {
    fillId: FillId
    marketId: MarketId
    buyOrderId: string
    sellOrderId: string
    tradeOn: UnixTimestamp
    tradeBaseAmount: string
    tradeQuoteAmount: string
    tradeBuyFees: string
    tradeSellFees: string
    tradeBuyBorrow: string,
    tradeBuyRepay: string,
    tradeSellBorrow: string,
    tradeSellRepay: string,
    tradePrice: string
    buyOrderCompleted: boolean
    sellOrderCompleted: boolean
    buyOrderIsTaker: boolean
    groupTxId: string
    status: 'PENDING' | 'SETTLED' | 'FAILED'
}

interface MarketTradeAccountResponse extends MarketTradeResponse {
    accountSide: AccountSide
}

// Array types
type MarketsStatsResponse = Array<MarketStatsResponse>

export type {
    Instrument,
    MarketInfoResponse,
    MarketStatsResponse,
    MarketsStatsResponse,
    MarketBarResponse,
    OrderbookEntryResponse,
    MarketOrderbookResponse,
    MarketTradeResponse,
    MarketTradeAccountResponse,
}
export {
    AccountSide,
}