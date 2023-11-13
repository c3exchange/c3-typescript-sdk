import { AccountId } from "../types"

interface AccountLoginCompleteResponse {
    userId: string
    accountId: AccountId
    token: string
    firstLogin: boolean
}

export type {
    AccountLoginCompleteResponse,
}