import { InstrumentAmount, UsdPrice, ContractAmount, PicoUsdAmount, PercentageAmount } from "../tools"
import { InstrumentId, MarketId, AssetId } from "./types"
import { ChainId } from "../wormhole"

interface InstrumentChain {
    chainId: ChainId
    tokenAddress: string
}

interface Instrument {
    id: InstrumentId
    asaId: number
    asaName: string
    asaUnitName: string
    asaDecimals: number
    chains: InstrumentChain[]
}

interface RiskParameters {
    haircut: PercentageAmount
    margin: PercentageAmount
}
interface InstrumentRiskParameters {
    initial: RiskParameters
    maintenance: RiskParameters
    optUtilization: PercentageAmount
}

interface LiquidationPrice {
    price: UsdPrice
    borrowPremiumPrice: UsdPrice
    lendDiscountPrice: UsdPrice
    cashDiscountPrice: UsdPrice
}

interface LiquidationPosition {
    amount: InstrumentAmount
    priceInUsd: UsdPrice
    liquidationPriceInUsd: UsdPrice
}

interface InstrumentWithRiskParameters extends Instrument {
    riskParameters: InstrumentRiskParameters
}

interface PoolParameters {
    optimalUtilization: PercentageAmount
    minRate: PercentageAmount
    optRate: PercentageAmount
    maxRate: PercentageAmount
}

interface InstrumentWithRiskAndPoolParameters extends InstrumentWithRiskParameters {
    poolParameters: PoolParameters
}

interface InstrumentPoolInfo {
    id: InstrumentId
    lendApr: number
    borrowApr: number
    totalLiquidity: InstrumentAmount
    totalBorrowed: InstrumentAmount
    liquidityThreshold: InstrumentAmount
}

interface InstrumentPrices {
    id: InstrumentId
    price: UsdPrice
}

interface Market {
    id: MarketId
    baseInstrument: Instrument
    quoteInstrument: Instrument
}

interface Margin {
    isInitialMargin: boolean,
    support: bigint,
    requirement: bigint,
    unoffsetLiabilities: Map<AssetId, ContractAmount>
    shortfalls: Map<AssetId, ContractAmount>
    prices: Map<AssetId, PicoUsdAmount>
}

export function marketId(baseInstrument: Instrument, quoteInstrument: Instrument): string {
    return `${baseInstrument.asaUnitName}-${quoteInstrument.asaUnitName}`
}

export function createMarket(baseInstrument: Instrument, quoteInstrument: Instrument): Market {
    return {
        id: marketId(baseInstrument, quoteInstrument),
        baseInstrument,
        quoteInstrument,
    }
}

export type {
    Instrument,
    InstrumentWithRiskParameters,
    InstrumentWithRiskAndPoolParameters,
    InstrumentChain,
    InstrumentPoolInfo,
    InstrumentPrices,
    Market,
    RiskParameters,
    PoolParameters,
    InstrumentRiskParameters,
    Margin,
    LiquidationPrice,
    LiquidationPosition
}