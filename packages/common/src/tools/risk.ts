import { AssetId, Instrument, InstrumentWithRiskParameters, RiskParameters, MarginResponse, MarginAssetInfoResponse, Margin, MarginResponseMinimized, InstrumentWithRiskAndPoolParameters } from "../interfaces"
import { ContractAmount, InstrumentAmount, NetUserPosition } from "./instrumentAmount"
import { PicoUsdAmount } from "./usdPrice"
import { BigMin, BigMax, bigintMax, bigintMin } from "./math"
import { MarketPrice } from "./marketPrices"
import { RATIO_ONE, PercentageAmount } from "./percentageAmount"
import BigNumber from "bignumber.js"
import { stringifyJSON } from "../utils/index"
import { OrderSide } from "../interfaces"
import { RiskFactors } from "../contracts/index"


// All risk parameters are multiplied by a scale factor of 1000 to make them integer
// This includes the haircuts, the initial factor, the liquidation factor, etc


export type ExcessMargin = bigint
export const PRICE_RESCALE_FACTOR = BigInt(10**9)
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

const createLogIfPrefix = (prefix: string | undefined) => {
    return (msg: any, ...params: any[]) => {
        if(prefix !== undefined){
            console.log(`[${prefix}]-`, msg, params)
        }
    }
}
export function calculateMarketOrderSlippage(orderSide: OrderSide, orderPrice: MarketPrice, priceTick: MarketPrice, minPrice?: MarketPrice, maxPrice?: MarketPrice, prefix: string | undefined = undefined ): MarketPrice {
    const logIfPrefix = createLogIfPrefix(prefix)
    const slippageFactor = PercentageAmount.fromDecimal('0.5')
    const slippageAmount =  slippageFactor.applyToPrice(orderPrice)
    let priceWithSlippage = orderSide === 'buy' ? orderPrice.add(slippageAmount).nextMultiple(priceTick) : orderPrice.sub(slippageAmount).prevMultiple(priceTick)
    // If 50% slippage is too much consider worst market price in the book
    const result =  orderSide === 'buy' ? priceWithSlippage.min(maxPrice ?? priceWithSlippage) : priceWithSlippage.max(minPrice ?? priceWithSlippage)
    logIfPrefix("orderPrice", orderPrice, 'priceTick', priceTick, 'slippageAmount', slippageAmount, 'priceWithSlippage', priceWithSlippage, 'result', result)
    return result
}

