import { Instrument } from "./interfaces"
import { MarketFee } from "./tools"

export * from "./interfaces"
export * from "./tools"
export * from "./utils"
export * from "./chains"
export * from "./wormhole"
export * from "./internal"
export * from "./contracts"
export * from "./pricecaster"


export const TAKER_FEES = MarketFee.fromDecimal("0.0010") // 0.10 %

export const ALGO_INSTRUMENT: Instrument = {
    id: "ALGO",
    asaId: 0,
    asaDecimals: 6,
    asaName: "Algorand",
    asaUnitName: "ALGO",
    chains: [],
}