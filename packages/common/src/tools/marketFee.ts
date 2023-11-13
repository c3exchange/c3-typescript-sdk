import { FixedPoint, decimalToFixedPoint, tenPower, FIXED_POINT_DECIMALS } from "./fixedPoint"
import { InstrumentAmount } from "./instrumentAmount"

const SHIFT_MULTIPLIER = tenPower(FIXED_POINT_DECIMALS)

export class MarketFee {
    private constructor(readonly raw: FixedPoint) {}

    public static fromRaw(raw: FixedPoint): MarketFee {
        return new MarketFee(raw)
    }

    public static fromDecimal(decimal: string): MarketFee {
        return new MarketFee(decimalToFixedPoint(decimal))
    }

    public static fromDB(dbAmount: string): MarketFee {
        return MarketFee.fromRaw(BigInt(dbAmount))
    }

    public static zero(): MarketFee {
        return new MarketFee(0n)
    }

    public apply(amount: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(amount.instrument, this.raw * amount.raw / SHIFT_MULTIPLIER)
    }

    public add(fee: MarketFee) : MarketFee{
        return MarketFee.fromRaw(fee.raw + this.raw);
    }
    public sub(fee: MarketFee) : MarketFee{
        return MarketFee.fromRaw(this.raw - fee.raw);
    }

    public max(fee: MarketFee) {
        return this.raw > fee.raw ? this : fee
    }
}
