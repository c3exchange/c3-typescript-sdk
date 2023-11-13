import {
  Market,
  OrderSide,
  MarketPrice,
  InstrumentAmount,
  AccountOrderResponse,
  Instrument,
  MarketTradeResponse,
  NewOrderData,
  MarketTrade,
  AccountOrder,
} from "@c3exchange/common"

const getSellBuyInstrument = (isBuy: OrderSide, market: Market): [Instrument, Instrument] =>
  isBuy === "buy" ? [market.quoteInstrument, market.baseInstrument] : [market.baseInstrument, market.quoteInstrument]

const convertNewOrderData = (order: AccountOrderResponse, market: Market): NewOrderData => {
  return {
    marketId: order.newOrderData.marketId,
    type: order.newOrderData.type,
    side: order.newOrderData.side,
    settlementTicket: order.newOrderData.settlementTicket,
    sentTime: order.newOrderData.sentTime,
    price: order.newOrderData.price ? MarketPrice.fromDecimal(market, order.newOrderData.price) : undefined,
    size: InstrumentAmount.fromDecimal(
      order.newOrderData.type === "market" && order.newOrderData.side === "buy" ? market.quoteInstrument : market.baseInstrument,
      order.newOrderData.size),
    clientOrderId: order.newOrderData.clientOrderId,
  }
}


const toMarketTrade = (trade: MarketTradeResponse, market: Market): MarketTrade => {
  const convertedTrade: MarketTrade = {
    marketId: trade.marketId,
    buyOrderId: trade.buyOrderId,
    sellOrderId: trade.sellOrderId,
    tradeOn: trade.tradeOn,
    tradePrice: MarketPrice.fromDecimal(market, trade.tradePrice),
    tradeBaseAmount: InstrumentAmount.fromDecimal(market.baseInstrument, trade.tradeBaseAmount),
    tradeQuoteAmount: InstrumentAmount.fromDecimal(market.quoteInstrument, trade.tradeQuoteAmount),
    tradeBuyFees: InstrumentAmount.fromDecimal(market.quoteInstrument, trade.tradeBuyFees),
    tradeSellFees: InstrumentAmount.fromDecimal(market.quoteInstrument, trade.tradeSellFees),
    buyOrderCompleted: trade.buyOrderCompleted,
    sellOrderCompleted: trade.sellOrderCompleted,
    buyOrderIsTaker: trade.buyOrderIsTaker,
    status: trade.status,
    groupTxId: trade.groupTxId
  }
  return convertedTrade
}

const toAccountOrder = (order: AccountOrderResponse, market: Market): AccountOrder => {

  const trades = order.trades === undefined ? [] : order.trades.map(trade => toMarketTrade(trade, market))
  const converted ={
    id: order.id,
    addedOn: order.addedOn,
    trades: trades,
    newOrderData: convertNewOrderData(order, market),
    ...(order.openOrderData && {
      openOrderData: {
        // Fix this
        remainingAmount: InstrumentAmount.fromDecimal(
          getSellBuyInstrument(order.newOrderData.side,market)[0],
          order.openOrderData.remainingAmount
        ),
        locked: InstrumentAmount.fromDecimal(
          getSellBuyInstrument(order.newOrderData.side,market)[0],
          order.openOrderData.locked
        ),
        status: order.openOrderData.status,
      }
    }),
    ...(order.cancelOrderTicket && {
      cancelOrderTicket: {
        account: order.cancelOrderTicket.account,
        creator: order.cancelOrderTicket.creator,
        orderId: order.cancelOrderTicket.creator,
        sellId: order.cancelOrderTicket.sellId,
        sellAmount: InstrumentAmount.fromDecimal(
          getSellBuyInstrument(order.newOrderData.side,market)[0],
            order.cancelOrderTicket.sellAmount
        ),
        cancelOn: order.cancelOrderTicket.cancelOn,
        refundRequest: order.cancelOrderTicket.refundRequest
      }
    }),
    ...(order.makerFees && {
      makerFees: InstrumentAmount.fromDecimal(market.quoteInstrument, order.makerFees)
    }),
    ...(order.takerFees && {
      takerFees: InstrumentAmount.fromDecimal(market.quoteInstrument, order.takerFees)
    })
  }
  return converted
}

export {
  toAccountOrder,
  toMarketTrade
}