export function availableForTradePriceAdjusted(sellInfo: InstrumentWithRiskParameters, buyInfo: InstrumentWithRiskParameters, marginCalculation: Margin, orderPrice: MarketPrice , userPosition: NetUserPosition): InstrumentAmount {

    const printPicoAmount = (picoPrice: BigInt) => {
        return `${BigNumber(picoPrice.toString()).shiftedBy(-12).toNumber()} x 10e12`
    }
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
    const implicitMktPrice = buyInPicoUsd * ONE_PICO_USD / sellInPicoUsd
    let { numerator: orderPriceNum,denominator: orderPriceDen, decimals: orderPriceDecimals} = orderPrice.asFraction()
    if(orderPrice.market.baseInstrument.id === sellInstrument.id){
        const aux = orderPriceNum
        orderPriceNum = orderPriceDen
        orderPriceDen = aux
    }
    let priceAux = implicitMktPrice * orderPriceDen  / orderPriceNum
    const adjustedLend = sellHaircutRemainder.toDB() * sellInfo.riskParameters.optUtilization.toDB()* sellInstrumentBalance.lend   / (RATIO_ONE * RATIO_ONE)
    const sellContractAmountShift = BigInt(10 ** sellInstrument.asaDecimals)
    const marginInSellContractAmount = (marginCalculation.support - marginCalculation.requirement) * sellContractAmountShift /  sellInPicoUsd
    const adjustedMargin = marginInSellContractAmount + adjustedLend
    // We Adjust the price of the order price to the buy / sell instrument relation
    const netSellPositionAfterRedeem = bigintMax(BigInt(0),sellInstrumentBalance.availableCash - sellInstrumentBalance.liability ) + sellInstrumentBalance.lend
    const priceFactorX = sellHaircutRemainder.toDB()*ONE_PICO_USD - buyHaircutRemainder.toDB() * priceAux

    let buyingPower = netSellPositionAfterRedeem

    if(priceFactorX > 0){
        const x = (adjustedMargin * RATIO_ONE * ONE_PICO_USD) / priceFactorX
        if ( x >= BigInt(0) && x <= netSellPositionAfterRedeem ) {
            buyingPower = x
            return InstrumentAmount.fromContract(sellInstrument,buyingPower)
        }
    }
    const isBuy = orderPrice.market.baseInstrument.id === buyInstrument.id
    let limit_p = 0n
    //TODO: What happen with decimals in mkt price?
    if(isBuy){
        const a = (buyHaircut.complementToHundred().toDB() * RATIO_ONE) / sellMargin.excessToHundred().toDB()
        limit_p = ((a*RATIO_ONE + ((RATIO_ONE-a)*200n))*buyInPicoUsd * ONE_PICO_USD) / (sellInPicoUsd*RATIO_ONE*RATIO_ONE)
        // limit_p = max(limit_price, limit_p)
        limit_p = BigMax((orderPriceNum*ONE_PICO_USD) / orderPriceDen, limit_p ) // TODO: Check if we need to adjust for instruments with different decimals
        priceAux = (implicitMktPrice * ONE_PICO_USD) / limit_p
    }else{
        const a = (sellMargin.excessToHundred().toDB() * RATIO_ONE ) / buyHaircut.complementToHundred().toDB()
        limit_p = ((a*RATIO_ONE - ((a - RATIO_ONE)*200n))*sellInPicoUsd * ONE_PICO_USD) / (buyInPicoUsd*RATIO_ONE*RATIO_ONE) // threshold Price
        // keep in mind that if the order is a sell order, the orderPriceNum is inverted with orderPriceDen so orderPriceNum / orderPriceDen is 1/ orderPrice
        // limit_p = min(1/limit_price, limit_p)
        limit_p = BigMin((orderPriceDen*ONE_PICO_USD) / orderPriceNum, limit_p) // TODO: Check if we need to adjust for instruments with different decimals
        priceAux = (implicitMktPrice * limit_p) / ONE_PICO_USD
    }


    const haircuttedAvailableCashSell = sellHaircutRemainder.toDB()*netSellPositionAfterRedeem
    const priceAdjustedNetPosition = buyHaircutRemainder.toDB() *netSellPositionAfterRedeem * priceAux
    const priceFactorY = sellMarginExcess.toDB()*ONE_PICO_USD - buyHaircutRemainder.toDB() * priceAux
    if(priceFactorY <= 1n){
        return InstrumentAmount.infinity(sellInstrument)
    }
    let y = ( adjustedMargin * RATIO_ONE * ONE_PICO_USD - haircuttedAvailableCashSell * ONE_PICO_USD + priceAdjustedNetPosition  )
    y = y / priceFactorY
    let buyUnoffsetLiability = marginCalculation.unoffsetLiabilities.get(buyInstrument.asaId) ?? BigInt(0)
    if(buyInfo.asaDecimals != sellInfo.asaDecimals){
        // mode decimal point on buyUnoffsetLiability to match y instrument (sell)
        buyUnoffsetLiability = BigInt(BigNumber(buyUnoffsetLiability.toString()).shiftedBy(sellInfo.asaDecimals - buyInfo.asaDecimals).toFixed(0))
    }
    const offsetBuy = bigintMin( (y + netSellPositionAfterRedeem)*orderPriceDen / orderPriceNum, buyUnoffsetLiability)
    const offsetAdj = offsetBuy*( buyHaircut.toDB() + buyMargin.toDB())
    const deltaYNum = (offsetAdj* buyInPicoUsd * ONE_PICO_USD) / sellInPicoUsd
    const deltaY = deltaYNum / priceFactorY
    y = y + deltaY
    buyingPower = BigMax(0n, netSellPositionAfterRedeem + y)
    return InstrumentAmount.fromContract(sellInstrument,buyingPower)
}

