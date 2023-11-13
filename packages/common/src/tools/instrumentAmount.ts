import { fixedPointToDecimal, decimalToFixedPoint, FIXED_POINT_DIGITS } from "./fixedPoint"
import { parseJSON, stringifyJSON } from "../utils/json"
import { AssetId, Instrument } from "../interfaces"

export type ContractAmount = bigint

// TODO: VALIDATE THE ARITHMETIC OPERATIONS, MUST BE WITH THE SAME INSTRUMENT
export class InstrumentAmount {

    private constructor(
        readonly instrument: Instrument,
        // We picked the contract amount because it's easier for us but it could be anything (string, bignumber, etc)
        readonly raw: ContractAmount
    ) {}

    static fromRaw(instrument: Instrument, rawAmount: ContractAmount): InstrumentAmount {
        return new InstrumentAmount(instrument, rawAmount)
    }

    static fromDecimal(instrument: Instrument, amount: string): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrument, decimalToFixedPoint(amount, instrument.asaDecimals))
    }


    static fromDB(instrument: Instrument, dbAmount: string): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrument, BigInt(dbAmount))
    }

    static fromC3JSON(json: string) {
        const assetObject: {asset: Instrument, amount: string} = parseJSON(json)
        return InstrumentAmount.fromDecimal(assetObject.asset, assetObject.amount)
    }

    static fromContract(instrument: Instrument, contractAmount: ContractAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrument, contractAmount)
    }


    static zero(instrument: Instrument): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrument, BigInt(0))
    }

    static infinity(instrument: Instrument): InstrumentAmount {
        return InstrumentAmount.fromRaw(instrument, BigInt("0xFFFFFFFFFFFFFFFF"))
    }

    copy(): InstrumentAmount {
        return new InstrumentAmount(this.instrument, this.raw)
    }

    toDecimal() {
        return fixedPointToDecimal(this.raw, FIXED_POINT_DIGITS - this.instrument.asaDecimals)
    }

    toDB(): string {
        return this.raw.toString()
    }

    toC3JSON(): string {
        return stringifyJSON({asset: this.instrument, amount: this.toDecimal()})
    }

    toContract(): ContractAmount {
        return this.raw
    }

    toString(): string {
        return this.toDecimal() + " " + this.instrument.asaUnitName
    }

    isSameAsset(amount: InstrumentAmount): boolean {
        return this.instrument.id === amount.instrument.id
    }

    isZero(): boolean {
        return this.raw === BigInt(0)
    }

    isZeroOrLess(): boolean {
        return this.raw <= BigInt(0)
    }

    isPositive(): boolean {
        return this.raw >= BigInt(0)
    }

    isEqual(amount: InstrumentAmount): boolean {
        return this.raw === amount.raw
    }

    isGreaterThanZero(): boolean {
        return this.raw > BigInt(0)
    }

    lessThan(amount: InstrumentAmount): boolean {
        return this.raw < amount.raw
    }

    greaterThan(amount: InstrumentAmount): boolean {
        return this.raw > amount.raw
    }

    greaterThanOrEqual(amount: InstrumentAmount): boolean {
        return this.raw >= amount.raw
    }

    multiplyBy(multiplier: bigint): InstrumentAmount {
        return new InstrumentAmount(this.instrument, this.raw * multiplier)
    }


    isMultipleOf(amount: InstrumentAmount): boolean {
        if (!this.isSameAsset(amount))
            throw new Error("Trying call isMultipleOf with different assets")
        return this.raw % amount.raw === BigInt(0)
    }

    nextMultiple(price: InstrumentAmount): InstrumentAmount {
        const multiplier = price.raw
        return InstrumentAmount.fromRaw( this.instrument,(this.raw + multiplier - BigInt(1)) / multiplier * multiplier)
    }

    prevMultiple(amount: InstrumentAmount): InstrumentAmount {
        const multiplier = amount.raw
        return InstrumentAmount.fromRaw(this.instrument, this.raw / multiplier * multiplier)
    }

    dividedBy(divider: bigint): InstrumentAmount {
        return new InstrumentAmount(this.instrument, this.raw / divider)
    }

    add(amount: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(this.instrument, this.raw + amount.raw)
    }

    sub(amount: InstrumentAmount): InstrumentAmount {
        return InstrumentAmount.fromRaw(this.instrument, this.raw - amount.raw)
    }

    subToZero(amount: InstrumentAmount): InstrumentAmount {
        const saturateToZero = this.raw > amount.raw ? this.raw - amount.raw : BigInt(0)
        return InstrumentAmount.fromRaw(this.instrument, saturateToZero)
    }

    min(amount: InstrumentAmount): InstrumentAmount {
        return this.lessThan(amount) ? this : amount
    }

    max(amount: InstrumentAmount): InstrumentAmount {
        return this.greaterThan(amount) ? this : amount
    }

    neg(): InstrumentAmount {
        return InstrumentAmount.fromRaw(this.instrument, -this.raw)
    }
}


export class InstrumentAmountMap extends Map<AssetId,InstrumentAmount> {
  public getAmountOrZero(instrument: Instrument): InstrumentAmount {
    return this.get(instrument.asaId) ?? InstrumentAmount.zero(instrument)
  }

  public addAmount(amount: InstrumentAmount) {
    const assetId = amount.instrument.asaId
    this.set(assetId, this.get(assetId)?.add(amount) ?? amount)
  }

  public toString(): string {
    return Array.from(this.entries()).map(([asset, amount]) => amount.toString()).join("\n")
  }
}

// TODO: This should be a class with proper methods, not a type
export type UserPosition = {
    cashBalance: InstrumentAmountMap
    poolBalance: InstrumentAmountMap
}

export type NetUserPosition = UserPosition & {
    availableCash: InstrumentAmountMap
}

export type SummarizedFullUserPosition = NetUserPosition & {
    remainingSell: InstrumentAmountMap
    remainingBorrow: InstrumentAmountMap
    locked: InstrumentAmountMap
}
