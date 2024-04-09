import { InstrumentAmount, MarketPrice } from "../../tools"
import { OrderType, OrderSide, AccountSide } from "../responses"
import { UnixTimestamp, MarketId, OrderId, FillId, ClientOrderId, UserAddress } from "../types"
import { SettlementTicket } from "../../internal/index"



interface MarketTrade {
    marketId: MarketId
    fillId: FillId
    buyOrderId: string
    sellOrderId: string
    tradeOn: UnixTimestamp
    tradeBaseAmount: InstrumentAmount
    tradeQuoteAmount: InstrumentAmount
    tradeBuyFees: InstrumentAmount
    tradeSellFees: InstrumentAmount
    tradeBuyBorrow: InstrumentAmount
    tradeBuyRepay: InstrumentAmount
    tradeSellBorrow: InstrumentAmount
    tradeSellRepay: InstrumentAmount
    tradePrice: MarketPrice
    buyOrderCompleted: boolean
    sellOrderCompleted: boolean
    buyOrderIsTaker: boolean
    status: 'PENDING' | 'SETTLED' | 'FAILED'
    groupTxId: string
}
  
interface NewOrderData {
    marketId: MarketId
    type: OrderType
    side: OrderSide
    size: InstrumentAmount
    price?: MarketPrice
    settlementTicket: SettlementTicket
    sentTime: UnixTimestamp
    clientOrderId?: ClientOrderId
}
  
interface AccountOrder {
    id: OrderId
    newOrderData: NewOrderData
    openOrderData?: {
        remainingAmount: InstrumentAmount
        locked: InstrumentAmount
        status: 'Pending' | 'Closed' | 'InBook' | 'WaitTrigger'
    }
    trades?: MarketTrade[],
    cancelOrderTicket?: {
        account: UserAddress
        creator: UserAddress
        orderId: OrderId
        sellId: string
        sellAmount: InstrumentAmount
        cancelOn: UnixTimestamp
        refundRequest: string
    }
    makerFees?: InstrumentAmount
    takerFees?: InstrumentAmount
    addedOn: UnixTimestamp
}


interface AccountTrade extends MarketTrade {
    accountSide: AccountSide
}

export type {
    MarketTrade,
    NewOrderData,
    AccountOrder,
    AccountTrade,
}