import assert from "assert"
import { AppId, AssetId, InstrumentSlotId, UnixTimestamp, UserAddress, Instrument } from "../interfaces"
import { ContractAmount } from "../tools/instrumentAmount"
import { IPackedInfo, IPackedInfoAny, unpackData, convertUint64toInt64, unpackPartialData } from "../utils/encoding"

export type ContractRatio = bigint
export type ContractRate = bigint

export type CoreUserEntry = {
    cash: ContractAmount
    principal: ContractAmount
    index: ContractRate
}

export type CoreUserState = Map<InstrumentSlotId, CoreUserEntry>

export type LiquidationFactors = {
    cashLiquidationFactor: ContractRatio
    poolLiquidationFactor: ContractRatio
}

export type GlobalConstants = {
    initTimestamp: UnixTimestamp
    pricecasterId: AppId
    wormholeTokenBridgeId: AppId
    cashLiquidationFactor: ContractRatio
    poolLiquidationFactor: ContractRatio
    withdrawBufferAddress: UserAddress
    signatureValidatorAddress: UserAddress
    quantAddress: UserAddress
    operatorAddress: UserAddress
    feeTargetAddress: UserAddress
}

export type RiskFactors = {
    haircut: ContractRatio
    margin: ContractRatio
}

export type RelativeTimestamp = number

export type PoolRates = {
    optimalUtilization: ContractRatio
    minRate: ContractRate
    optRate: ContractRate
    maxRate: ContractRate
}

export type InstrumentPoolData = {
    lastUpdateTime: RelativeTimestamp
    borrowIndex: ContractRate
    lendIndex: ContractRate
    poolRates: PoolRates
    borrowed: ContractAmount
    liquidity: ContractAmount
}

export type InstrumentPool = {
    initial: RiskFactors
    maintenance: RiskFactors
    poolData: InstrumentPoolData
}

export type ServerInstrument = {
    slotId: InstrumentSlotId
    instrument: Instrument
    pool: InstrumentPool
}

export type CoreGlobalState = {
    constants: GlobalConstants
    instruments: ServerInstrument[]
}

export const CONTRACT_ASSET_ID_FORMAT: IPackedInfoAny = { type: 'number' }
export const CONTRACT_AMOUNT_FORMAT: IPackedInfoAny = { type: 'uint' }
export const CONTRACT_RELATIVE_TIMESTAMP_FORMAT: IPackedInfoAny = { type: 'number', size: 4 }
export const CONTRACT_RATIO_FORMAT: IPackedInfoAny = { type: 'uint', size: 2 }
export const CONTRACT_RATE_FORMAT: IPackedInfoAny = { type: 'uint' }

export const userInstrumentFormat: IPackedInfo = {
    cash: CONTRACT_AMOUNT_FORMAT,
    principal: CONTRACT_AMOUNT_FORMAT,
    index: CONTRACT_RATE_FORMAT,
}

export const liquidationFactorsFormat: IPackedInfo = {
    cashLiquidationFactor: CONTRACT_RATIO_FORMAT,
    poolLiquidationFactor: CONTRACT_RATIO_FORMAT,
}

export const riskFactorsFormat: IPackedInfo = {
    haircut: CONTRACT_RATIO_FORMAT,
    margin: CONTRACT_RATIO_FORMAT,
}

export const poolRatesFormat: IPackedInfo = {
    optimalUtilization: CONTRACT_RATIO_FORMAT,
    minRate: CONTRACT_RATE_FORMAT,
    optRate: CONTRACT_RATE_FORMAT,
    maxRate: CONTRACT_RATE_FORMAT,
}

export const poolDataFormat: IPackedInfo = {
    lastUpdateTime: CONTRACT_RELATIVE_TIMESTAMP_FORMAT,
    borrowIndex: CONTRACT_RATE_FORMAT,
    lendIndex: CONTRACT_RATE_FORMAT,
    poolRates: { type: 'object', info: poolRatesFormat },
    borrowed: CONTRACT_AMOUNT_FORMAT,
    liquidity: CONTRACT_AMOUNT_FORMAT,
}

export const instrumentInfoFormat: IPackedInfo = {
    initial: { type: 'object', info: riskFactorsFormat },
    maintenance: { type: 'object', info: riskFactorsFormat },
    poolData: { type: 'object', info: poolDataFormat },
}

export const instrumentFormat: IPackedInfo = {
    assetId: CONTRACT_ASSET_ID_FORMAT,
    info: { type: 'object', info: instrumentInfoFormat }
}

export type InstrumentOnchain = {
    assetId: AssetId
    info: InstrumentPool
}

export type InstrumentInfoFetcher = (assetId: AssetId) => Promise<Instrument|undefined>

export const DEFAULT_INSTRUMENT_INFO_FETCHER: InstrumentInfoFetcher = async (assetId: AssetId) => {
    return {
        id: "",
        asaId: assetId,
        asaName: "",
        asaUnitName: "",
        asaDecimals: 0,
        chains: []
    }
}

export async function parseCoreInstruments(data: Uint8Array, instrumentCount: number, instrumentInfoFetcher = DEFAULT_INSTRUMENT_INFO_FETCHER): Promise<ServerInstrument[]> {
    const instruments: InstrumentOnchain[] = []
    for (let i = 0, offset = 0; i < instrumentCount; i++) {
        const partial = unpackPartialData(data, instrumentFormat, offset)
        instruments.push(partial.result as InstrumentOnchain)
        offset += partial.bytesRead
    }
    return Promise.all(instruments.map(async (instrument: InstrumentOnchain, id: number): Promise<ServerInstrument> => {
        const instrumentInfo = await instrumentInfoFetcher(instrument.assetId)
        assert(instrumentInfo !== undefined)
        return {
            slotId: id,
            instrument: instrumentInfo,
            pool: instrument.info,
        }
    }))
}

export async function parseCoreUserState(data: Uint8Array): Promise<CoreUserState> {
    const result: CoreUserState = new Map()
    for (let i = 0, offset = 0; offset < data.length; i++) {
        const partial = unpackPartialData(data, userInstrumentFormat, offset)
        const userData = partial.result as CoreUserEntry
        if (userData.cash !== BigInt(0) || userData.principal !== BigInt(0) || userData.index !== BigInt(0))
            result.set(i, { cash: userData.cash, principal: convertUint64toInt64(userData.principal), index: userData.index } )
        offset += partial.bytesRead
    }
    return result
}
