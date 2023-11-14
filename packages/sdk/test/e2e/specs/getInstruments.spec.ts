import "mocha"
import { expect } from "chai"
import { Instrument } from "@c3exchange/common"
import { sdk, typeAndNotUndefinedForInstruments } from "../helpers/common.helper"


let instruments: Instrument[]
describe.skip("Get Instruments", () => {

    before(async () => {
        instruments = await sdk.getInstruments()
    })

    it("Should Instruments not be empty", () => {
        expect(instruments.length).greaterThan(0)
    })

    it("Should each instrument model be correct", () => {
        instruments.forEach(instrument => {
            typeAndNotUndefinedForInstruments(instrument)
        })
    })

    it('Should exists ALGO, BTC and USDC assets', () => {
        const asaUnitNames = instruments.map(instrument => instrument.asaUnitName)
        expect(asaUnitNames.includes('ALGO')).true
        expect(asaUnitNames.includes('BTC')).true
        expect(asaUnitNames.includes('USDC')).true
    })

})