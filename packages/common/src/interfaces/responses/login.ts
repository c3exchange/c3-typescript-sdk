import { AccountId, Base64, Signature, UnixTimestampInSeconds, UserAddress } from "../types"

interface AccountLoginCompleteResponse {
    userId: string
    accountId: AccountId
    token: string
    firstLogin: boolean,
    encryptionKey?: Base64
}

interface AccountLoginStatusResponse {
    ephimeralAddress?: UserAddress
    ephimeralEncryptionKey?: Base64
}

interface EphemeralSession {
    address: UserAddress // Only tested with Algorand addresses
    expiresOn: UnixTimestampInSeconds
    signature: Signature // In base64
}

export type {
    AccountLoginStatusResponse,
    AccountLoginCompleteResponse,
    EphemeralSession,
}