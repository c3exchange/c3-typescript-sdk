type Granularity = string
type UnixTimestamp = number
type UnixTimestampInSeconds = number
type OrderNonce = number
type UnixTimestampInMiliseconds = number
type UserAddress = string
type MarketId = string
type InstrumentId = string
type SlotId = number
type AccountId = string
type PairId = number
type OrderId = string
type OperationId = string
type DelegationId = string
type Base64 = string
type Hex = string
type Signature = Base64
type RawSignature = Uint8Array
type AssetId = number
type Integer = number
type Quantity = string
type Price = bigint // TODO: Validate if we are using this type
type InstrumentSlotId = number // TODO: Enforce 8-bit number
type AppId = number
type TransactionId = string
type ClientOrderId = string
type DecimalPrice = string
type DecimalAmount = string
type DecimalPicoUsdPrice = string
type PicoUsdResponse = string
type BorrowLendIndex = bigint
type Address = string

type ContractIds = {
    pricecaster: AppId
    ceOnchain: AppId
}

export type {
    Address,
    BorrowLendIndex,
    Granularity,
    UnixTimestamp,
    UnixTimestampInSeconds,
    UnixTimestampInMiliseconds,
    UserAddress,
    MarketId,
    InstrumentId,
    AccountId,
    OrderId,
    OperationId,
    DelegationId,
    Base64,
    Hex,
    Signature,
    RawSignature,
    Integer,
    AssetId,
    Price,
    InstrumentSlotId,
    AppId,
    ContractIds,
    TransactionId,
    OrderNonce,
    ClientOrderId,
    SlotId,
    Quantity,
    DecimalPrice,
    DecimalPicoUsdPrice,
    PicoUsdResponse,
    PairId,
    DecimalAmount,
}