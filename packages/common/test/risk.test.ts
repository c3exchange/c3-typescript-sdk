import BigNumber from "bignumber.js"
import { expect } from "chai"
import {
    Instrument,
    InstrumentAmount,
    InstrumentAmountMap,
    InstrumentWithRiskParameters,
    InstrumentWithRiskAndPoolParameters,
    NetUserPosition,
    Margin,
    UsdPrice,
    MarketPrice,
    Market,
    marginWithoutOrders,
    availableForTrade,
    availableForTradePriceAdjusted } from "../src/index"
import { PercentageAmount } from "../src/tools/percentageAmount"


const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
const ETH: Instrument = { asaName: "ETH", asaDecimals: 6, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
const ETH_USD : Market = {id: "ETH_USD", baseInstrument: ETH, quoteInstrument: USDC }
// Parameters taken from Risk Spreadsheet
// https://docs.google.com/spreadsheets/d/1uRVAb-bqT3g8hQPEKaIlBZXF7LmpL6Oz1NzWDKAfeIc/edit#gid=0
const USDC_RiskParameters: InstrumentWithRiskParameters = {
    ...USDC,
    riskParameters: {
        initial: { haircut: PercentageAmount.zero(), margin: PercentageAmount.zero()},
        maintenance: {haircut: PercentageAmount.zero(), margin: PercentageAmount.zero()},
        optUtilization: PercentageAmount.fromDB(BigInt(800))
    }
}
const haircut = PercentageAmount.fromDB(BigInt(290))
const ETH_RiskParameters: InstrumentWithRiskParameters = {
    ...ETH,
    riskParameters:{
        initial: { haircut, margin: PercentageAmount.fromDB(BigInt(400))},
        maintenance: {haircut, margin: PercentageAmount.fromDB(BigInt(400))},
        optUtilization: PercentageAmount.fromDB(BigInt(450))
    }
}

describe('availableForTrade', () => {

    it(' Buy AVAX with only USDC should give some margin', () => {
        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const AVAX: Instrument = { asaName: "AVAX", asaDecimals: 8, asaId: 3, asaUnitName: "AVAX", id: "AVAX", chains: [] }
        const AVAX_USD : Market = {id: "AVAX_USD", baseInstrument: AVAX, quoteInstrument: USDC }
        // Parameters taken from Risk Spreadsheet
        // https://docs.google.com/spreadsheets/d/1uRVAb-bqT3g8hQPEKaIlBZXF7LmpL6Oz1NzWDKAfeIc/edit#gid=0
        const sameRiskParameters = {
            initial: { haircut: PercentageAmount.fromDecimal("0.15"), margin: PercentageAmount.fromDecimal("0.15")},
            maintenance: {haircut: PercentageAmount.fromDecimal("0.15"), margin: PercentageAmount.fromDecimal("0.15")},
            optUtilization: PercentageAmount.fromDB(BigInt(666))
        }
        const USDC_RiskParameters: InstrumentWithRiskParameters = {
            ...USDC,
            riskParameters:sameRiskParameters
        }

        const AVAX_RiskParameters: InstrumentWithRiskParameters = {
            ...AVAX,
            riskParameters:sameRiskParameters
        }
        const instrumentsWithParameters = [USDC_RiskParameters,AVAX_RiskParameters]
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [AVAX.asaId, InstrumentAmount.fromDecimal(AVAX, "119")],
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "3")]
            ]),
            cashBalance: new InstrumentAmountMap([
                [AVAX.asaId, InstrumentAmount.fromDecimal(AVAX, "119")],
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "3")]
            ]),
            poolBalance: new InstrumentAmountMap()
        }

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [AVAX.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(AVAX)],
            ]),
            isInitialMargin: true,
            support:  102751819050000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }
        const price = MarketPrice.fromDecimal(AVAX_USD,"1")
        const maxTrade = availableForTradePriceAdjusted(USDC_RiskParameters,AVAX_RiskParameters,marginCalculation,price,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"1")).toDecimal()).to.equal("345")
    })
    //18700000000000

    it(' Buy AVAX with only USDC - Avax Price is 2', () => {
        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const AVAX: Instrument = { asaName: "AVAX", asaDecimals: 8, asaId: 3, asaUnitName: "AVAX", id: "AVAX", chains: [] }
        const AVAX_USD : Market = {id: "AVAX_USD", baseInstrument: AVAX, quoteInstrument: USDC }
        // Parameters taken from Risk Spreadsheet
        // https://docs.google.com/spreadsheets/d/1uRVAb-bqT3g8hQPEKaIlBZXF7LmpL6Oz1NzWDKAfeIc/edit#gid=0
        const sameRiskParameters = {
            initial: { haircut: PercentageAmount.fromDecimal("0.15"), margin: PercentageAmount.fromDecimal("0.15")},
            maintenance: {haircut: PercentageAmount.fromDecimal("0.15"), margin: PercentageAmount.fromDecimal("0.15")},
            optUtilization: PercentageAmount.fromDB(BigInt(666))
        }
        const USDC_RiskParameters: InstrumentWithRiskParameters = {
            ...USDC,
            riskParameters:sameRiskParameters
        }

        const AVAX_RiskParameters: InstrumentWithRiskParameters = {
            ...AVAX,
            riskParameters:sameRiskParameters
        }

        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [AVAX.asaId, InstrumentAmount.fromDecimal(AVAX, "10")],
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "2")]
            ]),
            cashBalance: new InstrumentAmountMap([
                [AVAX.asaId, InstrumentAmount.fromDecimal(AVAX, "10")],
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "2")]
            ]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [AVAX.asaId, new UsdPrice(new BigNumber("2.0")).toScaledPrice(AVAX)],
            ]),
            isInitialMargin: true,
            support:  18700000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }
        const price = MarketPrice.fromDecimal(AVAX_USD,"4")
        // Implicit price is 1 and wanting to buy AVAX at 2 which would result in pnl loss for borrowed position
        const maxTrade = availableForTradePriceAdjusted(USDC_RiskParameters,AVAX_RiskParameters,marginCalculation,price,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"1")).toDecimal()).to.equal("26")
    })

    it(' Buy ETH with only USDC should give some margin', () => {
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [ETH.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(ETH)],
            ]),
            isInitialMargin: true,
            support:  10000000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }
        const maxTrade = availableForTrade(USDC_RiskParameters,ETH_RiskParameters,marginCalculation,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"0.01")).toDecimal()).to.equal("34.48")
    })

    it(' Buy ETH with only USDC should give some margin - with neutral order price', () => {
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [ETH.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(ETH)],
            ]),
            isInitialMargin: true,
            support:  10000000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }

        // We use same implicit price as in the oracle prices pxUSDC = pxETH = 1
        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1")
        const maxTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,marginCalculation,orderPrice,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"0.01")).toDecimal()).to.equal("34.48")
    })

    it(' Buy ETH with only USDC should give some margin - with order price', () => {
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [ETH.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(ETH)],
            ]),
            isInitialMargin: true,
            support:  10000000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }

        // We use same implicit price as in the oracle prices pxUSDC = pxETH = 1
        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1.1")
        const maxTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,marginCalculation,orderPrice,userPosition)
        const maxTrade2 = availableForTrade(USDC_RiskParameters,ETH_RiskParameters,marginCalculation,userPosition)
        expect(maxTrade2.greaterThan(maxTrade))
    })

    it(' All prices one with borrow', () => {
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "-2")]])
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [ETH.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(ETH)],
            ]),
            isInitialMargin: true,
            support:  8000000000000n,
            requirement: BigInt(0n),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }

        // We use same implicit price as in the oracle prices pxUSDC = pxETH = 1
        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1")
        const maxTradeNew = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,marginCalculation,orderPrice,userPosition)
        expect(maxTradeNew.prevMultiple(InstrumentAmount.fromDecimal(maxTradeNew.instrument,"0.01")).toDecimal()).to.equal("27.58")
        const maxTradeInv = availableForTradePriceAdjusted(ETH_RiskParameters,USDC_RiskParameters,marginCalculation,orderPrice,userPosition)
        expect(maxTradeInv.prevMultiple(InstrumentAmount.fromDecimal(maxTradeNew.instrument,"0.01")).toDecimal()).to.equal("20")

    })

    it(' Sell ETH with only USDC should give some margin', () => {
        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [ETH.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(ETH)],
            ]),
            isInitialMargin: true,
            support:  10000000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }
        const maxTrade = availableForTrade(ETH_RiskParameters,USDC_RiskParameters,marginCalculation,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"0.01")).toDecimal()).to.equal("25")
    })

    it(' AVAX-USDC should give some margin', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const AVAX: Instrument = { asaName: "AVAX", asaDecimals: 8, asaId: 3, asaUnitName: "AVAX", id: "AVAX", chains: [] }
        const AVAX_USD : Market = {id: "AVAX_USD", baseInstrument: AVAX, quoteInstrument: USDC }
        // Parameters taken from Risk Spreadsheet
        // https://docs.google.com/spreadsheets/d/1uRVAb-bqT3g8hQPEKaIlBZXF7LmpL6Oz1NzWDKAfeIc/edit#gid=0
        const AVAXRiskParameters = {
            initial: { haircut: PercentageAmount.fromDecimal("0.29"), margin: PercentageAmount.fromDecimal("0.40")},
            maintenance: {haircut: PercentageAmount.fromDecimal("0.16"), margin: PercentageAmount.fromDecimal("0.2")},
            optUtilization: PercentageAmount.fromDB(BigInt(450))
        }

        const USDCRiskParameters = {
            initial: { haircut: PercentageAmount.fromDecimal("0"), margin: PercentageAmount.fromDecimal("0")},
            maintenance: {haircut: PercentageAmount.fromDecimal("0"), margin: PercentageAmount.fromDecimal("0")},
            optUtilization: PercentageAmount.fromDB(BigInt(800))
        }

        const USDC_RiskParameters: InstrumentWithRiskParameters = {
            ...USDC,
            riskParameters: USDCRiskParameters
        }

        const AVAX_RiskParameters: InstrumentWithRiskParameters = {
            ...AVAX,
            riskParameters: AVAXRiskParameters
        }

        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            cashBalance: new InstrumentAmountMap([[USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")]]),
            poolBalance: new InstrumentAmountMap()
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH

        const marginCalculation: Margin = {
            prices: new Map([
                [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
                [AVAX.asaId, new UsdPrice(new BigNumber("10.0")).toScaledPrice(AVAX)],
            ]),
            isInitialMargin: true,
            support:  10000000000000n,
            requirement: BigInt(0),
            shortfalls: new Map(),
            unoffsetLiabilities: new Map()
        }
        const orderPrice = MarketPrice.fromDecimal(AVAX_USD, "11")
        const maxTrade = availableForTradePriceAdjusted(USDC_RiskParameters,AVAX_RiskParameters,marginCalculation,orderPrice,userPosition)
        expect(maxTrade.prevMultiple(InstrumentAmount.fromDecimal(maxTrade.instrument,"0.01")).toDecimal()).to.equal("28.2")
        const maxTradeInv = availableForTradePriceAdjusted(AVAX_RiskParameters,USDC_RiskParameters,marginCalculation,orderPrice,userPosition)
        expect(maxTradeInv.prevMultiple(InstrumentAmount.fromDecimal(maxTradeInv.instrument,"0.01")).toDecimal()).to.equal("3.33")
    })

    it('test_available_for_trade.py', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ETH: Instrument = { asaName: "ETH", asaDecimals: 8, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
        const ALGO: Instrument = { asaName: "ALGO", asaDecimals: 8, asaId: 0, asaUnitName: "USDC", id: "USDC", chains: [] }
        const BTC: Instrument = { asaName: "BTC", asaDecimals: 8, asaId: 1, asaUnitName: "BTC", id: "BTC", chains: [] }
        const ETH_USD : Market = {id: "ETH_USDC", baseInstrument: ETH, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ETH.asaId, new UsdPrice(new BigNumber("1500.0")).toScaledPrice(ETH)],
            [BTC.asaId, new UsdPrice(new BigNumber("21600.0")).toScaledPrice(ETH)],
            [ALGO.asaId, new UsdPrice(new BigNumber("0.2")).toScaledPrice(ETH)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }

        const ETH_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ETH,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const BTC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...BTC,
            riskParameters: createRiskParameters("0.13","0.15","0.23","0.3","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }


        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ETH.asaId, ETH_RiskParameters],
            [BTC.asaId, BTC_RiskParameters],
        ])


        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "-0.6")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0.1")]
            ])
        }

        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)

        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1500")
        const maxAvailableTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("3923.31")

        const maxAvailableTradeInv = availableForTradePriceAdjusted(ETH_RiskParameters,USDC_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTradeInv.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTradeInv.instrument,"0.01")).toDecimal()).to.equal("2.24")

    })

    it('offseting scenario 1', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ETH: Instrument = { asaName: "ETH", asaDecimals: 8, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
        const BTC: Instrument = { asaName: "BTC", asaDecimals: 8, asaId: 1, asaUnitName: "BTC", id: "BTC", chains: [] }
        const ETH_USD : Market = {id: "ETH_USDC", baseInstrument: ETH, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ETH.asaId, new UsdPrice(new BigNumber("1500.0")).toScaledPrice(ETH)],
            [BTC.asaId, new UsdPrice(new BigNumber("21600.0")).toScaledPrice(ETH)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }

        const ETH_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ETH,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const BTC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...BTC,
            riskParameters: createRiskParameters("0.13","0.15","0.23","0.3","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }


        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ETH.asaId, ETH_RiskParameters],
            [BTC.asaId, BTC_RiskParameters],
        ])


        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "-1.2")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0.1")]
            ])
        }

        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)

        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1500")
        const maxAvailableTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("987.68")


    })

    it('offseting scenario 2', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ETH: Instrument = { asaName: "ETH", asaDecimals: 8, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
        const BTC: Instrument = { asaName: "BTC", asaDecimals: 8, asaId: 1, asaUnitName: "BTC", id: "BTC", chains: [] }
        const ETH_USD : Market = {id: "ETH_USDC", baseInstrument: ETH, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ETH.asaId, new UsdPrice(new BigNumber("1500.0")).toScaledPrice(ETH)],
            [BTC.asaId, new UsdPrice(new BigNumber("21600.0")).toScaledPrice(ETH)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }

        const ETH_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ETH,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const BTC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...BTC,
            riskParameters: createRiskParameters("0.13","0.15","0.23","0.3","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }


        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ETH.asaId, ETH_RiskParameters],
            [BTC.asaId, BTC_RiskParameters],
        ])


        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "100")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "100")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "-1.2")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0.1")]
            ])
        }
        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)
        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1500")
        const maxAvailableTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("2030.2")
    })

    it('offseting scenario 3', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ETH: Instrument = { asaName: "ETH", asaDecimals: 8, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
        const BTC: Instrument = { asaName: "BTC", asaDecimals: 8, asaId: 1, asaUnitName: "BTC", id: "BTC", chains: [] }
        const ETH_USD : Market = {id: "ETH_USDC", baseInstrument: ETH, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ETH.asaId, new UsdPrice(new BigNumber("1500.0")).toScaledPrice(ETH)],
            [BTC.asaId, new UsdPrice(new BigNumber("21600.0")).toScaledPrice(ETH)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }

        const ETH_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ETH,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const BTC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...BTC,
            riskParameters: createRiskParameters("0.13","0.15","0.23","0.3","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ETH.asaId, ETH_RiskParameters],
            [BTC.asaId, BTC_RiskParameters],
        ])

        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "1000")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "1000")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "-1.2")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0.1")]
            ])
        }

        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)
        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1500")
        const maxAvailableTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("5133.65")
    })

    it('offseting with net unoffset liability', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ETH: Instrument = { asaName: "ETH", asaDecimals: 8, asaId: 3, asaUnitName: "ETH", id: "ETH", chains: [] }
        const ALGO: Instrument = { asaName: "ALGO", asaDecimals: 8, asaId: 0, asaUnitName: "USDC", id: "USDC", chains: [] }
        const BTC: Instrument = { asaName: "BTC", asaDecimals: 8, asaId: 1, asaUnitName: "BTC", id: "BTC", chains: [] }
        const ETH_USD : Market = {id: "ETH_USDC", baseInstrument: ETH, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ETH.asaId, new UsdPrice(new BigNumber("1500.0")).toScaledPrice(ETH)],
            [BTC.asaId, new UsdPrice(new BigNumber("21600.0")).toScaledPrice(ETH)],
            [ALGO.asaId, new UsdPrice(new BigNumber("0.2")).toScaledPrice(ETH)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }

        const ETH_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ETH,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }

        const BTC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...BTC,
            riskParameters: createRiskParameters("0.13","0.15","0.23","0.3","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }


        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ETH.asaId, ETH_RiskParameters],
            [BTC.asaId, BTC_RiskParameters],
        ])


        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(USDC, "10")],
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "0.8")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [ETH.asaId, InstrumentAmount.fromDecimal(ETH, "-1.2")],
                [BTC.asaId, InstrumentAmount.fromDecimal(BTC, "0.1")]
            ])
        }

        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)
        margin.unoffsetLiabilities.set(ETH.asaId, 0n)

        const orderPrice = MarketPrice.fromDecimal(ETH_USD, "1500")
        const maxAvailableTrade = availableForTradePriceAdjusted(USDC_RiskParameters,ETH_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("292.27")


    })

    it('should allow to sell ALGOS for USDC ', () => {

        const USDC: Instrument = { asaName: "USDC", asaDecimals: 6, asaId: 2, asaUnitName: "USDC", id: "USDC", chains: [] }
        const ALGO: Instrument = { asaName: "ALGO", asaDecimals: 8, asaId: 0, asaUnitName: "ALGO", id: "ALGO", chains: [] }
        const ALGO_USDC : Market = {id: "ALGO_USDC", baseInstrument: ALGO, quoteInstrument: USDC }

        const createRiskParameters = (haircut: string, margin: string, haircutInitial: string, marginInitial:string, optUtil: string) =>{
            return {
                initial: { haircut: PercentageAmount.fromDecimal(haircutInitial), margin: PercentageAmount.fromDecimal(marginInitial)},
                maintenance: {haircut: PercentageAmount.fromDecimal(haircut), margin: PercentageAmount.fromDecimal(margin)},
                optUtilization: PercentageAmount.fromDecimal(optUtil)
            }
        }

        const prices = new Map([
            [USDC.asaId, new UsdPrice(new BigNumber("1.0")).toScaledPrice(USDC)],
            [ALGO.asaId, new UsdPrice(new BigNumber("0.2")).toScaledPrice(ALGO)],
        ])

        const USDC_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...USDC,
            riskParameters: createRiskParameters("0","0","0","0","0.450"),
            poolParameters: {
                minRate: PercentageAmount.fromDecimal("0"),
                maxRate: PercentageAmount.fromDecimal("0.80"),
                optRate: PercentageAmount.fromDecimal("0.439"),
                optimalUtilization: PercentageAmount.fromDecimal("0.8")
            }
        }


        const ALGO_RiskParameters: InstrumentWithRiskAndPoolParameters = {
            ...ALGO,
            riskParameters: createRiskParameters("0.16","0.2","0.29","0.4","0.450"),
            poolParameters: {
                maxRate: PercentageAmount.fromDecimal("0.439"),
                minRate: PercentageAmount.fromDecimal("0"),
                optRate: PercentageAmount.fromDecimal("0.124"),
                optimalUtilization: PercentageAmount.fromDecimal("0.45")
            }
        }



        const instruments = new Map<number,InstrumentWithRiskAndPoolParameters>([
            [USDC.asaId, USDC_RiskParameters],
            [ALGO.asaId, ALGO_RiskParameters],
        ])


        const userPosition: NetUserPosition = {
            availableCash: new InstrumentAmountMap([
                [ALGO.asaId, InstrumentAmount.fromDecimal(ALGO, "40")],
            ]),
            cashBalance: new InstrumentAmountMap([
                [ALGO.asaId, InstrumentAmount.fromDecimal(ALGO, "40")],
            ]),
            poolBalance: new InstrumentAmountMap([
                [USDC.asaId, InstrumentAmount.fromDecimal(ETH, "-10")],
            ])
        }

        // Simple scenario where we have 10 USDC and we want to buy ETH
        const margin = marginWithoutOrders(userPosition, instruments, prices, true)

        const orderPrice = MarketPrice.fromDecimal(ALGO_USDC, "0.2")

        const maxAvailableTrade = availableForTradePriceAdjusted(ALGO_RiskParameters,USDC_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTrade.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTrade.instrument,"0.01")).toDecimal()).to.equal("40")

        const maxAvailableTradeInv = availableForTradePriceAdjusted(USDC_RiskParameters,ALGO_RiskParameters,margin,orderPrice,userPosition)
        expect(maxAvailableTradeInv.prevMultiple(InstrumentAmount.fromDecimal(maxAvailableTradeInv.instrument,"0.01")).toDecimal()).to.equal("0")


    })
})