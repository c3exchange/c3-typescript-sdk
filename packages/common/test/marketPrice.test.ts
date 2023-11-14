import "mocha"
import { expect } from "chai"
import { MarketPrice } from "../src/tools"
import { ALGO_INSTRUMENT } from "../src"
import { Market, createMarket } from "../src/interfaces/entities"
import { testInstrument } from "./utils"

describe("Market Price tests", () => {
    const market: Market = createMarket(testInstrument, ALGO_INSTRUMENT)

    it("Should create MarketPrice from price", () => {
        const price = "100"
        const marketPrice = MarketPrice.fromDecimal(market, price)
        expect(marketPrice.toDecimal()).to.be.equal(price)
    })

    it("Should create MarketPrice from raw", () => {
        const rawPrice = BigInt(100)
        const marketPrice = MarketPrice.fromRaw(market, rawPrice)
        expect(marketPrice.raw).to.be.equal(rawPrice)
    })

    it("Should create MarketPrice from DB", () => {
        const rawPrice = BigInt(100)
        const marketPrice = MarketPrice.fromDB(market, rawPrice.toString())
        expect(marketPrice.toDB()).to.be.equal(rawPrice)
    })

    it("Should create MarketPrice from C3JSON", () => {
        const c3jsonValue = `{"market":{"id":"FI-ALGO","baseInstrument":{"id":"fakeInstrumentId","asaId":123,"asaName":"FAKE-INSTRUMENT","asaUnitName":"FI","asaDecimals":5,"chains":[]},"quoteInstrument":{"id":"ALGO","asaId":0,"asaDecimals":6,"asaName":"Algorand","asaUnitName":"ALGO", "chains":[]}},"price":"0.0000000000000000001"}`
        const rawPrice = BigInt(100)
        const marketPrice = MarketPrice.fromDB(market, rawPrice.toString())
        expect(marketPrice).to.be.deep.equal(MarketPrice.fromC3JSON(c3jsonValue))
    })
})