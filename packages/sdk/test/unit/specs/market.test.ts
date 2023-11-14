import "mocha"
import { expect } from "chai"
import "../helpers/mock.responses"
import { testMarketId } from "../setup"
import { MarketId } from "@c3exchange/common"
import { defaultConfig } from "../../../src/config"
import HttpClient from "../../../src/internal/utils/http"
import MarketAPIClient from "../../../src/entities/markets"
import { findMarketInfoOrFail } from "../helpers/mock.methods"


describe ("Market api client tests", () => {
    const httpClient = new HttpClient(defaultConfig.c3_api.server)
    const marketClient = new MarketAPIClient(httpClient, { findMarketInfoOrFail })
    const marketId: MarketId = testMarketId

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