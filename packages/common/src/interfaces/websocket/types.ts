import { MarketId, UnixTimestamp } from "../types"
import {
    TypedDataMessage,
    L1MessagePayload,
    BookDepthMessagePayload,
    BookDeltaPayload,
    TradeMessage,
    OpenOrderMessage,
    CancelOrderMessage, SnapshotPayload
} from "../responses"
import { MarketTradeMessagePayload } from "../responses"

type SocketId = string

interface SnapshotMessage {
    timestamp: UnixTimestamp,
    marketId: MarketId,
}

type WebSocketMessages = {
    deltaSnapshot: (snapshot: TypedDataMessage<BookDeltaPayload>) => void
    openOrders: (order: TypedDataMessage<OpenOrderMessage[]>) => void
    trades: (execution: TypedDataMessage<TradeMessage[]>) => void
    cancels: (cancelledOrders: TypedDataMessage<CancelOrderMessage[]>) => void
    level1: (l1Data: TypedDataMessage<L1MessagePayload>) => void
    marketTrades: (marketTrade: TypedDataMessage<MarketTradeMessagePayload>) => void
    level2Depth20: (l2Data: TypedDataMessage<BookDepthMessagePayload>) => void
    bookDelta: (l2Data: TypedDataMessage<BookDeltaPayload>) => void
}

export enum WebSocketEvents {
    openOrders = "openOrders",
    trades = "trades",
    cancels = "cancels",
    level1 = "level1",
    marketTrades = "marketTrades",
    level2Depth20 = "level2Depth20",
    bookDelta = "bookDelta"
}

export type {
    SocketId,
    WebSocketMessages,
    SnapshotMessage,
}
