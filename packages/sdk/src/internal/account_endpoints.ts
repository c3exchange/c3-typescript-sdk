import {
    AccountId,
    Account,
    AccountLimitsResponse,
    AccountBalanceResponse,
    CancelOrderTicketResponse,
    MarketId,
    OrderId,
    RawSignature,
    InstrumentId,
    InstrumentAmount,
    Base64,
    OperationSuccess,
    UserAddress,
    UnixTimestamp,
    DepositRequest,
    WithdrawRequest,
    CreditOperationRequest,
    LiquidationParamsRequest,
    encodeBase64,
    MarketTradeAccountResponse,
    AccountOperationResponse,
    OperationStatus,
    AccountOperationType,
    AccountOrdersResponse,
    XRecipientAddress,
    CancelledOrderResponse,
    Signature,
    AccountOrdersForMarketFilters,
    NewOrderData,
    NewOrderDataRequestBody,
    SuccessOrder,
    InstrumentSlotId,
    UnixTimestampInMiliseconds,
    OrderNonce,
    Quantity,
    OrderType,
    OrderSide,
    ClientOrderId,
    ChainId,
    Delegation,
    DelegationSuccess,
    DelegationId,
} from "@c3exchange/common";
import HttpClient, { QueryParams } from "./utils/http";

interface BaseOperationParams {
    instrumentId: InstrumentId
    amount: InstrumentAmount
}
interface BaseDeposit {
    repayAmount: InstrumentAmount,
    note?: string
}
interface AlgorandDeposit extends BaseOperationParams, BaseDeposit {
    algorandSignedFundingTransaction: Base64
}
interface WormholeDeposit extends BaseOperationParams, BaseDeposit {
    wormholeVAA: Base64
    overrideOriginChain?: ChainId
    overrideOriginAddress?: UserAddress
}

interface CreditOperation extends BaseOperationParams {
    signature: RawSignature
    lease: Uint8Array
    lastValid: number
}

interface WithdrawParams extends CreditOperation {
    maxBorrow: InstrumentAmount
    maxFees: InstrumentAmount
    destination: XRecipientAddress
    solanaOwnerAddress?: UserAddress
}

interface LiquidationParams {
    target: UserAddress,
    liabilityBasket: BaseOperationParams[],
    assetBasket: BaseOperationParams[],
    signature: RawSignature
    lease: Uint8Array
    lastValid: number
}

interface CancelOrderTicket {
    account: AccountId
    creator: UserAddress
    orderId: string
    sellId: InstrumentId
    sellAmount: InstrumentAmount
    cancelOn: UnixTimestamp
    refundRequest: string
}

interface SerializableSettlementTicket {
    account: UserAddress,
    creator: UserAddress,
    sellSlotId: InstrumentSlotId,
    buySlotId: InstrumentSlotId,
    sellAmount: string,
    buyAmount: string,
    maxSellAmountFromPool: string
    maxBuyAmountToPool: string
    expiresOn: UnixTimestampInMiliseconds,
    nonce: OrderNonce,
    signature: Signature
}

//FIXME: this is a temporary solution, we need to fix bigint serialization in axios
export interface SerializableNewOrderDataRequestBody {
    marketId: MarketId
    type: OrderType
    side: OrderSide
    size: Quantity
    price?: string
    settlementTicket: SerializableSettlementTicket
    sentTime: UnixTimestamp
    clientOrderId?: ClientOrderId
}

export default class AccountClient {
    constructor (private client: HttpClient) {}

