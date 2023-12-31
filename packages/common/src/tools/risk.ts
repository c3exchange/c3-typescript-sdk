import { AssetId, Instrument, InstrumentWithRiskParameters, RiskParameters, MarginResponse, MarginAssetInfoResponse, Margin, MarginResponseMinimized, InstrumentWithRiskAndPoolParameters } from "../interfaces"
import { ContractAmount, InstrumentAmount, NetUserPosition } from "./instrumentAmount"
import { PicoUsdAmount } from "./usdPrice"
import { BigMin, BigMax, bigintMax, bigintMin } from "./math"
import { MarketPrice } from "./marketPrices"
import { RATIO_ONE } from "./percentageAmount"
import BigNumber from "bignumber.js"


// All risk parameters are multiplied by a scale factor of 1000 to make them integer
// This includes the haircuts, the initial factor, the liquidation factor, etc


export type ExcessMargin = bigint

export function toMarginResponse(margin: Margin): MarginResponse {
    const assetDetails: MarginAssetInfoResponse[] = []
    for(const [assetId, price] of margin.prices.entries()) {
        assetDetails.push({
            assetId,
            price: price.toString(),
            shortfall:  (margin.shortfalls.get(assetId) ?? BigInt(0)).toString(),
            unoffsetLiability: (margin.unoffsetLiabilities.get(assetId) ?? BigInt(0)).toString()
        })
    }
    const assets = new Set<AssetId>(margin.prices.keys())
    return {
        isInitialMargin: margin.isInitialMargin,
        support: margin.support.toString(),
        requirement: margin.requirement.toString(),
        assetInfo: assetDetails
    }
}

export function toMarginResponseMinimized(margin: Margin): MarginResponseMinimized {
    return {
        support: margin.support.toString(),
        requirement: margin.requirement.toString(),
    }
}

export interface UserMarginDetails {
    isInitialMargin: boolean

}
export interface UserInfoForInstrument {
    availableMargin: PicoUsdAmount,
    cashBalance: ContractAmount,
    availableCash: ContractAmount,
    liability: ContractAmount,
    lend: ContractAmount,
    unoffsetLiability: ContractAmount,
    shortfall: ContractAmount,
}
export function getInstrumentMarginDetails(instrumentData: InstrumentWithRiskParameters, userMarginCalculation: Margin, userPosition: NetUserPosition): UserInfoForInstrument {
    const instrument = instrumentData as Instrument
    const availableCash = userPosition.availableCash.getAmountOrZero(instrument).toContract()
    const poolBalance = userPosition.poolBalance.getAmountOrZero(instrument).toContract()
    const cashBalance = userPosition.cashBalance.getAmountOrZero(instrument).toContract()
    const [liability, lend] = poolBalance >= BigInt(0) ? [BigInt(0), poolBalance] : [-BigInt(poolBalance), BigInt(0)]
    const assetId = instrument.asaId
    const { support, requirement, unoffsetLiabilities, shortfalls } = userMarginCalculation
    const unoffsetLiability = unoffsetLiabilities.get(assetId) ?? BigInt(0)
    const shortfall = shortfalls.get(assetId) ?? BigInt(0)
    const availableMargin = support - requirement
    const price= userMarginCalculation.prices.get(assetId) ?? BigInt(0)
    // When we calculated the health, we added up the lend positions by cutting them by 1 - optimalUtilization
    // We are adding back what we cut so the lend position is counted fully for this asset

    return { availableMargin, cashBalance, availableCash, liability, lend, unoffsetLiability, shortfall }
}




export function availableForTrade(sellInfo: InstrumentWithRiskParameters, buyInfo: InstrumentWithRiskParameters, marginCalculation: Margin, userPosition: NetUserPosition ): InstrumentAmount {

    const sellInstrument = sellInfo as Instrument
    const buyInstrument = buyInfo
    const sellRiskParams = sellInfo.riskParameters
    const buyRiskParams = buyInfo.riskParameters
    const buyHaircut = buyRiskParams.initial.haircut
    const sellMargin = sellRiskParams.initial.margin
    const sellHaircut = sellRiskParams.initial.haircut

    const sellPrice = marginCalculation.prices.get(sellInstrument.asaId)
    if (sellPrice === undefined)
        throw new Error("No price for sell instrument")
    const buyPrice = marginCalculation.prices.get(buyInstrument.asaId)
    if (buyPrice === undefined)
        throw new Error("No price for buy instrument")

    if(!marginCalculation.isInitialMargin)
        throw new Error("Need to use initial margin for calculating available for trade")

    const initialMarginInUsd = marginCalculation.support - marginCalculation.requirement
    const sellInstrumentBalance = getInstrumentMarginDetails(sellInfo, marginCalculation, userPosition)
    const buyInstrumentBalance = getInstrumentMarginDetails(buyInfo, marginCalculation, userPosition)
    if ( sellHaircut < buyHaircut) {
        const potentialAvailable = initialMarginInUsd * RATIO_ONE /   buyHaircut.sub(sellHaircut).toDB()
        if (potentialAvailable < sellInstrumentBalance.availableCash)
            return InstrumentAmount.fromContract(sellInstrument, potentialAvailable)
    }

    const sellPositionWithLend = sellInstrumentBalance.availableCash + sellInstrumentBalance.lend
    const lendCutFactor = sellPrice * sellHaircut.complementToHundred().toDB() * sellInfo.riskParameters.optUtilization.toDB() / RATIO_ONE
    const sellLendCorrectedAM =  initialMarginInUsd + lendCutFactor * sellInstrumentBalance.lend / RATIO_ONE
    const firstShortfall = ((sellLendCorrectedAM / sellPrice) * RATIO_ONE + (sellHaircut.toDB() - buyHaircut.toDB()) * sellPositionWithLend) / (buyHaircut.toDB() + sellMargin.toDB())


    const offsetAmount = BigMin((firstShortfall + sellPositionWithLend) * sellPrice / buyPrice, buyInstrumentBalance.unoffsetLiability )
    const offsetAdj = offsetAdjustment(buyRiskParams.initial, buyPrice, offsetAmount)
    const shortfall = firstShortfall + offsetAdj * RATIO_ONE / (buyPrice * (buyHaircut.toDB() + sellMargin.toDB()))
    return InstrumentAmount.fromContract(sellInstrument, BigMax(BigInt(0), shortfall + sellPositionWithLend))
}

