import type { AccountId, AssetId, Base64, DecimalPicoUsdPrice, InstrumentId, MarketId, OperationId, DelegationId, OrderId, Signature, UnixTimestamp, UserAddress, Quantity, ClientOrderId, TransactionId, PicoUsdResponse } from "../types"
import type { ChainId, XAddress, XRecipientAddress } from "../../wormhole"
import { MarketTradeResponse } from "./markets"
import { SettlementTicket } from "../../internal/index"
import {InstrumentPriceResponse} from "./instruments"
import { LiquidationPriceResponse } from "./instruments"


interface Account {
    id: AccountId
    owner: AccountId
    wallet: {
        address: UserAddress,
        chainId: ChainId,
    },
    createdOn: UnixTimestamp
}

interface AccountLimitsResponse {
    maxBuyOrderSize: string
    maxSellOrderSize: string
    buyAvailableCash: string
    sellAvailableCash: string
    buyPoolBalance: string
    sellPoolBalance: string
}

type IgnorableFields = "openOrderData" | "trades" | "cancelOrderTicket" | "makerFees" | "takerFees"

interface AccountOrdersForMarketFilters {
    ids?: OrderId[],
    creator?: UserAddress,
    isOpen?: boolean,
    pageSize?: number,
    offset?: number,
    fieldsToIgnore?: IgnorableFields[]
}

type OrderSide = "buy" | "sell"
type OrderType = "limit" | "market"

interface NewOrderDataRequestBody {
    marketId: MarketId
    type: OrderType
    side: OrderSide
    size: Quantity
    price?: string
    settlementTicket: SettlementTicket
    sentTime: UnixTimestamp
    clientOrderId?: ClientOrderId
}
interface NewOrderDataRequest extends NewOrderDataRequestBody {
    account: AccountId
}

interface SuccessOrder {
    id: OrderId
}

interface AccountOrderResponse {
    id: OrderId
    newOrderData: NewOrderDataRequestBody,
    openOrderData?: {
        remainingAmount: string
        locked: string
        status: 'Pending' | 'Closed' | 'InBook' | 'WaitTrigger'
    }
    trades?: MarketTradeResponse[],
    cancelOrderTicket?: CancelOrderTicketResponse
    makerFees?: string
    takerFees?: string
    addedOn: UnixTimestamp
}

interface LiquidatablePositionResponse {
    instrumentId: InstrumentId
    amount: string
    priceInUsd: string
    liquidationPriceInUsd: string
    valueInUsd: string
    liquidationValueInUsd: string
}

interface InsolventAccount{
    accountId: AccountId;
    health: string;
    cash: LiquidatablePositionResponse[]
    pool: LiquidatablePositionResponse[]
}

interface InsolventAccountsResponse {
    prices: LiquidationPriceResponse[];
    accounts: InsolventAccount[];
}

interface CancelOrderTicketResponse {
    account: AccountId
    creator: UserAddress
    orderId: string
    sellId: InstrumentId
    sellAmount: Quantity
    cancelOn: UnixTimestamp
    refundRequest: string
}

interface CancelledOrderResponse {
    orderId: OrderId
    cancellationReceivedOn: UnixTimestamp
    status: boolean
}

enum OperationStatus {
    PENDING = 'pending',
    SETTLED = 'settled',
    FAILED = 'failed',
    DELAYED = 'delayed',
}

enum AccountOperationType {
    DEPOSIT = 'deposit',
    WITHDRAW = 'withdraw',
    LEND = 'lend',
    REDEEM = 'redeem',
    BORROW = 'borrow',
    REPAY = 'repay',
    LIQUIDATE = 'liquidate',
    ACCOUNT_MOVE = 'account_move',
    REFUND = 'refund',
    RECEIVED_LIQUIDATION = 'received_liquidation',
}

interface DepositExtraInfo {
    repayAmount: string
    origin: XAddress,
    note?: string
}

interface WithdrawExtraInfo {
    maxBorrow: string
    borrow: string
    principal: string
    lockedCash: string
    maxFees: string
    destination: XAddress
    solanaOwnerAddress?: UserAddress
}

interface WormholeWithdrawExtraInfo extends WithdrawExtraInfo {
    sendTransferTxId: TransactionId
}

interface LiquidateExtraInfo {
    liquidatee: AccountId
    cash: BaseInstrumentAmountRequest[]
    pool: BaseInstrumentAmountRequest[]
}

interface ReceivedLiquidationExtraInfo {
    liquidator: AccountId
    cash: BaseInstrumentAmountRequest[]
    pool: BaseInstrumentAmountRequest[]
}

type OperationExtraInfo = DepositExtraInfo | WithdrawExtraInfo | WormholeWithdrawExtraInfo | ReceivedLiquidationExtraInfo | LiquidateExtraInfo

interface BaseAccountOperationResponse {
    id: number
    type: AccountOperationType
    status: OperationStatus
    groupId: string
    instrumentId: InstrumentId
    amount: string
    createdOn: UnixTimestamp,
}
interface DepositOperationResponse extends BaseAccountOperationResponse {
    type: AccountOperationType.DEPOSIT
    extraInfo: DepositExtraInfo
}

interface WithdrawOperationResponse extends BaseAccountOperationResponse {
    type: AccountOperationType.WITHDRAW
    extraInfo: WithdrawExtraInfo
}

