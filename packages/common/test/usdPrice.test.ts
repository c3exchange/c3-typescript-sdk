
import 'mocha'
import { expect } from 'chai'
import BigNumber from 'bignumber.js'
import { expectEqBigNumber, testInstrument, testInstrumentC3Json } from './utils'
import { fromBigIntAndExponent, InstrumentAmount, MarketPrice, toBigIntAndExponent, toUSDAmount, UsdPrice } from '../src/tools'
import { Instrument, Market, createMarket } from '../src/interfaces'


describe('UsdPrice', () => {


    it('Use BigNumber to represent usd values', () => {

        // decimal representations: 24309.78750000
        const receivedPriceFromOracle = BigInt('2430978750000')
        const priceExp = -8

        const a1 = fromBigIntAndExponent(receivedPriceFromOracle, priceExp)
        const a2 = new BigNumber('1000.34')
        const a3 = new BigNumber('3.1416')

        const sumResult = a1.plus(a2)
        const timesResult = sumResult.times(a3)

        expect(a1).to.be.deep.equal(new BigNumber("24309.7875"))
        expect(a2).to.be.deep.equal(new BigNumber("1000.34"))
        expect(a3).to.be.deep.equal(new BigNumber("3.1416"))
        expect(sumResult).to.be.deep.equal(new BigNumber("25310.1275"))
        expect(timesResult).to.be.deep.equal(new BigNumber("79514.296554"))

        const [value, exponent] = toBigIntAndExponent(timesResult)
        expect(value).to.be.equal(BigInt("79514296554"))
        expect(exponent).to.be.equal(-6)
    })

    function createInstrument(id: number, decimals: number): Instrument {
        return {
            id: `unit_name_${id}`,
            asaName: `name_${id}`,
            asaUnitName: `unit_name_${id}`,
            asaDecimals: decimals,
            asaId: id,
            // url: `url_${id}`,
            chains: [],
        }
    }

    it('Oracle prices expressed as UsdPrice and how them interact with InstrumentAmounts', () => {
        const receivedPriceFromOracle = BigInt('2430978750000')
        const priceExp = -8
        const usdPrice = UsdPrice.fromOraclePrice(priceExp, receivedPriceFromOracle)

        const c3Instrument = createInstrument(1000, 7)
        expect(usdPrice.toUSD(InstrumentAmount.fromDecimal(c3Instrument, "1")).toString()).to.be.equal('24309.7875')
        expect(usdPrice.toUSD(InstrumentAmount.fromDecimal(c3Instrument, "2.02")).toString()).to.be.equal('49105.77075')
    })

    it('Other possible ways to handle oracle prices', () => {
        const receivedPriceFromOracle = BigInt('2430978750000')
        const priceExp = 8

        const usdInstrumentForPrices = createInstrument(-999, Math.abs(priceExp))
        expect(InstrumentAmount.fromRaw(usdInstrumentForPrices, receivedPriceFromOracle).toDecimal()).to.be.equal('24309.7875') // 24309.78750000 but trailing zeros are removed

        const c3Instrument = createInstrument(1000, 7)
        const c3MarketToUsdPair: Market = createMarket(c3Instrument, usdInstrumentForPrices)

        const c3MarketPriceInUsd_1 =  MarketPrice.fromDecimal(c3MarketToUsdPair, '24309.7875')
        expect(c3MarketPriceInUsd_1.toDecimal()).to.be.equal('24309.7875')

        const c3InstrumentAmount = InstrumentAmount.fromDecimal(c3Instrument, "2.02")

        // Expected: 2.02 * 24309.78750000 = 49105.77075
        expect(c3MarketPriceInUsd_1.baseToQuote(c3InstrumentAmount).toDecimal()).to.be.equal('49105.77075')

        const c3MarketPriceInUsd_2 = MarketPrice.ratio(InstrumentAmount.fromDecimal(c3Instrument, "1"), InstrumentAmount.fromRaw(usdInstrumentForPrices, receivedPriceFromOracle))
        expect(c3MarketPriceInUsd_2.toDecimal()).to.be.equal('24309.7875')
        expect(c3MarketPriceInUsd_2.baseToQuote(c3InstrumentAmount).toDecimal()).to.be.equal('49105.77075')

        const oraclePrice = OraclePrice.create(c3Instrument, priceExp, receivedPriceFromOracle)
        expect(oraclePrice.toUSD(c3InstrumentAmount)).to.be.equal('49105.77075')
        oraclePrice.updatePrice(BigInt('2451090000000'))
        expect(oraclePrice.toUSD(c3InstrumentAmount)).to.be.equal('49512.018')

    })

    class OraclePrice {
        private pairPrice: MarketPrice

        private constructor(private readonly unitBaseAmount: InstrumentAmount, private readonly oracleInstrument: Instrument, rawOraclePrice: bigint) {
            this.pairPrice = OraclePrice.calculatePairPrice(unitBaseAmount, oracleInstrument, rawOraclePrice)
        }

        static create(instrument: Instrument, oraclePriceExp: number, rawOraclePrice: bigint): OraclePrice {
            const oracleInstrument: Instrument = {
                asaId: -instrument.id,
                asaName: `Oracle Asset for ${instrument.asaName}`,
                asaUnitName: `USD for ${instrument.asaUnitName}`,
                asaDecimals: oraclePriceExp,
                id: "",
                chains: [],
            }
            return new OraclePrice(InstrumentAmount.fromDecimal(instrument, "1"), oracleInstrument, rawOraclePrice)
        }

        private static calculatePairPrice(unitBaseAmount: InstrumentAmount, oracleInstrument: Instrument, rawOraclePrice: bigint): MarketPrice {
            return MarketPrice.ratio(unitBaseAmount, InstrumentAmount.fromRaw(oracleInstrument, rawOraclePrice))
        }

        public updatePrice(rawOraclePrice: bigint): void {
            this.pairPrice = OraclePrice.calculatePairPrice(this.unitBaseAmount, this.oracleInstrument, rawOraclePrice)
        }

        public toUSD(amount: InstrumentAmount): string {
            return this.pairPrice.baseToQuote(amount).toDecimal()
        }
    }

    
    describe('Static From Oracle Price', () => {
           
        const rawPrice = BigInt('5200')
        const priceFromOracle = UsdPrice.fromOraclePrice(2, rawPrice)
    
        it('fromOraclePrice 5200', () => {
            expectEqBigNumber(priceFromOracle.price, 1, 5, 520000)
        })

        it('toScaledPrice', () => {
            const scaledPrice = priceFromOracle.toScaledPrice(testInstrument)
            expect(typeof scaledPrice).eq('bigint')
        })

        describe('To Usd', () => {

            it('Instrument Amount From Raw', () => {
                const instrumentAmountFromRaw = InstrumentAmount.fromRaw(testInstrument, BigInt(1000))
                const fromRaw = priceFromOracle.toUSD(instrumentAmountFromRaw)
                expectEqBigNumber(fromRaw, 1, 0, 0)
            })

            it('Instrument Amount From Decimal', () => {
                const instrumentAmountFromDecimal = InstrumentAmount.fromDecimal(testInstrument, "200")
                const fromDecimal = priceFromOracle.toUSD(instrumentAmountFromDecimal)
                expectEqBigNumber(fromDecimal, 1, 0, 0)
            })

            it('Instrument Amount From DB', () => {
                const instrumentAmountFromDB = InstrumentAmount.fromDB(testInstrument, "200")
                const fromDB = priceFromOracle.toUSD(instrumentAmountFromDB)
                expectEqBigNumber(fromDB, 1, 0, 0)
            })

            it('Instrument Amount From C3JSON', () => {
                const instrumentAmountFromC3JSON = InstrumentAmount.fromC3JSON(testInstrumentC3Json)
                const fromC3JSON = priceFromOracle.toUSD(instrumentAmountFromC3JSON)
                expectEqBigNumber(fromC3JSON, 1, 0, 0)
            })

            it('Instrument Amount From Contract', () => {
                const instrumentAmountFromContract = InstrumentAmount.fromContract(testInstrument, BigInt(100))
                const fromContract = priceFromOracle.toUSD(instrumentAmountFromContract)
                expectEqBigNumber(fromContract, 1, 0 ,0)
            })

        })

        it('fromBigIntAndExponent', () => {
            const ex = Math.floor(Math.random() * 10)
            const obtainedResult = fromBigIntAndExponent(BigInt(5), ex)
            const cToString = (obtainedResult.c?.shift())?.toString()
            expect((cToString?.match(/0/g) || []).length).eq(ex)
            expect(obtainedResult.s).eq(1)
            expect(obtainedResult.e).eq(ex)

        })

        it('toUSDAmount', () => {
            const ex = Math.floor(Math.random() * 10)
            const amount = parseInt('1'+'0'.repeat(ex))
            const obtainedResult = toUSDAmount(BigInt(amount))
            
            const baseE = -12
            const expectedE = baseE + ex
            expect(obtainedResult.e).eq(expectedE)
            
            const baseC = 2
            const cToString = (obtainedResult.c?.shift())?.toString()
            expect((cToString?.match(/0/g) || []).length).eq(ex + baseC)
        })

        it('toBigIntAndExponent', () => {
            const obtainedResult = toBigIntAndExponent(BigNumber('10.57'))
            
            const bigIntValue = obtainedResult[0]
            expect(bigIntValue).eq(BigInt(1057))
            
            const decimalPlaces = obtainedResult[1]
            expect(decimalPlaces).eq(-2)
        })

    })

})