// Utility function used when simulating the netting of an open order.
// When netting we lose the advantage of having "amount" as collateral, and we lose
//  the disadvantage of having "amount" as a liability.
// If you like negating verbs in natural language, you gain the advantage of not-having "amount" as a liability.
// I know. Weird, right?
function offsetAdjustment(riskFactors: RiskParameters, price: PicoUsdAmount, amount: ContractAmount): PicoUsdAmount {
    return (price * amount * (riskFactors.margin.toDB() + riskFactors.haircut.toDB()) / RATIO_ONE)
}



export function availableForTradePriceAdjusted(sellInfo: InstrumentWithRiskParameters, buyInfo: InstrumentWithRiskParameters, marginCalculation: Margin, orderPrice: MarketPrice , userPosition: NetUserPosition ): InstrumentAmount {
    const sellInstrument = sellInfo as Instrument
    const buyInstrument = buyInfo as Instrument
    const sellRiskParams = sellInfo.riskParameters.initial
    const buyRiskParams = buyInfo.riskParameters.initial
    const buyHaircut = buyRiskParams.haircut
    const buyMargin = buyRiskParams.margin
    const sellMargin = sellRiskParams.margin
    const sellHaircut = sellRiskParams.haircut
    const buyHaircutRemainder = buyHaircut.complementToHundred() // 1 - h_buy
    const sellHaircutRemainder = sellHaircut.complementToHundred() // 1 - h_buy
    const sellMarginExcess = sellMargin.excessToHundred() // 1 + m_sell
    const buyMarginExcess = buyMargin.excessToHundred() // 1 + m_buy
    const sellPrice = marginCalculation.prices.get(sellInstrument.asaId)
    if (sellPrice === undefined)
        throw new Error("No price for sell instrument")
    const buyPrice = marginCalculation.prices.get(buyInstrument.asaId)
    if (buyPrice === undefined)
        throw new Error("No price for buy instrument")

    if(!marginCalculation.isInitialMargin)
        throw new Error("Need to use initial margin for calculating available for trade")

    const ONE_PICO_USD = BigInt(10**12)
    const sellInPicoUsd =  BigInt(BigNumber(sellPrice.toString()).shiftedBy(sellInstrument.asaDecimals).toFixed(0)) // PicoUSD per Sell Instrument
    const buyInPicoUsd =  BigInt(BigNumber(buyPrice.toString()).shiftedBy(buyInstrument.asaDecimals).toFixed(0)) // PicoUSD per Sell Instrument


    const sellInstrumentBalance = getInstrumentMarginDetails(sellInfo, marginCalculation, userPosition)
    const me = marginCalculation.support - marginCalculation.requirement
    if(me < 0n){
      // If getting an asset with less risk allow to spend what you have
        if(buyHaircut.raw <= sellHaircut.raw){
            return InstrumentAmount.fromContract(sellInstrument, sellInstrumentBalance.availableCash )
        }else {
            return InstrumentAmount.zero(sellInstrument)
        }
    }
    const adjustedLend = sellHaircutRemainder.toDB() * sellInfo.riskParameters.optUtilization.toDB()* sellInstrumentBalance.lend   / (RATIO_ONE * RATIO_ONE)
    const sellContractAmountShift = BigInt(10 ** sellInstrument.asaDecimals)
    const marginInSellContractAmount = (marginCalculation.support - marginCalculation.requirement) * sellContractAmountShift /  sellInPicoUsd
    const adjustedMargin = marginInSellContractAmount + adjustedLend

    // We Adjust the price of the order price to the buy / sell instrument relation
    let { numerator: orderPriceNum,denominator: orderPriceDen} = orderPrice.asFraction()
    if(orderPrice.market.baseInstrument.id === sellInstrument.id){
        const aux = orderPriceNum
        orderPriceNum = orderPriceDen
        orderPriceDen = aux
    }
    const priceAux = (buyInPicoUsd * orderPriceDen * ONE_PICO_USD ) / (sellInPicoUsd * orderPriceNum)
    const priceFactorX = sellHaircutRemainder.toDB()*ONE_PICO_USD - buyHaircutRemainder.toDB() * priceAux
    const netSellPositionAfterRedeem = bigintMax(BigInt(0),sellInstrumentBalance.availableCash - sellInstrumentBalance.liability ) + sellInstrumentBalance.lend
    const x = priceFactorX !== BigInt(0) ? adjustedMargin * RATIO_ONE * ONE_PICO_USD / priceFactorX : BigInt(0) //
    let buyingPower = netSellPositionAfterRedeem
    if( x > BigInt(0) && x < netSellPositionAfterRedeem ){
        buyingPower = x
    }
    else
    {
        const haircuttedAvailableCashSell = sellHaircutRemainder.toDB()*netSellPositionAfterRedeem
        const priceAdjustedNetPosition = buyHaircutRemainder.toDB() *netSellPositionAfterRedeem * priceAux
        const priceFactorY = sellMarginExcess.toDB()*ONE_PICO_USD - buyHaircutRemainder.toDB() * priceAux
        let y =  ( adjustedMargin* RATIO_ONE*ONE_PICO_USD - haircuttedAvailableCashSell*ONE_PICO_USD + priceAdjustedNetPosition  ) / bigintMax(priceFactorY,BigInt(1))
        const buyInstrumentBalance = getInstrumentMarginDetails(buyInfo, marginCalculation, userPosition)
        // we are going to close some existing liability
        //let netBuyLiability = buyInstrumentBalance.liability - buyInstrumentBalance.cashBalance
        let buyUnoffsetLiability = marginCalculation.unoffsetLiabilities.get(buyInstrument.asaId) ?? BigInt(0)
        if(buyInfo.asaDecimals != sellInfo.asaDecimals){
            // mode decimal point on buyUnoffsetLiability to match y instrument (sell)
            buyUnoffsetLiability = BigInt(BigNumber(buyUnoffsetLiability.toString()).shiftedBy(sellInfo.asaDecimals - buyInfo.asaDecimals).toFixed(0))
        }
        const offsetBuy = bigintMin( (y + netSellPositionAfterRedeem)*orderPriceDen / orderPriceNum ,buyUnoffsetLiability)
        const offsetAdj = offsetBuy*( buyHaircut.toDB() + buyMargin.toDB())
        const deltaY = (offsetAdj* buyInPicoUsd * ONE_PICO_USD) / sellInPicoUsd
        y = y + deltaY / priceFactorY
        buyingPower = netSellPositionAfterRedeem  +  y
    }
    return InstrumentAmount.fromContract(sellInstrument,buyingPower)
}