    // Get methods
    getOne = (accountId: AccountId)=> this.client.get<Account>(`/v1/accounts/${accountId}`)
    getLimits = (accountId: AccountId, marketId: MarketId) => this.client.get<AccountLimitsResponse>(`/v1/accounts/${accountId}/markets/${marketId}/limits`)
    getTrades = (accountId: AccountId, marketId: MarketId, offset?: number, pageSize?: number, creator?: UserAddress) =>
        this.client.get<MarketTradeAccountResponse[]>(`/v1/accounts/${accountId}/markets/${marketId}/trades`, { offset, pageSize, creator })
    getOrders = (accountId: AccountId, marketId: MarketId, filter?: AccountOrdersForMarketFilters) => {
        const query: QueryParams = {
            ids: filter?.ids,
            fieldsToIgnore: filter?.fieldsToIgnore,
            isOpen: filter?.isOpen,
            offset: filter?.offset,
            pageSize: filter?.pageSize,
            creator: filter?.creator,
        }
        return this.client.get<AccountOrdersResponse>(`/v1/accounts/${accountId}/markets/${marketId}/orders`, query)
    }
    getOperations = (
        accountId: AccountId,
        types?: AccountOperationType[],
        statuses?: OperationStatus[],
        instrumentIds?: InstrumentId[],
        createdSince?: number,
        createdUntil?: number,
        idBefore?: number,
        pageSize?: number
    ) => this.client.get<AccountOperationResponse[]>(`/v1/accounts/${accountId}/operations`, { types, statuses, instrumentIds, createdSince, createdUntil, idBefore, pageSize })

    getBalance = (accountId: AccountId) => this.client.get<AccountBalanceResponse>(`/v1/accounts/${accountId}/balance`)

    // Post methods
    submitNewOrder = (accountId: AccountId, request: NewOrderDataRequestBody) => {
        const body = this.toSerializableOrder(request)
        const marketId = request.marketId
        return this.client.post<SuccessOrder[], SerializableNewOrderDataRequestBody>(`/v1/accounts/${accountId}/markets/${marketId}/orders`, body )
    }

    submitNewOrders = (accountId: AccountId, marketId: MarketId, request: NewOrderDataRequestBody[]) => {
        if(request.length === 0)
            throw new Error("Cannot submit empty order list")
        if(request.findIndex( o => o.marketId !== marketId) !== -1)
            throw new Error("All orders must be for the same market")
        const body = []
        for(const order of request){
            body.push(this.toSerializableOrder(order))
        }
        return this.client.post<SuccessOrder[], SerializableNewOrderDataRequestBody[]>(`/v1/accounts/${accountId}/markets/${marketId}/orders`, body )
    }


    private toSerializableOrder(request: NewOrderDataRequestBody): SerializableNewOrderDataRequestBody {
        const settlementTicket = request.settlementTicket
        // FIXME: this is a hack to make the types work since Axios doesn't support BigInt serialization
        const serializableSettlementTicket: SerializableSettlementTicket = {
            account: settlementTicket.account,
            creator: settlementTicket.creator,
            buySlotId: settlementTicket.buySlotId,
            buyAmount: settlementTicket.buyAmount.toString(),
            sellSlotId: settlementTicket.sellSlotId,
            sellAmount: settlementTicket.sellAmount.toString(),
            nonce: settlementTicket.nonce,
            expiresOn: settlementTicket.expiresOn,
            maxSellAmountFromPool: settlementTicket.maxSellAmountFromPool.toString(),
            maxBuyAmountToPool: settlementTicket.maxBuyAmountToPool.toString(),
            signature: settlementTicket.signature,
        }
        const body: SerializableNewOrderDataRequestBody = {
            marketId: request.marketId,
            type: request.type,
            side: request.side,
            size: request.size,
            price: request.price,
            settlementTicket: serializableSettlementTicket,
            sentTime: request.sentTime,
            clientOrderId: request.clientOrderId
        }
        return body
    }

    // Delete methods
    cancelOrders = (accountId: AccountId, orders: OrderId[], signature: Signature, creator?: UserAddress) =>
        this.client.delete<CancelledOrderResponse[]>(`/v1/accounts/${accountId}/orders`, {
            signature,
            orders,
            creator,
        })
    cancelAllOrders = (accountId: AccountId, signature: Signature, allOrdersUntil: UnixTimestamp, creator?: UserAddress) =>
        this.client.delete<CancelledOrderResponse[]>(`/v1/accounts/${accountId}/orders`, {
            signature,
            allOrdersUntil,
            creator
        })
    cancelAllOrdersByMarket = (accountId: AccountId, marketId: MarketId, signature: Signature, allOrdersUntil: UnixTimestamp, creator?: UserAddress) =>
    this.client.delete<CancelledOrderResponse[]>(`/v1/accounts/${accountId}/markets/${marketId}/orders`, {
        signature,
        allOrdersUntil,
        creator
    })

