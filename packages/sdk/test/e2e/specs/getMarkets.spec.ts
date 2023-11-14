import "mocha"
import { expect } from "chai"
import Markets from "../../../src/entities/markets"
import { MarketInfo, MarketOrderbook, MarketStats } from "../../../src"
import { callWithAllMarketsIds, marketInfoSpec, marketOrderbookSpec, marketStatSpec, sdk } from "../helpers/common.helper"

describe.skip('Get Markets', () => {
    
    let markets: Markets
    let allMarkets: MarketInfo[]
    let marketsIds: string[]

    before(async () => {
        markets = sdk.getMarkets()
        allMarkets = await markets.getAll()
        marketsIds = allMarkets.map(market => market.id)
    })

    describe('Get All markets', () => {
        
        it('Should All Markets not be empty', () => {
            expect(allMarkets.length).greaterThan(0)
        })
        
        it('Should each market model be correct', () => {
            allMarkets.forEach(market => {
                marketInfoSpec(market)
            })
        })
        
    })
    
    describe('Get One Market', () => {

        let marketsGetOne: MarketInfo[]

        before(async () => {
            marketsGetOne = await callWithAllMarketsIds(marketsIds, markets.getOne)
        })

        it('Should each market model be correct', async () => {
            marketsGetOne.forEach((marketGetOne: MarketInfo) => {
                marketInfoSpec(marketGetOne)
            })
        })

        xit('Invalid Market ID', async () => {
            // Implement once the errors are implemented
        })

    })

    describe('Get Stats', () => {

        let marketsStats: MarketStats[]

        before(async () => {
            marketsStats = await callWithAllMarketsIds(marketsIds, markets.getStats)
        })

        it('Should each stat model be correct', async () => {
            marketsStats.forEach((marketStat: MarketStats) => {
                marketStatSpec(marketStat)
            })
        })

        xit('Invalid Market ID', async () => {
            // Implement once the errors are implemented
        })

    })

    describe('Get Bars', () => {

        let marketOrderbooks: MarketOrderbook[]

        before(async () => {
            marketOrderbooks = await callWithAllMarketsIds(marketsIds, markets.getOrderbook)
        })

        it('Should each stat model be correct', async () => {
            marketOrderbooks.forEach((marketOrderbook: MarketOrderbook) => {
                marketOrderbookSpec(marketOrderbook)
            })
        })
    })

})