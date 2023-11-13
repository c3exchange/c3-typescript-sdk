import { UserAddress, AppId, AccountId } from "./types"

interface SystemInfoResponse {
    commitHash: string
    serverAddress: UserAddress
    withdrawBuffer: AccountId
    lastBlockParsed: number
    contractIds: {
        ceOnchain: AppId
        pricecaster: AppId
    }
}

export type {
    SystemInfoResponse,
}