    // Operation methods
    submitWithdraw = (accountId: AccountId, { instrumentId, amount, maxBorrow, maxFees, signature, destination, lease, lastValid, solanaOwnerAddress }: WithdrawParams) =>
        this.client.post<OperationSuccess, WithdrawRequest>(`/v1/accounts/${accountId}/withdraw`, {
            instrumentId,
            amount: amount.toDecimal(),
            maxBorrow: maxBorrow.toDecimal(),
            maxFees: maxFees.toDecimal(),
            signature: encodeBase64(signature),
            lease: encodeBase64(lease),
            destination, lastValid,
            solanaOwnerAddress
        })
    submitLend = (accountId: AccountId, { amount, instrumentId, signature, lease, lastValid }: CreditOperation) =>
        this.client.post<OperationSuccess, CreditOperationRequest>(`/v1/accounts/${accountId}/credit/${instrumentId}/lend`, {
            amount: amount.toDecimal(), signature: encodeBase64(signature), lease: encodeBase64(lease), lastValid
        })
    submitRedeem = (accountId: AccountId, { amount, instrumentId, signature, lease, lastValid }: CreditOperation) =>
        this.client.post<OperationSuccess, CreditOperationRequest>(`/v1/accounts/${accountId}/credit/${instrumentId}/redeem`, {
            amount: amount.toDecimal(), signature: encodeBase64(signature), lease: encodeBase64(lease), lastValid
        })
    submitBorrow = (accountId: AccountId, { amount, instrumentId, signature, lease, lastValid }: CreditOperation) =>
        this.client.post<OperationSuccess, CreditOperationRequest>(`/v1/accounts/${accountId}/credit/${instrumentId}/borrow`, {
            amount: amount.toDecimal(), signature: encodeBase64(signature), lease: encodeBase64(lease), lastValid
        })
    submitRepay = (accountId: AccountId, { amount, instrumentId, signature, lease, lastValid }: CreditOperation) =>
        this.client.post<OperationSuccess, CreditOperationRequest>(`/v1/accounts/${accountId}/credit/${instrumentId}/repay`, {
            amount: amount.toDecimal(), signature: encodeBase64(signature), lease: encodeBase64(lease), lastValid
        })
    submitLiquidation = (accountId: AccountId, { target, assetBasket, liabilityBasket, signature, lease, lastValid }: LiquidationParams) =>
        this.client.post<OperationSuccess,LiquidationParamsRequest>(`/v1/accounts/${accountId}/liquidate`, {
            signature: encodeBase64(signature), target, lease: encodeBase64(lease), lastValid,
            assetBasket: assetBasket.map(({instrumentId, amount}) => ({ instrumentId, amount: amount.toDecimal() })),
            liabilityBasket: liabilityBasket.map(({instrumentId, amount}) => ({ instrumentId, amount: amount.toDecimal()}))
        })
    submitRefund = (accountId: AccountId, cancelTicketOrder: CancelOrderTicket) =>
        this.client.post<OperationSuccess, CancelOrderTicketResponse>(`/v1/accounts/${accountId}/refund`, {
            account: cancelTicketOrder.account,
            creator: cancelTicketOrder.creator,
            orderId: cancelTicketOrder.orderId,
            cancelOn: cancelTicketOrder.cancelOn,
            sellAmount: cancelTicketOrder.sellAmount.toDecimal(),
            sellId: cancelTicketOrder.sellId,
            refundRequest: cancelTicketOrder.refundRequest,
        })
    getDelegations = (accountId: AccountId) => this.client.get<Delegation[]>(`/v1/accounts/${accountId}/delegations`)

    submitRevokeDelegation = (accountId: AccountId, delegationId: DelegationId) =>
        this.client.delete<DelegationSuccess, DelegationSuccess>(`/v1/accounts/${accountId}/delegations`, { id: delegationId })

    submitNewDelegation = (accountId: AccountId, delegatedTo: AccountId, name: string, nonce: number, expiresOn: UnixTimestampInMiliseconds, signature: RawSignature) =>
        this.client.post<DelegationSuccess>(`/v1/accounts/${accountId}/delegations`, {
            accountId,
            delegatedTo,
            name,
            nonce,
            expiresOn,
            signature: encodeBase64(signature)
        })
}

export type {
    NewOrderData,
    DepositRequest,
    WormholeDeposit,
    AlgorandDeposit,
}