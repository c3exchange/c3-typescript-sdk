import nock from "nock"
import { AccountId, CHAIN_ID_ALGORAND, MarketId, parseTimestamp } from "@c3exchange/common"
import { getTestBaseUrl} from "../setup";
import { CREATOR_ADDRESS, instruments, marketInfos } from "./mock.resources";
import { toMarketInfoResponse } from "./mock.methods";
import { ParsedUrlQuery } from "querystring"
import { expect } from "chai"

const baseUrl = getTestBaseUrl()

const filteredTestAccountId: AccountId = "2TYQKFT2KQTDIU4EUUUHPP7IBTGPVGL5JAHD2NNWOPPCXCDLFQYHJ"
const filteredTestMarketId: MarketId = marketInfos[0].id

const mockedServer = nock(baseUrl)
    .filteringPath((path) => {
        const splittedPath = path.split("/")
        // Replace the accountId in `/v1/accounts/{accountId}/**` path
        if (splittedPath[0] === "accounts" && !!splittedPath[1]) {
            splittedPath[1] = filteredTestAccountId
        }
        // Replace the marketId in `/v1/accounts/{accountId}/markets/{marketId}` path
        // Noticed that the accountId was replaced before
        if (splittedPath[2] && splittedPath[2] === "markets" && !!splittedPath[3]) {
            splittedPath[3] = filteredTestMarketId
        }
        return splittedPath.join("/")
    })

// Test data
const address = "XROK3OJI5BFYZ4LI3EJJLZNXR5G5BXDRM2455KEZ4ZUTBAOHGFFPMVXFJE";
const nonce = 'ckZv+nU2/gfUs944SEjDbo6xl33wt33jah1lshabpAQ='
const signature = 'J2NrWnYrblUyL2dmVXM5NDRTRWpEYm82eGwzM3d0MzNqYWgxbHNoYWJwQVE9Jw=='
const chainId = CHAIN_ID_ALGORAND;
// Instruments
mockedServer.get("/v1/instruments").reply(200, instruments).persist()

// Markets
mockedServer.get("/v1/markets").reply(200, marketInfos.map(toMarketInfoResponse))
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

// login
mockedServer.get("/v1/login/start").query({ address, chainId })
    .times(2).reply(200, { nonce });

mockedServer.post("/v1/login/complete", { address, chainId, signature })
    .times(2).reply(200, { token: 'jwt token', userId: filteredTestAccountId, accountId: filteredTestAccountId });

mockedServer.post("/v1/logout").reply(200, { success: true });

// accounts.test.ts
mockedServer.get(`/v1/accounts/${filteredTestAccountId}`)
    .reply(200, { id: filteredTestAccountId, owner: address, wallet: { address, chainId }, createdOn: 0 })
mockedServer.get(`/v1/accounts/${filteredTestAccountId}/balance`)
    .reply(200, {
        instrumentsInfo: [],
        portfolioOverview: {
            value: "0",
            availableMargin: "0",
            buyingPower: "0",
            health: "0",
            leverage: "0",
            initialMarginCalculation: {
                isInitialMargin: true,
                support: "0",
                requirement: "0",
                assetInfo: []
            }
        },

    })

mockedServer.get(
    (uri) => uri.endsWith("/limits") && uri.startsWith(`/v1/accounts/${filteredTestAccountId}/markets/`))
    .reply(200, {
        maxBuyOrderSize: "0",
        maxSellOrderSize: "0",
        buyAvailableCash: "0",
        sellAvailableCash: "0",
        buyPoolBalance: "0",
        sellPoolBalance: "0",
    }
)
mockedServer.get(
    (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${filteredTestAccountId}/markets/`))
    .reply(200, [])
mockedServer.get(
    (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${filteredTestAccountId}/markets/`))
    .query({ isOpen: true })
    .reply(200, [])
mockedServer.get(
    (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${filteredTestAccountId}/markets/`))
    .query({ isOpen: false, creator: CREATOR_ADDRESS })
    .reply(200, [])
mockedServer.get(
    (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${filteredTestAccountId}/markets/`))
    .query({ pageSize: 100, offset: 100 })
    .reply(200, [])

const accountOperationPath = `/v1/accounts/${filteredTestAccountId}/operations`
mockedServer.get(accountOperationPath).reply(200, [])
mockedServer.get(accountOperationPath).query({ "types[]": "deposit" }).reply(200, [])
mockedServer.get(accountOperationPath).query({ "types[]": ["deposit", "withdraw"], "statuses[]": "pending" }).reply(200, [])
mockedServer.get(accountOperationPath).query({ idBefore: 0, pageSize: 100 }).reply(200, [{
    id: 0,
    type: "deposit",
    status: "pending",
    amount: "100",
    instrumentId: "BTC",
    groupId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}])

mockedServer.delete((uri)=> {
    return uri.endsWith(`accounts/${filteredTestAccountId}/orders`) })
    .query((q: ParsedUrlQuery)=> {
        const until =  parseTimestamp(q.allOrdersUntil)
        expect(until).to.be.a('number')
        const now = Date.now()
        expect(now).to.be.greaterThanOrEqual(until)
        expect(now - until).to.be.lessThanOrEqual(1000*60)
        expect(q.signature).to.be.a('string')
        return true
    }).reply(200, [])
