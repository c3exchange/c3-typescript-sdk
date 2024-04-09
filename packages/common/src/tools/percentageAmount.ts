import { ContractAmount, InstrumentAmount } from "./instrumentAmount"
import BigNumber from "bignumber.js"
import { MarketPrice } from "./marketPrices"

export type DBPercentageAmount = bigint
export const RATIO_ONE = BigInt(1000)

export function divideBigIntByPercentage(amount: bigint, percentage: PercentageAmount): bigint {
    return amount * RATIO_ONE / percentage.raw
}
export class PercentageAmount {
    private constructor(
        readonly raw: bigint
    ) {}

    static fromRaw(rawAmount: ContractAmount): PercentageAmount {
        return new PercentageAmount(rawAmount)
    }

    static fromPercentage(percentage: string): PercentageAmount {
        const ratio = Number(percentage)
        if (ratio < 0 || ratio > 100)
            throw new Error(`Instrument Ratio parameter should be between 0 and 100, got ${ratio}`)
        return PercentageAmount.fromRaw(BigInt(ratio * Number(RATIO_ONE) / 100))
    }

    static fromDecimal(percentage: string): PercentageAmount {
        const ratio = Number(percentage)
        if (ratio < 0 || ratio > 1)
            throw new Error(`Instrument Ratio parameter should be between 0 and 1, got ${ratio}`)
        return PercentageAmount.fromRaw(BigInt(ratio * Number(RATIO_ONE) ))
    }

    public toDecimal(): string {
        return BigNumber(this.raw.toString()).div(RATIO_ONE.toString()).toString()
    }
    public sub(percentage: PercentageAmount): PercentageAmount {
        return PercentageAmount.fromRaw(this.raw - percentage.raw)
    }

    public mult(percentage: PercentageAmount): PercentageAmount {
        return PercentageAmount.fromRaw((this.raw * percentage.raw) / RATIO_ONE)
    }

    static fromDB(dbAmount: DBPercentageAmount): PercentageAmount {
        return PercentageAmount.fromRaw(BigInt(dbAmount))
    }

    public toDB(): DBPercentageAmount {
        return this.raw
    }

    public complementToHundred(): PercentageAmount {
        return PercentageAmount.fromRaw(RATIO_ONE - this.raw)
    }

    public excessToHundred(): PercentageAmount {
        return PercentageAmount.fromRaw(RATIO_ONE + this.raw)
    }

    public static oneHundred(): PercentageAmount {
        return PercentageAmount.fromRaw(RATIO_ONE)
    }

    static zero() {
        return PercentageAmount.fromRaw(BigInt(0))
    }

    public applyToPrice(orderPrice: MarketPrice) {
        return MarketPrice.fromRaw(orderPrice.market, (orderPrice.raw * this.raw) / RATIO_ONE)
    }

    public applyToAmount(instrumentAmount: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrumentAmount.instrument,this.raw * instrumentAmount.raw / RATIO_ONE )
    }

}