interface WormholeWithdrawOperationResponse extends WithdrawOperationResponse {
    extraInfo: WormholeWithdrawExtraInfo
}

interface ReceivedLiquidationOperationResponse extends BaseAccountOperationResponse {
    type: AccountOperationType.RECEIVED_LIQUIDATION
    extraInfo: ReceivedLiquidationExtraInfo
}

interface LiquidateOperationResponse extends BaseAccountOperationResponse {
    type: AccountOperationType.LIQUIDATE,
    extraInfo: LiquidateExtraInfo
}

type AccountOperationResponse = DepositOperationResponse | WithdrawOperationResponse | WormholeWithdrawOperationResponse | ReceivedLiquidationOperationResponse | LiquidateOperationResponse | BaseAccountOperationResponse

interface MarginAssetInfoResponse {
    assetId: AssetId
    price: DecimalPicoUsdPrice
    shortfall: Quantity
    unoffsetLiability: Quantity
}
interface MarginResponse {
    isInitialMargin: boolean,
    support: PicoUsdResponse,
    requirement: PicoUsdResponse,
    assetInfo: MarginAssetInfoResponse[]
}

interface MarginResponseMinimized {
    support: PicoUsdResponse
    requirement: PicoUsdResponse
}

interface PortfolioOverviewResponse {
    value: string
    availableMargin: string
    initialMarginCalculation: MarginResponse
    maintenanceMarginCalculation: MarginResponseMinimized
    initialMarginSupport: number
    initialMarginRequirement: number
    maintenanceMarginSupport: number
    maintenanceMarginRequirement: number
    buyingPower: string
    health: string
    leverage: string
    adjustedMaintenanceMargin: string
}

interface AccountBalanceResponse {
    instrumentsInfo: {
        instrumentId: InstrumentId
        availableCash: string
        lockedCash: string
        maxBorrow: string
        maxLend: string
        maxWithdraw: string
        maxWithdrawWithBorrow: string
        cash: string
        poolPosition: string
        shortfall: string
    }[],
    portfolioOverview: PortfolioOverviewResponse
}

interface BaseInstrumentAmountRequest {
    instrumentId: string
    amount: string
}
interface BaseMetaDataRequest {
    lease: Base64
    lastValid: number
}
interface BaseDepositRequest {
    repayAmount: string
    note?: string
}
interface AlgorandDepositRequest extends BaseInstrumentAmountRequest, BaseDepositRequest {
    algorandSignedFundingTransaction: string
}
interface WormholeDepositRequest extends BaseInstrumentAmountRequest, BaseDepositRequest {
    wormholeVAA: string
    overrideOriginChain?: ChainId
    overrideOriginAddress?: UserAddress
}

type DepositRequest = AlgorandDepositRequest | WormholeDepositRequest

interface CreditOperationRequest extends BaseMetaDataRequest {
    amount: string
    signature: Signature
}

type WithdrawMetadata = BaseInstrumentAmountRequest & BaseMetaDataRequest
interface WithdrawRequest extends WithdrawMetadata {
    signature: Signature,
    maxBorrow: string,
    maxFees: string,
    destination: XRecipientAddress
    solanaOwnerAddress?: UserAddress
}

interface LiquidationParamsRequest extends BaseMetaDataRequest {
    target: AccountId,
    liabilityBasket: BaseInstrumentAmountRequest[],
    assetBasket: BaseInstrumentAmountRequest[],
    signature: Signature
}

interface OperationSuccess {
    id: OperationId,
    extraInfo?: any
}

interface DelegationSuccess {
    id: DelegationId
}

interface Delegation {
    id: DelegationId,
    name: string,
    delegatedTo: AccountId,
    expiresOn: UnixTimestamp,
    createdOn: UnixTimestamp,
    lastUsedOn?: UnixTimestamp,
    revokedOn?: UnixTimestamp
}

// Array types
type AccountOrdersResponse = AccountOrderResponse[]

export {
    OperationStatus,
    AccountOperationType,
}

export type {
    Account,
    AccountLimitsResponse,
    AccountOrdersForMarketFilters,
    IgnorableFields,
    OrderSide,
    OrderType,
    AccountOrderResponse,
    AccountOrdersResponse,
    NewOrderDataRequest,
    NewOrderDataRequestBody,
    SuccessOrder,
    CancelOrderTicketResponse,
    CancelledOrderResponse,
    AccountOperationResponse,
    WithdrawOperationResponse,
    AccountBalanceResponse,
    PortfolioOverviewResponse,
    OperationSuccess,
    DelegationSuccess,
    Delegation,
    DepositRequest,
    AlgorandDepositRequest,
    WormholeDepositRequest,
    WithdrawRequest,
    CreditOperationRequest,
    BaseInstrumentAmountRequest,
    LiquidationParamsRequest,
    OperationExtraInfo,
    DepositExtraInfo,
    WithdrawExtraInfo,
    WormholeWithdrawExtraInfo,
    LiquidateExtraInfo,
    ReceivedLiquidationExtraInfo,
    MarginResponse,
    MarginResponseMinimized,
    MarginAssetInfoResponse,
    InsolventAccountsResponse,
    LiquidatablePositionResponse,
    InsolventAccount
}