export function toRiskFactors(riskParameters: RiskParameters): RiskFactors {
    return {
        haircut: riskParameters.haircut.raw,
        margin: riskParameters.margin.raw
    }
}
export function getRF(instrument: InstrumentWithRiskParameters, initial: boolean): RiskFactors{
    return toRiskFactors(initial ? instrument.riskParameters.initial : instrument.riskParameters.maintenance)
}
export function marginWithoutOrders(position: NetUserPosition, instruments: Map<AssetId,InstrumentWithRiskAndPoolParameters>, prices: Map<AssetId, PicoUsdAmount>, initial = true) {

    const availableCash = new Map(Array.from(position.availableCash).map(([assetId, balance]) => [assetId, balance.toContract()]))
    const poolBalances = new Map(Array.from(position.poolBalance).map(([assetId, balance]) => [assetId, balance.toContract()]))
    const margin = positionHealth(availableCash, poolBalances, instruments, prices, initial)
    // We calculated support and requirement same as onchain, now scale back so everything is in PicoUsd
    margin.support *= PRICE_RESCALE_FACTOR
    margin.requirement *= PRICE_RESCALE_FACTOR
    return margin
}

/**
 * Calculates position health in miliUSDs (same as we are doing onchain)
 */
export function positionHealth(availableCash: Map<AssetId, ContractAmount>, poolBalances: Map<AssetId, ContractAmount>, instruments: Map<AssetId, InstrumentWithRiskParameters>, prices: Map<AssetId, PicoUsdAmount>, initial: boolean): Margin{
    const margin: Margin = {
        support: 0n,
        requirement: 0n,
        unoffsetLiabilities: new Map(),
        shortfalls: new Map() ,
        isInitialMargin: initial,
        prices: prices
    }
    const assetsToVisit: Set<AssetId> = new Set([...availableCash.keys(), ...poolBalances.keys()])

    // Visit all relevant assets
    for (const assetId of assetsToVisit) {

        const riskInstrument = instruments.get(assetId)
        if (!riskInstrument) {
            throw new Error(`Missing instrument ${assetId} in excess margin formula`)
        }

        // Get asset price and balances
        const price = margin.prices.get(assetId)
        if (!price) {
            throw new Error(`Missing price for instrument ${assetId} in excess margin formula`)
        }
        const poolBalance = poolBalances.get(assetId) ?? 0n

        // Calculate excess/remainder
        const assetRF = getRF(riskInstrument, initial)
        const haircutRemainder = RATIO_ONE - assetRF.haircut
        const marginAdditional = RATIO_ONE + assetRF.margin
        const optimalUtilization = riskInstrument.riskParameters.optUtilization.toDB()
        const cash = availableCash.get(assetId) ?? 0n
        const balanceSum = cash + poolBalance
        let instrumentHealthDelta = 0n
        if (balanceSum < 0n) {
            instrumentHealthDelta = price * (-balanceSum) * marginAdditional
            margin.requirement += instrumentHealthDelta / (RATIO_ONE * PRICE_RESCALE_FACTOR)
            margin.unoffsetLiabilities.set(assetId, -balanceSum)
        } else {
            instrumentHealthDelta = price * balanceSum * haircutRemainder
            margin.support += instrumentHealthDelta / (RATIO_ONE * PRICE_RESCALE_FACTOR)
        }
        if(poolBalance > 0n){
            // Apply margin support for pool balance
            // A + (1 - O)*X = A + X - O*X
            // We already added price * (cash + poolBalance) * haircutRemainder to margin.support
            // We need to remove - price * poolBalance * haircutRemainder * instrument.poolRates.optimalUtilization
            // so we have deltaHealth = price * haircutRemainder* (cash + poolBalance * (1 - instrument.poolRates.optimalUtilization)
            const deltaLend = price * poolBalance * haircutRemainder * optimalUtilization
            margin.support -= deltaLend / (RATIO_ONE * RATIO_ONE * PRICE_RESCALE_FACTOR)
        }
    }
    return margin
}