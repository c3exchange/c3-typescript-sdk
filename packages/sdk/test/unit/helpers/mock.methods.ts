import { MarketId, MarketInfoResponse } from "@c3exchange/common";
import { MarketInfo } from "../../../src/internal/helpers/parser";
import { marketInfos } from "./mock.resources";


export async function findMarketInfoOrFail(marketId: MarketId): Promise<MarketInfo> {
    const marketInfo = marketInfos.find((market) => market.id === marketId)
    if (!marketInfo) {
        throw new Error(`Market with id ${marketId} not found`)
    }

    return marketInfo
}

export function toMarketInfoResponse (marketInfo: MarketInfo): MarketInfoResponse {
    return {
        id: marketInfo.id,
        baseInstrument: marketInfo.baseInstrument,
        quoteInstrument: marketInfo.quoteInstrument,
        priceIncrement: marketInfo.priceIncrement.toDecimal(),
        quantityIncrement: marketInfo.quantityIncrement.toDecimal(),
        minQuantity: marketInfo.minQuantity.toDecimal(),
        maxQuantity: marketInfo.maxQuantity.toDecimal(),
        priceGroupings: marketInfo.priceGroupings.toDecimal(),
    }
}