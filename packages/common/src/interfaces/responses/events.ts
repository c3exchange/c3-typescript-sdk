import { InstrumentId, SequenceNumber, UnixTimestampInMiliseconds, AccountId, OrderId, MarketId, DecimalPrice, DecimalAmount, UnixTimestamp, FillId } from "../types"
import { OrderSide, OrderType } from "./accounts"
import { WsUpdateMessage } from "../websocket/index"

interface AccountIdMessage {
    accountId: AccountId,
}
export enum OrderStatus {
    NEW = "NEW",
    PARTIAL_FILL = "PARTIAL_FILL",
    CANCELLED = "CANCELLED",
    FILLED = "FILLED",
}

export enum FillType {
    MAKER = "MAKER",
    TAKER = "TAKER",
}

export type UppercaseOrderType = "LIMIT" | "MARKET"
export type UppercaseOrderSide = "BUY" | "SELL"
interface BaseOrderMessage {
    orderId: OrderId,
    marketId: MarketId,
    orderSize: DecimalAmount,
    side: UppercaseOrderSide,
    orderPrice?: DecimalPrice,
    orderType: UppercaseOrderType,
    clientOrderId?: string,
    timestamp: UnixTimestampInMiliseconds,
    remainingSize?: DecimalAmount
}

interface BaseTradeMessage {
    lastFillPrice: DecimalPrice,
    lastFillSize: DecimalAmount,
    lastFillFee: DecimalAmount,
    lastFillType: FillType,
    lastFillId: FillId,
}
interface OpenOrderMessage extends BaseOrderMessage {
    status: OrderStatus.NEW,
}

interface TradeMessage extends BaseTradeMessage, BaseOrderMessage {
    status: OrderStatus.FILLED | OrderStatus.PARTIAL_FILL,
}


interface CancelOrderMessage extends BaseOrderMessage {
    status: OrderStatus.CANCELLED,
}


type PriceSizeArray = string[]

type PriceSizeSequenceArray = string[]

interface HasSequenceNumber {
    auctionSeqNum: number,
}

interface TypedDataMessage<T> extends WsUpdateMessage {
    data: T
}

interface HasTimestamp {
    timestamp: number
}
type HasSequenceAndTimestamp = HasSequenceNumber & HasTimestamp

type L1MessagePayload = {
    bid: PriceSizeArray,
    ask: PriceSizeArray,
} & HasSequenceAndTimestamp

type MarketTradeMessagePayload = {
    size: DecimalAmount,
    price: DecimalPrice,
} & HasSequenceAndTimestamp

type BookDeltaPayload = {
    bids: PriceSizeArray[],
    asks: PriceSizeArray[],
} & HasSequenceAndTimestamp

type SnapshotPayload = {
    bids: PriceSizeArray[],
    asks: PriceSizeArray[],
} & HasSequenceAndTimestamp

type BookDepthMessagePayload = HasSequenceAndTimestamp & {
    bids: PriceSizeArray[],
    asks: PriceSizeArray[],
}

export type {
    L1MessagePayload,
    TypedDataMessage,
    BookDepthMessagePayload,
    BookDeltaPayload,
    AccountIdMessage,
    BaseOrderMessage,
    OpenOrderMessage,
    BaseTradeMessage,
    TradeMessage,
    CancelOrderMessage,
    MarketTradeMessagePayload,
    SnapshotPayload,
    PriceSizeArray
}