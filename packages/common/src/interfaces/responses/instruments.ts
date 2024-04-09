import { InstrumentId } from "../types"
import { Instrument } from "../entities"

interface InstrumentPoolInfoResponse {
    id: InstrumentId
    lendApr: number
    borrowApr: number
    totalLiquidity: string
    totalBorrowed: string
    liquidityThreshold: string
}

interface InstrumentPriceResponse {
    id: InstrumentId
    price: string
}

interface LiquidationPriceResponse {
    id: InstrumentId
    price: string
    borrowPremiumPrice: string
    lendDiscountPrice: string
    cashDiscountPrice: string
}


// Encoded Risk Parameters Response
interface RiskParametersResponse {
    haircut: string
    margin: string
}
// Encoded Instrument Risk Parameters Response
interface InstrumentRiskParametersResponse {
    initial: RiskParametersResponse
    maintenance: RiskParametersResponse
    optUtilization: string
}
interface InstrumentWithRiskParametersResponse extends Instrument{
    slotId: number
    riskParameters: InstrumentRiskParametersResponse
}

export type {
    InstrumentPoolInfoResponse,
    InstrumentPriceResponse,
    InstrumentWithRiskParametersResponse,
    RiskParametersResponse,
    InstrumentRiskParametersResponse,
    LiquidationPriceResponse
}