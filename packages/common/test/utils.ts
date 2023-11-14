import { expect } from 'chai'
import BigNumber from "bignumber.js";
import { InstrumentAmount } from "../src/tools";
import { Instrument } from "../src/interfaces/entities";

export const testInstrument: Instrument = {
    id: "fakeInstrumentId",
    asaId: 123,
    asaName: "FAKE-INSTRUMENT",
    asaUnitName: "FI",
    asaDecimals: 5,
    chains: [],
}

export const testInstrumentC3Json = "{\"asset\":{\"id\":\"fakeInstrumentId\",\"asaId\":123,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5, \"chains\":[]},\"amount\":\"0.001\"}"

export const fromTests = (testType: 'it' | 'describe', fromRaw: Function | undefined, fromDecimal: Function | undefined, fromDB: Function | undefined, fromC3JSON: Function | undefined, fromContract: Function | undefined): void => {
    const tests = [
        {title: 'From Raw', func: fromRaw},
        {title: 'From Decimal', func: fromDecimal},
        {title: 'From DB', func: fromDB},
        {title: 'From C3JSON', func: fromC3JSON},
        {title: 'From Contract', func: fromContract}
    ]

    tests.forEach(test => {
        if(testType == 'describe') {
            if(test.func !== undefined){
                describe(test.title, () => {
                    test.func?.()
                })
            }
        } else {
            if(test.func !== undefined) {
                it(test.title, () => {
                    test.func?.()
                })
            }
        }
    })
}

const itTrueFalse = (trueExpect: Function, falseExpect: Function, extraExpect?: Function, extraExpectTitle?: string ): void => {
    it('True', () => {
        trueExpect()
    })
    it('False', () => {
        falseExpect()
    })

    if(extraExpect !== undefined && extraExpectTitle !== undefined){
        it(extraExpectTitle, () => {
            extraExpect()
        })
    }
}


export const expectEqBigNumber = (obtainedResult: BigNumber, expectedS: number, expectedE: number, expectedC: number): void => {
    expect(obtainedResult.s).eq(expectedS)
    expect(obtainedResult.e).eq(expectedE)
    expect(obtainedResult.c?.shift()).eq(expectedC)
}

export const expectTypeAndEq = (obtainedResult: any, expectedType: any, expectedEq: any): void => {
    expect(typeof obtainedResult).eq(expectedType)
    expect(obtainedResult).eq(expectedEq)
}

export const expectDeepEq = (obtainedResult: Object, expectedResult: Object): void => {
    expect(obtainedResult).deep.eq(expectedResult)
}

export const expectTypeAndEqWithDeepEq = (deepEqObtained: Object, deepEqExpected: Object, obtainedForTypeAndEq: any, expectedType: any, expectedValueForTypeAndEq: any): void => {
    expectDeepEq(deepEqObtained, deepEqExpected)
    expectTypeAndEq(obtainedForTypeAndEq, expectedType, expectedValueForTypeAndEq)
}

export const expectDeepEqAndEq = (deepEqObtained: Object, expectedDeepEq: Object, eqObtained: any, eqExpected: any): void => {
    expectDeepEq(deepEqObtained, expectedDeepEq)
    expect(eqExpected).eq(eqObtained)

}

export const copyExpect = (instrument: InstrumentAmount): void => {
    const copy = instrument.copy()
    expectDeepEq(copy, instrument)
}

export const toDecimalExpect = (instrument: InstrumentAmount): void => {
    const toDecimal = instrument.toDecimal()
    expect(toDecimal).eq('0.001')
}

export const toDbExpect = (instrument: InstrumentAmount, expectedEq: string): void => {
    const toDb = instrument.toDB()
    expect(toDb).eq(expectedEq)
}

export const toC3JSONExpect = (instrument: InstrumentAmount, expectedEq: string): void => {
    const toC3JSON = JSON.parse(instrument.toC3JSON())
    expectDeepEqAndEq(toC3JSON.asset, testInstrument, toC3JSON.amount, expectedEq)
}

export const toContractExpect = (instrument: InstrumentAmount, expectedEq: bigint): void => {
    const toContract = instrument.toContract()
    expect(toContract).eq(expectedEq)
}

export const toStringExpect = (instrument: InstrumentAmount, expectedEq: string): void => {
    const toString = instrument.toString()
    expect(toString).eq(expectedEq)
}

export const isSameAssetExpect = (trueInstrument: InstrumentAmount, falseInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.isSameAsset(trueInstrument)).true,
        () => expect(trueInstrument.isSameAsset(falseInstrument)).false,
    )
}

