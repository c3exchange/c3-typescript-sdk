import { AccountId, AccountOperationResponse, AccountOperationType, Instrument, InstrumentAmount, InstrumentId, OperationStatus, UnixTimestamp, XAddress } from "@c3exchange/common"
import { WithdrawResult, WormholeWithdrawResult } from "../types"

interface DepositExtraInfo {
    repayAmount: InstrumentAmount
    origin: XAddress
    note?: string
}

interface WithdrawExtraInfo {
    maxFees: InstrumentAmount
    maxBorrow: InstrumentAmount
    lockedCash: InstrumentAmount
    destination: XAddress
}

interface WormholeWithdrawExtraInfo extends WithdrawExtraInfo {
    sendTransferTxId: string
}

interface LiquidateExtraInfo {
    liquidatee: AccountId
    cash: InstrumentAmount[]
    pool: InstrumentAmount[]
}

interface ReceivedLiquidationExtraInfo {
    liquidator: AccountId
    cash: InstrumentAmount[]
    pool: InstrumentAmount[]
}

interface BaseAccountOperation {
    id: number
    type: AccountOperationType
    status: OperationStatus
    groupId: string
    instrumentId: InstrumentId
    amount: InstrumentAmount
    createdOn: UnixTimestamp
}

interface DepositOperation extends BaseAccountOperation {
    type: AccountOperationType.DEPOSIT
    extraInfo: DepositExtraInfo
}

interface WithdrawOperation extends BaseAccountOperation {
    type: AccountOperationType.WITHDRAW
    extraInfo: WithdrawExtraInfo
}

interface WormholeWithdrawOperation extends WithdrawOperation {
    extraInfo: WormholeWithdrawExtraInfo
}

interface ReceivedLiquidationOperation extends BaseAccountOperation {
    type: AccountOperationType.RECEIVED_LIQUIDATION
    extraInfo: ReceivedLiquidationExtraInfo
}

interface LiquidateOperation extends BaseAccountOperation {
    type: AccountOperationType.LIQUIDATE,
    extraInfo: LiquidateExtraInfo
}

type AccountOperation = DepositOperation | WithdrawOperation | WormholeWithdrawOperation | ReceivedLiquidationOperation | LiquidateOperation | BaseAccountOperation

async function toAccountOperation(operation: AccountOperationResponse, getInstrument: (instrumentId: InstrumentId) => Promise<Instrument>): Promise<AccountOperation> {
    const currentInstrument = await getInstrument(operation.instrumentId)
    const amount = InstrumentAmount.fromDecimal(currentInstrument, operation.amount)
    if (!("extraInfo" in operation)) {
        return { ...operation, amount }
    }
    switch (operation.type) {
        case AccountOperationType.DEPOSIT: {
            return {
                ...operation, amount,
                extraInfo: {
                    repayAmount: InstrumentAmount.fromDecimal(currentInstrument, operation.extraInfo.repayAmount),
                    origin: operation.extraInfo.origin,
                    note: operation.extraInfo.note
                }
            }
        }
        case AccountOperationType.WITHDRAW: {
            return {
                ...operation, amount,
                extraInfo: {
                    maxFees: InstrumentAmount.fromDecimal(currentInstrument, operation.extraInfo.maxFees),
                    maxBorrow: InstrumentAmount.fromDecimal(currentInstrument, operation.extraInfo.maxBorrow),
                    lockedCash: InstrumentAmount.fromDecimal(currentInstrument, operation.extraInfo.lockedCash),
                    destination: operation.extraInfo.destination
                }
            }
        }
        case AccountOperationType.LIQUIDATE:
        case AccountOperationType.RECEIVED_LIQUIDATION: {
            const cash = await Promise.all(operation.extraInfo.cash.map(async ({ instrumentId, amount }) => InstrumentAmount.fromDecimal(await getInstrument(instrumentId), amount)))
            const pool = await Promise.all(operation.extraInfo.pool.map(async ({ instrumentId, amount }) => InstrumentAmount.fromDecimal(await getInstrument(instrumentId), amount)))
            if ("liquidatee" in operation.extraInfo) {
                return { ...operation, type: AccountOperationType.LIQUIDATE, amount, extraInfo: { cash, pool, liquidatee: operation.extraInfo.liquidatee } }
            } else if ("liquidator" in operation.extraInfo) {
                return { ...operation, type: AccountOperationType.RECEIVED_LIQUIDATION, amount, extraInfo: { cash, pool, liquidator: operation.extraInfo.liquidator } }

            }
            throw new Error("Invalid liquidator object reeived from the server")
        }
        default: {
            // TODO: evaluate poolmove extrainfo
            return { ...operation as any, amount  } as BaseAccountOperation
        }
    }
}

const asWormholeWithdrawResult = (withdrawResult: WithdrawResult): WormholeWithdrawResult|undefined => {
    if (
        "redeemWormholeVAA" in withdrawResult &&
        "getVAASequence" in withdrawResult &&
        "waitForWormholeVAA" in withdrawResult &&
        "isTransferCompleted" in withdrawResult
    ) {
        return withdrawResult as WormholeWithdrawResult
    }
}

export type {
    AccountOperation,
    DepositOperation,
    WithdrawOperation,
    WormholeWithdrawOperation,
    ReceivedLiquidationOperation,
    LiquidateOperation,
    BaseAccountOperation,
}

export {
    toAccountOperation,
    asWormholeWithdrawResult,
}