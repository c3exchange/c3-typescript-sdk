import { Instrument, UnixTimestamp, Address, PairId, AssetId } from "../interfaces"
import { ContractAmount, InstrumentAmount, MarketPrice } from "../tools"
import { OrderFees } from "./order"


export type Pair = {
    base: Instrument
    quote: Instrument
}

export type PairInfo = Pair & {
    lastPrice: MarketPrice
    priceQuantum: MarketPrice
    amountQuantum: InstrumentAmount
    minTrade: InstrumentAmount
    maxTrade: InstrumentAmount
    externalId: string
    fees: OrderFees
}

export type PairInfoId = PairInfo & {
    pairId: PairId
}

export type PairPrices = {
    pairId: PairId
    // The number of secods in the time slice or period
    period: number
    prevPrice: MarketPrice
    prevPriceOn: UnixTimestamp
    lastPrice: MarketPrice
    lastPriceOn: UnixTimestamp
    minPrice: MarketPrice
    maxPrice: MarketPrice
    baseVolume: InstrumentAmount
    quoteVolume: InstrumentAmount
}

export type UsersHealth = {
    positiveHealth: bigint
    negativeHealth: bigint
}

export type OrderBasicAmount = {
    sell: InstrumentAmount
    buy: InstrumentAmount
}

// This type defines the different settings that can be used tp group orders when presenting them to the users
export type GroupSettings = {
    count?: number
    priceGrouping?: string
}

// This type represents a set of orders grouped in a particular way
export type OrderGroupEntry = {
    price: MarketPrice
    volume: InstrumentAmount
}

export type OrderGroup = {
    buys: OrderGroupEntry[]
    sells: OrderGroupEntry[]
}

export type LiquidationRequest = {
    liquidator: Address
    user: Address
    liabilities: Map<AssetId, ContractAmount>
    collaterals: Map<AssetId, ContractAmount>
}

export type PairPriceRecord = {
	timestamp: number,
	open: string,
	close: string,
	high: string,
	low: string,
	baseVolume: string,
	quoteVolume: string,
}
