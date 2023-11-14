import "mocha"
import { InstrumentAmount,scaleInstrumentAmount } from "../src/tools"
import { expect } from 'chai'

const ALGO_INSTRUMENT = {
    asaDecimals: 6,
    asaId: 0,
    asaName: "ALGO",
    asaUnitName: "ALGO",
    id: "ALGO",
    chains: [],
}
describe('FixedPoint', () => {

    const ONE = InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "1")

    it('should scale by 0.1 ', () => {
        const scaled = scaleInstrumentAmount(ONE, 0.1)
        expect(scaled.toDecimal()).eq("0.1")
    })

    it('should scale by 10 ', () => {
        const scaled = scaleInstrumentAmount(ONE, 10.1)
        expect(scaled.toDecimal()).eq("10.1")
    })

    it('should scale outside bounds', function() {
        expect(scaleInstrumentAmount(ONE, 0.0000001).toDecimal()).eq("0")
    })


})