export const isZeroExpect = (trueInstrument: InstrumentAmount, falseInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.isZero()).true,
        () => expect(falseInstrument.isZero()).false,
    )
}

export const isPositiveExpect = (trueInstrument: InstrumentAmount, falseInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.isPositive()).true,
        () => expect(falseInstrument.isPositive()).false,
    )
}

export const lessThanExpect = (trueInstrument: InstrumentAmount, falseInstrument: InstrumentAmount, comparisonInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.lessThan(comparisonInstrument)).true,
        () => expect(falseInstrument.lessThan(comparisonInstrument)).false
    )
}

export const greaterThanExpect = (trueInstrument: InstrumentAmount, falseInstrument: InstrumentAmount, comparisonInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.greaterThan(comparisonInstrument)).true,
        () => expect(falseInstrument.greaterThan(comparisonInstrument)).false
    )
}

export const isMultipleOfExpect = (basInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => {
            const isMultiple = (basInstrument.multiplyBy(BigInt(100))).isMultipleOf(basInstrument)
            expect(isMultiple).true
        },
        () => {
            const isNotMultiple = basInstrument.isMultipleOf(basInstrument.multiplyBy(BigInt(100)))
            expect(isNotMultiple).false
        }
    )
}

export const isZeroOrLessExpect = (zeroInstrument: InstrumentAmount, lessInstrument: InstrumentAmount, falseInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(zeroInstrument.isZeroOrLess()).true,
        () => expect(falseInstrument.isZeroOrLess()).false,
        () => expect(lessInstrument.isZeroOrLess()).true,
        'True - Less'
    )
}

export const isGreaterThanZeroExpect = (trueInstrument: InstrumentAmount, falseInstrumentNegativeAmount: InstrumentAmount, falseInstrumentZeroAmount: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(trueInstrument.isGreaterThanZero()).true,
        () => expect(falseInstrumentZeroAmount.isGreaterThanZero()).false,
        () => expect(falseInstrumentNegativeAmount.isGreaterThanZero()).false,
        'False with negative amount'
    )
}

export const greaterThanOrEqualExpect = (greaterThanInstrument: InstrumentAmount, falseInstrument: InstrumentAmount, comparisonInstrument: InstrumentAmount): void => {
    itTrueFalse(
        () => expect(greaterThanInstrument.greaterThanOrEqual(comparisonInstrument)).true,
        () => expect(falseInstrument.greaterThanOrEqual(comparisonInstrument)).false,
        () => expect(comparisonInstrument.greaterThanOrEqual(comparisonInstrument)).true,
        'True Equal'
    )
}

export const prevMultipleExpect = (baseInstrument: InstrumentAmount): void => {
    expect(baseInstrument.prevMultiple(baseInstrument.multiplyBy(BigInt(10))).raw).eq(BigInt(0))
}

export const dividedByExpect = (instrument: InstrumentAmount, expectedResult: bigint): void => {
    expect(instrument.dividedBy(BigInt(2)).raw).eq(expectedResult)
}

export const addExpect = (baseInstrument: InstrumentAmount, multiplierToCreateAddValue: bigint): void => {
    const baseRaw = baseInstrument.raw
    const toAdd = baseInstrument.multiplyBy(multiplierToCreateAddValue)
    const expectedResult = baseRaw + toAdd.raw
    const add = baseInstrument.add(toAdd)
    expect(add.raw).eq(expectedResult)
}

export const subExpect = (baseInstrument: InstrumentAmount, subToCreateSubValue: bigint): void => {
    const baseRaw = baseInstrument.raw
    const toSub = baseInstrument.dividedBy(subToCreateSubValue)
    const expectedResult = baseRaw - toSub.raw
    const sub = baseInstrument.sub(toSub)
    expect(sub.raw).eq(expectedResult)
}

export const subToZeroExpect = (baseInstrument: InstrumentAmount): void => {
    const subToZeroInstrumet = baseInstrument.subToZero(baseInstrument)
    expect(subToZeroInstrumet.raw).eq(BigInt(0))
}

export const minExpect = (baseInstrument: InstrumentAmount, expectedMin: bigint): void => {
    const minInstrument = baseInstrument.min(baseInstrument.multiplyBy(BigInt(2)))
    expect(minInstrument.raw).eq(expectedMin)
}

export const maxExpect = (baseInstrument: InstrumentAmount, expectedMax: bigint): void => {
    const maxInstrument = baseInstrument.max(baseInstrument.multiplyBy(BigInt(2)))
    expect(maxInstrument.raw).eq(expectedMax)
}