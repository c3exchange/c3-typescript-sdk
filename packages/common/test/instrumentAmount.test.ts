import "mocha"
import { InstrumentAmount } from "../src/tools"
import { Instrument } from "../src/interfaces/entities"
import {
    addExpect,
    copyExpect,
    dividedByExpect,
    expectDeepEqAndEq,
    expectTypeAndEqWithDeepEq,
    fromTests,
    greaterThanExpect,
    greaterThanOrEqualExpect,
    isGreaterThanZeroExpect,
    isMultipleOfExpect,
    isPositiveExpect,
    isSameAssetExpect,
    isZeroExpect,
    isZeroOrLessExpect,
    lessThanExpect,
    maxExpect,
    minExpect,
    prevMultipleExpect,
    subExpect,
    subToZeroExpect,
    testInstrument,
    testInstrumentC3Json,
    toC3JSONExpect,
    toContractExpect,
    toDbExpect,
    toDecimalExpect,
    toStringExpect
} from "./utils"

describe('Instrument Amount', () => {

    const INSTRUMENT_AMOUNT_FROM_RAW = InstrumentAmount.fromRaw(testInstrument, BigInt(100))
    const INSTRUMENT_AMOUNT_FROM_DECIMAL = InstrumentAmount.fromDecimal(testInstrument, '100')
    const INSTRUMENT_AMOUNT_FROM_DB = InstrumentAmount.fromDB(testInstrument, '100')
    const INSTRUMENT_AMOUNT_FROM_C3JSON = InstrumentAmount.fromC3JSON(testInstrumentC3Json)
    const INSTRUMENT_AMOUNT_FROM_CONTRACT = InstrumentAmount.fromContract(testInstrument, BigInt(100))

    describe('Create Instrument Amounts', () => fromTests('it',
        () => expectTypeAndEqWithDeepEq(INSTRUMENT_AMOUNT_FROM_RAW.instrument, testInstrument, INSTRUMENT_AMOUNT_FROM_RAW.raw, 'bigint', BigInt(100)),
        () => expectTypeAndEqWithDeepEq(INSTRUMENT_AMOUNT_FROM_DECIMAL.instrument, testInstrument, INSTRUMENT_AMOUNT_FROM_DECIMAL.raw, 'bigint', BigInt(10000000)),
        () => expectTypeAndEqWithDeepEq(INSTRUMENT_AMOUNT_FROM_DB.instrument, testInstrument, INSTRUMENT_AMOUNT_FROM_DB.raw, 'bigint', BigInt(100)),
        () => expectTypeAndEqWithDeepEq(INSTRUMENT_AMOUNT_FROM_C3JSON.instrument, testInstrument, INSTRUMENT_AMOUNT_FROM_C3JSON.raw, 'bigint', BigInt(100)),
        () => expectTypeAndEqWithDeepEq(INSTRUMENT_AMOUNT_FROM_CONTRACT.instrument, testInstrument, INSTRUMENT_AMOUNT_FROM_CONTRACT.raw, 'bigint', BigInt(100)),
    ))

    it('Zero', () => {
        const obtainedResult = InstrumentAmount.zero(testInstrument)
        expectTypeAndEqWithDeepEq(obtainedResult.instrument, testInstrument, obtainedResult.raw, 'bigint', BigInt(0))
    })

    it('Infinity', () => {
        const obtainedResult = InstrumentAmount.infinity(testInstrument)
        expectTypeAndEqWithDeepEq(obtainedResult.instrument, testInstrument, obtainedResult.raw, 'bigint', BigInt('0xFFFFFFFFFFFFFFFF'))
    })

    describe('Copy', () => fromTests('it',
        () => copyExpect(INSTRUMENT_AMOUNT_FROM_RAW),
        () => copyExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL),
        () => copyExpect(INSTRUMENT_AMOUNT_FROM_DB),
        () => copyExpect(INSTRUMENT_AMOUNT_FROM_C3JSON),
        () => copyExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('To Decimal', () => fromTests('it',
        () => toDecimalExpect(INSTRUMENT_AMOUNT_FROM_RAW),
        undefined,
        () => toDecimalExpect(INSTRUMENT_AMOUNT_FROM_DB),
        () => toDecimalExpect(INSTRUMENT_AMOUNT_FROM_C3JSON),
        () => toDecimalExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('To DB', () =>  fromTests('it',
        () => toDbExpect(INSTRUMENT_AMOUNT_FROM_RAW, '100'),
        () => toDbExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, '10000000'),
        undefined,
        () => toDbExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, '100'),
        () => toDbExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, '100')
    ))

    describe('To C3JSON', () => fromTests('it',
        () => toC3JSONExpect(INSTRUMENT_AMOUNT_FROM_RAW, '0.001'),
        () => toC3JSONExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, '100'),
        () => toC3JSONExpect(INSTRUMENT_AMOUNT_FROM_DB, '0.001'),
        undefined,
        () => toC3JSONExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, '0.001')
    ))

    describe('To Contract', () => fromTests('it',
        () => toContractExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(100)),
        () => toContractExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(10000000)),
        () => toContractExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(100)),
        () => toContractExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(100)),
        undefined
    ))

    describe('To string', () => fromTests('it',
        () => toStringExpect(INSTRUMENT_AMOUNT_FROM_RAW, '0.001 FI'),
        () => toStringExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, '100 FI'),
        () => toStringExpect(INSTRUMENT_AMOUNT_FROM_DB, '0.001 FI'),
        () => toStringExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, '0.001 FI'),
        () => toStringExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, '0.001 FI')
    ))

    describe('Is Same Asset', () => {

        const testInstrumentFalse: Instrument = {
            id: "falseFakeInstrumentId",
            asaId: 132,
            asaName: "FAKE-INSTRUMENT",
            asaUnitName: "FI",
            asaDecimals: 5,
            chains: [],
        }

        fromTests('describe',
            () => isSameAssetExpect(INSTRUMENT_AMOUNT_FROM_RAW, InstrumentAmount.fromRaw(testInstrumentFalse, BigInt(100))),
            () => isSameAssetExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, InstrumentAmount.fromDecimal(testInstrumentFalse, '100')),
            () => isSameAssetExpect(INSTRUMENT_AMOUNT_FROM_DB, InstrumentAmount.fromDB(testInstrumentFalse, '100')),
            () => {
                const falseTestInstrumentC3Json = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"0.001\",\"chains\": []}"
                isSameAssetExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, InstrumentAmount.fromC3JSON(falseTestInstrumentC3Json))
            },
            () => isSameAssetExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, InstrumentAmount.fromContract(testInstrumentFalse, BigInt(100)))
        )
    })

    describe('Is Zero', () => fromTests('describe',
        () => isZeroExpect(InstrumentAmount.fromRaw(testInstrument, BigInt(0)), INSTRUMENT_AMOUNT_FROM_RAW),
        () => isZeroExpect(InstrumentAmount.fromDecimal(testInstrument, '0'), INSTRUMENT_AMOUNT_FROM_DECIMAL),
        () => isZeroExpect(InstrumentAmount.fromDB(testInstrument, '0'), INSTRUMENT_AMOUNT_FROM_DB),
        () => {
            const jsonZeroTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"0\"}"
            isZeroExpect(InstrumentAmount.fromC3JSON(jsonZeroTestInstrument), INSTRUMENT_AMOUNT_FROM_C3JSON)
        },
        () => isZeroExpect(InstrumentAmount.fromContract(testInstrument, BigInt(0)), INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('Is Zero Or Less', () => fromTests('describe',
        () => {
            const zeroInstrumentAmount = InstrumentAmount.fromRaw(testInstrument, BigInt(0))
            const negativeInstrumentAmount = InstrumentAmount.fromRaw(testInstrument, BigInt(-100))
            isZeroOrLessExpect(zeroInstrumentAmount, negativeInstrumentAmount, INSTRUMENT_AMOUNT_FROM_RAW)
        },
        () => {
            const zeroInstrumentAmount = InstrumentAmount.fromDecimal(testInstrument, '0')
            const negativeInstrumentAmount = InstrumentAmount.fromDecimal(testInstrument, '-100')
            isZeroOrLessExpect(zeroInstrumentAmount, negativeInstrumentAmount, INSTRUMENT_AMOUNT_FROM_DECIMAL)
        },
        () => {
            const zeroInstrumentAmount = InstrumentAmount.fromDB(testInstrument, '0')
            const negativeInstrumentAmount = InstrumentAmount.fromDB(testInstrument, '-100')
            isZeroOrLessExpect(zeroInstrumentAmount, negativeInstrumentAmount, INSTRUMENT_AMOUNT_FROM_DB)
        },
        () => {
            const jsonZeroTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"0\"}"
            const zeroTestInstrumentC3Json = InstrumentAmount.fromC3JSON(jsonZeroTestInstrument)
            const jsonNegativeTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-1000\"}"
            const negativeInstrumentAmount = InstrumentAmount.fromC3JSON(jsonNegativeTestInstrument)
            isZeroOrLessExpect(zeroTestInstrumentC3Json, negativeInstrumentAmount, INSTRUMENT_AMOUNT_FROM_C3JSON)
        },
        () => {
            const zeroInstrumentAmount = InstrumentAmount.fromContract(testInstrument, BigInt(0))
            const negativeInstrumentAmount = InstrumentAmount.fromContract(testInstrument, BigInt(-100))
            isZeroOrLessExpect(zeroInstrumentAmount, negativeInstrumentAmount, INSTRUMENT_AMOUNT_FROM_CONTRACT)
        }
    ))

    describe('Is Possitive', () => fromTests('describe',
        () => isPositiveExpect(INSTRUMENT_AMOUNT_FROM_RAW, InstrumentAmount.fromRaw(testInstrument, BigInt(-10))),
        () => isPositiveExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, InstrumentAmount.fromDecimal(testInstrument, '-10')),
        () => isPositiveExpect(INSTRUMENT_AMOUNT_FROM_DB, InstrumentAmount.fromDB(testInstrument, '-10')) ,
        () => {
            const jsonNegativeTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-10\"}"
            isPositiveExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, InstrumentAmount.fromC3JSON(jsonNegativeTestInstrument))
        },
        () => isPositiveExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, InstrumentAmount.fromContract(testInstrument, BigInt(-10)))
    ))

    describe('Is Greater Than Zero', () => fromTests('describe',
        () => {
            const negativeInstrumentAmount = InstrumentAmount.fromRaw(testInstrument, BigInt(-10))
            const zeroInstrumentAmount = InstrumentAmount.fromRaw(testInstrument, BigInt(0))
            isGreaterThanZeroExpect(INSTRUMENT_AMOUNT_FROM_RAW, negativeInstrumentAmount, zeroInstrumentAmount)
        },
        () => {
            const negativeInstrumentAmount = InstrumentAmount.fromDecimal(testInstrument, '-10')
            const zeroInstrumentAmount = InstrumentAmount.fromDecimal(testInstrument, '-10')
            isGreaterThanZeroExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, negativeInstrumentAmount, zeroInstrumentAmount)
        },
        () => {
            const negativeInstrumentAmount = InstrumentAmount.fromDB(testInstrument, '-10')
            const zeroInstrumentAmount = InstrumentAmount.fromDB(testInstrument, '-10')
            isGreaterThanZeroExpect(INSTRUMENT_AMOUNT_FROM_DB, negativeInstrumentAmount, zeroInstrumentAmount)
        },
        () => {
            const jsonNegativeTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-10\"}"
            const negativeInstrumentAmount = InstrumentAmount.fromC3JSON(jsonNegativeTestInstrument)
            const jsonZeroTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"0\"}"
            const zeroTestInstrumentC3Json = InstrumentAmount.fromC3JSON(jsonZeroTestInstrument)
            isGreaterThanZeroExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, negativeInstrumentAmount, zeroTestInstrumentC3Json)
        },
        () => {
            const negativeInstrumentAmount = InstrumentAmount.fromContract(testInstrument, BigInt(-10))
            const zeroInstrumentAmount = InstrumentAmount.fromContract(testInstrument, BigInt(0))
            isGreaterThanZeroExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, negativeInstrumentAmount, zeroInstrumentAmount)
        }
    ))

    describe('Less Than', () => fromTests('describe',
        () => {
            const trueInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(-10))
            const falseInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(1000))
            lessThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_RAW)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromDecimal(testInstrument, '-100')
            const falseInstrument = InstrumentAmount.fromDecimal(testInstrument, '1000')
            lessThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DECIMAL)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromDB(testInstrument, '-100')
            const falseInstrument = InstrumentAmount.fromDB(testInstrument, '1000')
            lessThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DB)
        },
        () => {
            const jsonTrueTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-10\"}"
            const jsonFalseTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"1000\"}"
            const trueInstrument = InstrumentAmount.fromC3JSON(jsonTrueTestInstrument)
            const falseInstrument = InstrumentAmount.fromC3JSON(jsonFalseTestInstrument)
            lessThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_C3JSON)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(-10))
            const falseInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(1000))
            lessThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_CONTRACT)
        }
    ))

    describe('Greater Than', () => fromTests('describe',
        () => {
            const trueInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(1000))
            const falseInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(-10))
            greaterThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_RAW)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromDecimal(testInstrument, '1000')
            const falseInstrument = InstrumentAmount.fromDecimal(testInstrument, '-100')
            greaterThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DECIMAL)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromDB(testInstrument, '1000')
            const falseInstrument = InstrumentAmount.fromDB(testInstrument, '-100')
            greaterThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DB)
        },
        () => {
            const jsonTrueTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"1000\"}"
            const jsonFalseTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-10\"}"
            const trueInstrument = InstrumentAmount.fromC3JSON(jsonTrueTestInstrument)
            const falseInstrument = InstrumentAmount.fromC3JSON(jsonFalseTestInstrument)
            greaterThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_C3JSON)
        },
        () => {
            const trueInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(1000))
            const falseInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(-10))
            greaterThanExpect(trueInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_CONTRACT)
        }
    ))

    describe('Greater Than or Equal', () => fromTests('describe',
        () => {
            const greaterThanInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(1000))
            const falseInstrument = InstrumentAmount.fromRaw(testInstrument, BigInt(-10))
            greaterThanOrEqualExpect(greaterThanInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_RAW)
        },
        () => {
            const greaterThanInstrument = InstrumentAmount.fromDecimal(testInstrument, '1000')
            const falseInstrument = InstrumentAmount.fromDecimal(testInstrument, '-10')
            greaterThanOrEqualExpect(greaterThanInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DECIMAL)
        },
        () => {
            const greaterThanInstrument = InstrumentAmount.fromDB(testInstrument, '1000')
            const falseInstrument = InstrumentAmount.fromDB(testInstrument, '-10')
            greaterThanOrEqualExpect(greaterThanInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_DB)
        },
        () => {
            const jsonGreaterThanInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"1000\"}"
            const jsonFalseTestInstrument = "{\"asset\":{\"id\":\"falseFakeInstrumentId\",\"asaId\":132,\"asaName\":\"FAKE-INSTRUMENT\",\"asaUnitName\":\"FI\",\"asaDecimals\":5},\"amount\":\"-10\"}"
            const greaterThanInstrument = InstrumentAmount.fromC3JSON(jsonGreaterThanInstrument)
            const falseInstrument = InstrumentAmount.fromC3JSON(jsonFalseTestInstrument)
            greaterThanOrEqualExpect(greaterThanInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_C3JSON)
        },
        () => {
            const greaterThanInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(1000))
            const falseInstrument = InstrumentAmount.fromContract(testInstrument, BigInt(-10))
            greaterThanOrEqualExpect(greaterThanInstrument, falseInstrument, INSTRUMENT_AMOUNT_FROM_CONTRACT)
        }
    ))

    describe('Multiply By', () => fromTests('it',
        () => {
            const multipliedInstrument = INSTRUMENT_AMOUNT_FROM_RAW.multiplyBy(BigInt(2))
            expectDeepEqAndEq(multipliedInstrument.instrument, INSTRUMENT_AMOUNT_FROM_RAW.instrument, multipliedInstrument.raw, BigInt(200))
        },
        () => {
            const multipliedInstrument = INSTRUMENT_AMOUNT_FROM_DECIMAL.multiplyBy(BigInt(2))
            expectDeepEqAndEq(multipliedInstrument.instrument, INSTRUMENT_AMOUNT_FROM_DECIMAL.instrument, multipliedInstrument.raw, BigInt(20000000))
        },
        () => {
            const multipliedInstrument = INSTRUMENT_AMOUNT_FROM_DB.multiplyBy(BigInt(2))
            expectDeepEqAndEq(multipliedInstrument.instrument, INSTRUMENT_AMOUNT_FROM_DB.instrument, multipliedInstrument.raw, BigInt(200))
        },
        () => {
            const multipliedInstrument = INSTRUMENT_AMOUNT_FROM_C3JSON.multiplyBy(BigInt(2))
            expectDeepEqAndEq(multipliedInstrument.instrument, INSTRUMENT_AMOUNT_FROM_C3JSON.instrument, multipliedInstrument.raw, BigInt(200))
        },
        () => {
            const multipliedInstrument = INSTRUMENT_AMOUNT_FROM_CONTRACT.multiplyBy(BigInt(2))
            expectDeepEqAndEq(multipliedInstrument.instrument, INSTRUMENT_AMOUNT_FROM_RAW.instrument, multipliedInstrument.raw, BigInt(200))
        }
    ))

    describe('Is Mutilpe Of', () => fromTests('it',
        () => isMultipleOfExpect(INSTRUMENT_AMOUNT_FROM_RAW),
        () => isMultipleOfExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL),
        () => isMultipleOfExpect(INSTRUMENT_AMOUNT_FROM_DB),
        () => isMultipleOfExpect(INSTRUMENT_AMOUNT_FROM_C3JSON),
        () => isMultipleOfExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('Prev Multiple', () => fromTests('it',
        () => prevMultipleExpect(INSTRUMENT_AMOUNT_FROM_RAW),
        () => prevMultipleExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL),
        () => prevMultipleExpect(INSTRUMENT_AMOUNT_FROM_DB),
        () => prevMultipleExpect(INSTRUMENT_AMOUNT_FROM_C3JSON),
        () => prevMultipleExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('Divided By', () => fromTests('it',
        () => dividedByExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(50)),
        () => dividedByExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(5000000)),
        () => dividedByExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(50)),
        () => dividedByExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(50)),
        () => dividedByExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, BigInt(50))
    ))

    describe('Add', () => fromTests('it',
        () => addExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(2)),
        () => addExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(2)),
        () => addExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(2)),
        () => addExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(2)),
        () => addExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, BigInt(2))
    ))

    describe('Sub', () => fromTests('it',
        () => subExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(2)),
        () => subExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(2)),
        () => subExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(2)),
        () => subExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(2)),
        () => subExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, BigInt(2))
    ))

    describe('Sub To Zero', () => fromTests('it', 
        () => subToZeroExpect(INSTRUMENT_AMOUNT_FROM_RAW),
        () => subToZeroExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL),
        () => subToZeroExpect(INSTRUMENT_AMOUNT_FROM_DB),
        () => subToZeroExpect(INSTRUMENT_AMOUNT_FROM_C3JSON),
        () => subToZeroExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT)
    ))

    describe('Min', () => fromTests('it',
        () => minExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(100)),
        () => minExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(10000000)),
        () => minExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(100)),
        () => minExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(100)),
        () => minExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, BigInt(100)),
    ))

    describe('Max', () => fromTests('it',
        () => maxExpect(INSTRUMENT_AMOUNT_FROM_RAW, BigInt(200)),
        () => maxExpect(INSTRUMENT_AMOUNT_FROM_DECIMAL, BigInt(20000000)),
        () => maxExpect(INSTRUMENT_AMOUNT_FROM_DB, BigInt(200)),
        () => maxExpect(INSTRUMENT_AMOUNT_FROM_C3JSON, BigInt(200)),
        () => maxExpect(INSTRUMENT_AMOUNT_FROM_CONTRACT, BigInt(200))
    ))

})