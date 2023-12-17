import { InstrumentId, AccountId, OrderId, MarketId, DecimalPrice, DecimalAmount, UnixTimestamp } from "../types"
import { OrderSide, OrderType } from "./accounts"

interface AccountIdMessage {
    accountId: AccountId,
}
interface BaseOpenOrderMessage {
    orderId: OrderId,
    marketId: MarketId,
    instrument: InstrumentId
    amount: DecimalAmount,
    remaining: DecimalAmount,
    side: OrderSide,
    price?: DecimalPrice,
    type: OrderType,
    clientOrderId?: string,
}

interface OpenOrderMessage extends AccountIdMessage, BaseOpenOrderMessage {}

interface BaseTradeMessage {
    marketId: MarketId,
    orderId: OrderId,
    side: OrderSide,
    instrument: InstrumentId
    amount: DecimalAmount,
    price: DecimalPrice,
    fees: DecimalPrice,
    feesInstrument: InstrumentId,
    isComplete: boolean,
    clientOrderId?: string,
}

interface TradeMessage extends AccountIdMessage, BaseTradeMessage {}

interface BaseCancelOrderMessage {
    orderId: OrderId,
    clientOrderId?: string,
}

interface CancelOrderMessage extends AccountIdMessage, BaseCancelOrderMessage {}

interface AuctionResultMessage {
    marketId: MarketId,
    bestBid?: DecimalPrice,
    bestBidSize?: DecimalAmount,
    bestAsk?: DecimalPrice,
    bestAskSize?: DecimalAmount,
    lastTradeInstrument?: InstrumentId,
    lastTradeAmount?: DecimalAmount,
    lastTradePrice?: DecimalPrice,
    timestamp: UnixTimestamp,
}

export type {
    AccountIdMessage,
    BaseOpenOrderMessage,
    OpenOrderMessage,
    BaseTradeMessage,
    TradeMessage,
    BaseCancelOrderMessage,
    CancelOrderMessage,
    AuctionResultMessage
}