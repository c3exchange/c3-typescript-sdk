import { fixedPointToDecimal, decimalToFixedPoint, tenPower, FIXED_POINT_DECIMALS, FIXED_POINT_DIGITS, FixedPoint } from "./fixedPoint"
import { Market, createMarket } from "../interfaces"
import { InstrumentAmount } from "./instrumentAmount"
import { parseJSON, stringifyJSON } from "../utils/json"
import { MarketFee } from "./marketFee"

const SHIFT_MULTIPLIER = tenPower(FIXED_POINT_DECIMALS)
const INFINITY = tenPower(FIXED_POINT_DIGITS) - BigInt(1)

// TODO: ALL ARITHMETIC OPERATIONS MUST BE WITH THE SAME MARKET
export class MarketPrice {

    private constructor(
        // TODO: This class should only require the pair id but we are using the entire pair for simplicity
        readonly market: Market,
        // We picked the contract price because it's easier for us but it could be anything (string, bignumber, etc)
        readonly raw: FixedPoint
    ) {}

    static fromRaw(market: Market, rawPrice: FixedPoint): MarketPrice {
        if (rawPrice < BigInt(0))
            throw new Error("Prices cannot be negative")
        return new MarketPrice(market, rawPrice)
    }

    static fromDecimal(market: Market, price: string): MarketPrice {
        const decimals = FIXED_POINT_DECIMALS - market.baseInstrument.asaDecimals + market.quoteInstrument.asaDecimals
        return MarketPrice.fromRaw(market, decimalToFixedPoint(price, decimals))
    }

    static ratio(base: InstrumentAmount, quote: InstrumentAmount): MarketPrice {
        const rawPrice = base.raw === BigInt(0) ? INFINITY : quote.raw * SHIFT_MULTIPLIER / base.raw
        return MarketPrice.fromRaw(createMarket(base.instrument, quote.instrument), rawPrice)
    }

    static fromDB(market: Market, price: string): MarketPrice {
        return MarketPrice.fromRaw(market, BigInt(price))
    }

    static fromC3JSON(price: string): MarketPrice {
        const priceObject: {market: Market, price: string} = parseJSON(price)
        return MarketPrice.fromDecimal(priceObject.market, priceObject.price)
    }

    toDecimal(): string {
        const decimals = FIXED_POINT_DECIMALS + this.market.baseInstrument.asaDecimals - this.market.quoteInstrument.asaDecimals
        return fixedPointToDecimal(this.raw, decimals)
    }

    toDB(): FixedPoint {
        return this.raw
    }

    toC3JSON(): string {
        return stringifyJSON({market: this.market, price: this.toDecimal()})
    }

    toString(): string {
        return this.toDecimal() + " " + this.market.quoteInstrument.asaUnitName + "/" + this.market.baseInstrument.asaUnitName
    }

    asFraction(): {numerator: bigint, denominator: bigint, decimals: number} {
        const num = this.raw
        const decimals = FIXED_POINT_DECIMALS - this.market.baseInstrument.asaDecimals + this.market.quoteInstrument.asaDecimals
        return {numerator: num, denominator: tenPower(decimals), decimals: decimals}
    }


    isMultipleOf(price: MarketPrice): boolean {
        return this.raw % price.raw === BigInt(0)
    }

    isZero(): boolean {
        return this.raw === BigInt(0)
    }

    isInfinite(): boolean {
        return this.raw === INFINITY
    }

    multiplyBy(x: bigint): MarketPrice {
        return MarketPrice.fromRaw(this.market, this.raw * x)
    }

    multiplyByFee(x: MarketFee): MarketPrice {
        return MarketPrice.fromRaw(this.market, this.raw * x.raw / SHIFT_MULTIPLIER)
    }

    quoteToBase(quote: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(this.market.baseInstrument, quote.raw * SHIFT_MULTIPLIER / this.raw)
    }

    baseToQuote(base: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(this.market.quoteInstrument, this.raw * base.raw / SHIFT_MULTIPLIER)
    }

    nextMultiple(price: MarketPrice): MarketPrice {
        const multiplier = price.raw
        return MarketPrice.fromRaw(this.market, (this.raw + multiplier - BigInt(1)) / multiplier * multiplier)
    }

    prevMultiple(price: MarketPrice): MarketPrice {
        const multiplier = price.raw
        return MarketPrice.fromRaw(this.market, this.raw / multiplier * multiplier)
    }

    compare(price: MarketPrice): number {
        return Number(this.raw - price.raw)
    }

    equals(price: MarketPrice): boolean {
        return this.compare(price) === 0
    }

    greaterThanOrEqual(price: MarketPrice): boolean {
        return this.compare(price) >= 0
    }

    greaterThan(price: MarketPrice): boolean {
        return this.compare(price) > 0
    }

    lessThanOrEqual(price: MarketPrice): boolean {
        return this.compare(price) <= 0
    }

    lessThan(price: MarketPrice): boolean {
        return this.compare(price) < 0
    }

    add(price: MarketPrice): MarketPrice {
        return MarketPrice.fromRaw(this.market, this.raw + price.raw)
    }

    sub(price: MarketPrice): MarketPrice {
        return MarketPrice.fromRaw(this.market, this.raw - price.raw)
    }

    baseToQuoteIsInteger(base: InstrumentAmount): boolean {
        return (this.raw * base.raw) % SHIFT_MULTIPLIER === BigInt(0)
    }

    // Generate price for pair with base/quote flipped
    // invert(): MarketPrice {
    //     return MarketPrice.fromRaw({ base: this.market.quote, quote: this.market.base }, SHIFT_MULTIPLIER / this.raw)
    // }

    abs(): MarketPrice {
        return MarketPrice.fromRaw(this.market, this.raw >= 0 ? this.raw : -this.raw)
    }

    div(rhs: MarketPrice): MarketPrice {
        return MarketPrice.fromRaw(this.market, (SHIFT_MULTIPLIER * this.raw) / rhs.raw)
    }

    mean(rhs: MarketPrice): MarketPrice {
        return MarketPrice.fromRaw(this.market, (this.raw + rhs.raw) / BigInt(2))
    }

    max(rhs: MarketPrice):MarketPrice {
        return this.greaterThan(rhs) ? this : rhs
    }

    min(rhs: MarketPrice):MarketPrice {
        return this.lessThan(rhs) ? this : rhs
    }

    // Return the closest price to this price between the lower and upper bounds
    clamp(lowerBound: MarketPrice, upperBound: MarketPrice): MarketPrice {
        return this.max(lowerBound).min(upperBound)
    }

    isPositive(): boolean {
        return this.raw >= BigInt(0)
    }
}