export function marginWithoutOrders(position: NetUserPosition, instruments: Map<AssetId,InstrumentWithRiskAndPoolParameters>, prices: Map<AssetId, PicoUsdAmount>, initial = true) {

    const availableCash = new Map(Array.from(position.availableCash).map(([assetId, balance]) => [assetId, balance.toContract()]))
    const poolBalances = new Map(Array.from(position.poolBalance).map(([assetId, balance]) => [assetId, balance.toContract()]))
    const getRF = (instrument: InstrumentWithRiskParameters) => initial ? instrument.riskParameters.initial : instrument.riskParameters.maintenance
    const margin: Margin = { support: 0n, requirement: 0n, unoffsetLiabilities: new Map(), shortfalls: new Map() , isInitialMargin: initial, prices: new Map() }
    const assetsToVisit: Set<AssetId> = new Set([...availableCash.keys(), ...poolBalances.keys()])

    margin.prices = prices
    // Visit all relevant assets
    for (const assetId of assetsToVisit) {
        const instrument = instruments.get(assetId)
        if (!instrument) {
            throw new Error(`Missing instrument ${assetId} in excess margin formula`)
        }
        // Get asset price and balances
        const price = margin.prices.get(assetId)
        if (!price) {
            throw new Error(`Missing price for instrument ${assetId} in excess margin formula`)
        }
        const poolBalance = poolBalances.get(assetId) ?? 0n

        // Calculate excess/remainder
        const assetRF = getRF(instrument)
        const haircutRemainder = assetRF.haircut.complementToHundred().toDB()
        const marginAdditional = assetRF.margin.excessToHundred().toDB()
        const optimalRemainder = instrument.poolParameters.optimalUtilization.complementToHundred().toDB()

        // Apply margin support for pool balance
        if (poolBalance > 0n) {
            margin.support += price * poolBalance * haircutRemainder * optimalRemainder / (RATIO_ONE * RATIO_ONE)
        }

        // Check net collateral
        const cash = availableCash.get(assetId) ?? 0n
        const netCollateral = cash + BigMin(poolBalance, 0n)
        if (netCollateral > 0n) {
            margin.support += price * netCollateral * haircutRemainder / RATIO_ONE
        } else {
            margin.requirement -= price * netCollateral * marginAdditional / RATIO_ONE
            margin.unoffsetLiabilities.set(assetId, -netCollateral)
        }
    }
    return margin
}