import {
    MarketId,
    MarketInfoResponse,
    MarketStatsResponse,
    MarketBarResponse,
    MarketOrderbookResponse,
    Granularity,
    UnixTimestamp,
    MarketTrade,
    MarketTradeResponse,
    MarketsStatsResponse,
    ALL_MARKETS_ID,
} from "@c3exchange/common";
import {
    asMarketBar,
    asMarketInfo,
    asMarketOrderbook,
    asMarketStatsInfo,
    MarketBars,
    MarketInfo,
    MarketOrderbook,
    MarketStats
} from "../internal/helpers/parser";
import HttpClient, { QueryParams } from "../internal/utils/http";
import { toMarketTrade } from "../main";

export interface GetBarsQueryParams extends QueryParams {
    granularity: Granularity
    from: UnixTimestamp
    to: UnixTimestamp
    pageSize?: number
}

export interface OrderbookQueryParams extends QueryParams {
    priceGrouping?: string
    pageSize?: number
}

export default class Markets {
    constructor (
        private client: HttpClient,
        private helpers: { findMarketInfoOrFail: (marketId: MarketId) => Promise<MarketInfo>}
    ) {}
    getAll = async (): Promise<MarketInfo[]> => {
        const response = await this.client.get<MarketInfoResponse[]>("/v1/markets")
        return response.map(asMarketInfo)
    }
    getOne = async (marketId: MarketId): Promise<MarketInfo> => {
        const response = await this.client.get<MarketInfoResponse>(`/v1/markets/${marketId}`)
        return asMarketInfo(response)
    }
    getStats = async (marketId: MarketId = ALL_MARKETS_ID): Promise<MarketStats[]> => {
        const response = await this.client.get<MarketsStatsResponse>(`/v1/markets/${marketId}/stats`)
        return Promise.all(
            response.map(async (marketInfoRespose) => asMarketStatsInfo(marketInfoRespose, await this.helpers.findMarketInfoOrFail(marketInfoRespose.id)))
        )
    }
    getBars = async (marketId: MarketId, filters: GetBarsQueryParams): Promise<MarketBars[]> => {
        const { granularity, from, to } = filters
        if (typeof from !== "number" || typeof to !== "number") {
            throw new Error("from/to filters must be numbers")
        }
        if (typeof granularity !== "string" || granularity.length === 0) {
            throw new Error("Invalid granularity filter")
        }
        const response = await this.client.get<MarketBarResponse[]>(`/v1/markets/${marketId}/bars`, filters)
        const marketInfo = await this.helpers.findMarketInfoOrFail(marketId)
        return response.map((bar) => asMarketBar(bar, marketInfo))
    }
    getOrderbook = async (marketId: MarketId, filters?: OrderbookQueryParams): Promise<MarketOrderbook> => {
        if (filters) {
            const {pageSize, priceGrouping} = filters
            if (pageSize && typeof pageSize !== "number") {
                throw new Error("Invalid pageSize filter, must be a number")
            }
            if (priceGrouping && typeof priceGrouping !== "string") {
                throw new Error("Invalid priceGrouping filter, must be a string")
            }
        }
        const response = await this.client.get<MarketOrderbookResponse>(`/v1/markets/${marketId}/orderbook`, filters)
        const marketInfo = await this.helpers.findMarketInfoOrFail(marketId)
        return asMarketOrderbook(response, marketInfo)
    }
    getTrades = async (marketId: MarketId, { pageSize }: { pageSize: number }): Promise<MarketTrade[]> => {
        if (typeof pageSize !== "number") {
            throw new Error("Invalid pageSize filter, must be a number")
        }
        const response = await this.client.get<MarketTradeResponse[]>(`/v1/markets/${marketId}/trades`, { pageSize })
        const marketInfo = await this.helpers.findMarketInfoOrFail(marketId)

        return response.map((trade) => toMarketTrade(trade, marketInfo))
    }
}

export type { Markets }

