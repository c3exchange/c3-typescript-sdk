import "mocha"
import { expect } from "chai"
import { testMarketId } from "../setup"
import { MarketId } from "@c3exchange/common"
import { defaultConfig } from "../../../src/config"
import HttpClient from "../../../src/internal/utils/http"
import MarketAPIClient from "../../../src/entities/markets"
import { findMarketInfoOrFail, toMarketInfoResponse } from "../helpers/mock.methods"
import { marketInfos } from "../helpers/mock.resources"
import { mockedServer } from "../helpers/mock.responses"

describe ("Market api client tests", () => {
    const httpClient = new HttpClient(defaultConfig.c3_api.server)
    const marketClient = new MarketAPIClient(httpClient, { findMarketInfoOrFail })
    const marketId: MarketId = testMarketId

    marketInfos.forEach((marketInfo) => {
        mockedServer.get(`/v1/markets/${marketInfo.id}`).reply(200, toMarketInfoResponse(marketInfo)).persist()
        mockedServer.get(`/v1/markets/${marketInfo.id}/stats`).reply(200, [{
            id: marketInfo.id,
            status: "open",
            "24hrBar": {
                start: 100,
                end: 100000,
                openPrice: "20000",
                closePrice: "21000",
                highPrice: "21500",
                lowPrice: "19000",
                baseVolume: "100000",
                quoteVolume: "31230000000",
            }
        }]).persist()
        mockedServer.get(`/v1/markets/${marketInfo.id}/orderbook`).reply(200, {
            id: marketInfo.id,
            priceGrouping: "0.001",
            bids: [],
            asks: [],
        }).persist()
        mockedServer.get(`/v1/markets/${marketInfo.id}/orderbook`).query({
            priceGrouping: "0.000001", pageSize: 1
        }).reply(200, {
            id: marketInfo.id,
            priceGrouping: "0.000001",
            bids: [],
            asks: [],
        }).persist()
        mockedServer.get(`/v1/markets/${marketInfo.id}/bars`).query({
            granularity: "1D",
            from: 100,
            to: 10000
        }).reply(200, [{
            timestamp: 200,
            open: "20000",
            close: "21000",
            high: "21500",
            low: "19000",
            baseVolume: "100000",
            quoteVolume: "31230000000",
        }]).persist()
    })

    it ("Should get all markets", async () => {
        expect(marketClient).itself.to.respondTo("getAll")
    })
    it ("Should get one market", async () => {
        expect(marketClient).itself.to.respondTo("getOne")
        const marketData = await marketClient.getOne(marketId)
        expect(marketData.id).to.be.equal(marketId)
    })
    it ("Should get market stats", async () => {
        expect(marketClient).itself.to.respondTo("getStats")
        const  marketStats = await marketClient.getStats(marketId)
        expect(marketStats[0].id).to.be.equal(marketId)
    })
    describe("Get market orderbook", () => {
        it ("Should get market orderbook with default filters", async () => {
            expect(marketClient).itself.to.respondTo("getOrderbook")
            const marketOrderbook = await marketClient.getOrderbook(marketId)
            expect(marketOrderbook.id).to.be.equal(marketId)
        })
        it ("Should get market orderbook with specific filters", async () => {
            expect(marketClient).itself.to.respondTo("getOrderbook")
            const priceGrouping = "0.000001"
            const marketOrderbook = await marketClient.getOrderbook(marketId, {
                priceGrouping, pageSize: 1
            })
            expect(marketOrderbook.priceGrouping).to.be.equal(priceGrouping)
        })
    })
    it ("Should get market bars", async () => {
        expect(marketClient).itself.to.respondTo("getBars")
        const marketBars = await marketClient.getBars(marketId, {
            granularity: "1D",
            from: 100,
            to: 10000
        })
        expect(marketBars).to.have.lengthOf(1)
    })
})