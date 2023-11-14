import { ALGO_INSTRUMENT, CHAIN_ID_ETH, Instrument, InstrumentAmount, Market, MarketPrice, InstrumentWithRiskParametersResponse, RiskParametersResponse } from "@c3exchange/common";
import { MarketInfo } from "../../../src/internal/helpers/parser";

const BTC_INSTRUMENT: Instrument = {
    id: "BTC",
    asaId: 21,
    asaName: "Bitcoin",
    asaUnitName: "BTC",
    asaDecimals: 8,
    chains: [],
}
const USDC_INSTRUMENT: Instrument = {
    id: "USDC",
    asaId: 22,
    asaName: "USD Coin",
    asaUnitName: "USDC",
    asaDecimals: 6,
    chains: [{
        chainId: CHAIN_ID_ETH,
        tokenAddress: "0x1c3f1A342c8D9591D9759220d114C685FD1cF6b8",
    }]
}

const BTC_USDC_MARKET: Market = {
    id: "BTC-USDC",
    baseInstrument: BTC_INSTRUMENT,
    quoteInstrument: USDC_INSTRUMENT,
}
const BTC_USDC_MARKET_INFO: MarketInfo = {
    ...BTC_USDC_MARKET,
    priceIncrement: MarketPrice.fromDecimal(BTC_USDC_MARKET, "0.0001"),
    quantityIncrement: InstrumentAmount.fromDecimal(BTC_INSTRUMENT, "0.00001"),
    minQuantity: InstrumentAmount.fromDecimal(BTC_INSTRUMENT, "0.00001"),
    maxQuantity: InstrumentAmount.fromDecimal(BTC_INSTRUMENT, "1000"),
    priceGroupings: MarketPrice.fromDecimal(BTC_USDC_MARKET, "0.001")
}

const ALGO_USDC_MARKET: Market = {
    id: "BTC-USDC",
    baseInstrument: ALGO_INSTRUMENT,
    quoteInstrument: USDC_INSTRUMENT,
}
const ALGO_USDC_MARKET_INFO: MarketInfo = {
    ...ALGO_USDC_MARKET,
    priceIncrement: MarketPrice.fromDecimal(ALGO_USDC_MARKET, "0.01"),
    quantityIncrement: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "0.001"),
    minQuantity: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "1"),
    maxQuantity: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "100000000"),
    priceGroupings: MarketPrice.fromDecimal(ALGO_USDC_MARKET, "1")
}

const ALGO_BTC_MARKET: Market = {
    id: "ALGO_BTC",
    baseInstrument: ALGO_INSTRUMENT,
    quoteInstrument: BTC_INSTRUMENT,
}
const ALGO_BTC_MARKET_INFO: MarketInfo = {
    ...ALGO_BTC_MARKET,
    priceIncrement: MarketPrice.fromDecimal(ALGO_BTC_MARKET, "0.000001"),
    quantityIncrement: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "0.000001"),
    minQuantity: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "0.000001"),
    maxQuantity: InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "1000000"),
    priceGroupings: MarketPrice.fromDecimal(ALGO_BTC_MARKET, "0.00001")
}

const marketInfos: MarketInfo[] = [
    BTC_USDC_MARKET_INFO,
    ALGO_USDC_MARKET_INFO,
    ALGO_BTC_MARKET_INFO,
]

const riskParams: RiskParametersResponse = { margin: "0", haircut: "0"}
const instruments: InstrumentWithRiskParametersResponse[] = [
    {...ALGO_INSTRUMENT,riskParameters: {initial: riskParams , maintenance: riskParams, optUtilization: "0.5"}},
    {...BTC_INSTRUMENT,riskParameters: {initial: riskParams , maintenance: riskParams, optUtilization: "0.5"}},
    {...USDC_INSTRUMENT,riskParameters: {initial: riskParams , maintenance: riskParams, optUtilization: "0.5"}},
]

const CREATOR_ADDRESS = "YHCJOEQE3VND4ELFHZJMTSJWOCNVLQHAWLGYWDDF3YVVOYXPDG54VL62F4"

export {
    marketInfos,
    instruments,
    ALGO_INSTRUMENT,
    BTC_INSTRUMENT,
    USDC_INSTRUMENT,
    BTC_USDC_MARKET,
    BTC_USDC_MARKET_INFO,
    ALGO_USDC_MARKET,
    ALGO_USDC_MARKET_INFO,
    ALGO_BTC_MARKET,
    ALGO_BTC_MARKET_INFO,
    CREATOR_ADDRESS,
}