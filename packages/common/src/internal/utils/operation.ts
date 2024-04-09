import { ContractAmount } from '../../tools'
import { AccountId, InstrumentSlotId, UnixTimestamp, UserAddress } from '../../interfaces'
import { XContractAddress, toChainId } from '../../wormhole'
import { getPublicKeyByAddress } from '../../chains'
import { decodeAccountId, decodeUint64, encodeABIValue, encodeInt64 } from '../../utils'
import { AssetId } from "../../interfaces"
import { getSlotId } from "../../utils"

export enum OnChainRequestOp {
    Deposit = 0,
    Withdraw = 1,
    PoolMove = 2,
    Delegate = 3,
    Liquidate = 4,
    AccountMove = 5,
    Settle = 6,
}

export function createWithdraw(
    instrumentSlotId: InstrumentSlotId,
    amount: ContractAmount,
    receiver: XContractAddress,
    maxBorrow: ContractAmount,
    maxFees: ContractAmount
): Uint8Array {
    const format = '(byte,uint8,uint64,(uint16,address),uint64,uint64)'
    const target = [toChainId(receiver.chain), getPublicKeyByAddress(receiver.tokenAddress)]
    return encodeABIValue([OnChainRequestOp.Withdraw, instrumentSlotId, amount, target, maxBorrow, maxFees], format)
}

export function createPoolMove(
    instrumentSlotId: InstrumentSlotId,
    amount: ContractAmount,
): Uint8Array {
    const format = '(byte,uint8,uint64)'
    return encodeABIValue([OnChainRequestOp.PoolMove, instrumentSlotId, decodeUint64(encodeInt64(amount))], format)
}

export function createDelegation(
    delegate: UserAddress,
    nonce: UnixTimestamp,
    expiration: UnixTimestamp
): Uint8Array {
    const format = '(byte,address,uint64,uint64)'
    return encodeABIValue([OnChainRequestOp.Delegate, getPublicKeyByAddress(delegate), nonce, expiration], format)
}

export function assetToSlotIdMap(instruments: AssetId[], map: Map<AssetId, ContractAmount>): Map<InstrumentSlotId, ContractAmount> {
    return new Map(Array.from(map.entries()).map(([assetId, amount]) => [getSlotId(instruments, assetId), amount]))
}


export function createLiquidation(
    liquidatee: AccountId,
    cash: Map<InstrumentSlotId, ContractAmount>,
    pool: Map<InstrumentSlotId, ContractAmount>,
): Uint8Array {
    if ([...cash.values()].some((x) => x < BigInt(0))) {
        throw new Error('Liquidation cash can not be negative')
    }


    const format = '(byte,address,(uint8,uint64)[],(uint8,uint64)[])'
    const signedPool = [...pool.entries()].map(([id, amount]) => [id, decodeUint64(encodeInt64(amount))])
    return encodeABIValue([OnChainRequestOp.Liquidate, decodeAccountId(liquidatee), [...cash.entries()], signedPool], format)
}

export function createAccountMove(
    target: AccountId,
    cash: Map<InstrumentSlotId, ContractAmount>,
    pool: Map<InstrumentSlotId, ContractAmount>,
): Uint8Array {
    if ([...cash.values(), ...pool.values()].some((x) => x < BigInt(0))) {
        throw new Error('Account move pool and cash can not be negative')
    }

    const format = '(byte,address,(uint8,uint64)[],(uint8,uint64)[])'
    return encodeABIValue([OnChainRequestOp.AccountMove, decodeAccountId(target), [...cash.entries()], [...pool.entries()]], format)
}

