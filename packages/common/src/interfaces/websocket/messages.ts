import { MarketId } from "../types"
import * as Z from "zod"
import { stringifyJSON } from "../../utils/index"
import { OrderStatus } from "../responses/index"


export enum TopicType {
    level1 = 'level1', // 1st level order book
    marketTrades = 'marketTrades', // market trade
    level2Depth20 = 'level2Depth20', // 2nd level order book with 20 levels
    bookDelta = 'bookDelta', // order book delta
    userOrderEvents = 'userOrderEvents', // user order events
    unknown = 'unknown',
}

export const parseTopicType = (topic: string): TopicType =>  {
    const topicsSchema = Z.enum([TopicType.level1, TopicType.level2Depth20, TopicType.bookDelta, TopicType.userOrderEvents, TopicType.marketTrades])
    const parsed = topicsSchema.safeParse(topic)
    if(parsed.success)
        return parsed.data

    return TopicType.unknown
}

export class TopicCodes {
    public static createMarketDataTopic = (marketId: MarketId[], topic: TopicType): string => {
        return `${topic}:${marketId.join(",")}`
    }
    public static createPrivateUserTopic = (accountId: string, topic: TopicType): string => {
        return `${topic}:${accountId}`
    }
}
export enum WebSocketMessageTypes {
    UPDATE = "UPDATE", // message type (should include subject and topic)
    SUBSCRIBED = "SUBSCRIBED",
    UNSUBSCRIBED = "UNSUBSCRIBED",
    SUBSCRIBE = "SUBSCRIBE",
    UNSUBSCRIBE = "UNSUBSCRIBE",
    SUBSCRIPTIONS = "SUBSCRIPTIONS",
    LIST_SUBSCRIPTIONS = "LIST_SUBSCRIPTIONS",
    INITIAL_SNAPSHOT = "INITIAL_SNAPSHOT",
    ERROR = "ERROR",
}

export type WebSocketRequestTypes = WebSocketMessageTypes.SUBSCRIBE | WebSocketMessageTypes.UNSUBSCRIBE | WebSocketMessageTypes.LIST_SUBSCRIPTIONS
export type WebSocketResponseTypes = WebSocketMessageTypes.UPDATE| WebSocketMessageTypes.SUBSCRIBED | WebSocketMessageTypes.UNSUBSCRIBED | WebSocketMessageTypes.SUBSCRIPTIONS | WebSocketMessageTypes.ERROR | WebSocketMessageTypes.INITIAL_SNAPSHOT
export enum PrivateUserSubjects {
    trade = "trade",
    order = "order",
    cancel = "cancel",
}

const requestSchema = Z.object({
    id: Z.string().max(64).optional(), // Unique string to mark the request.
    type: Z.enum([WebSocketMessageTypes.SUBSCRIBE, WebSocketMessageTypes.LIST_SUBSCRIPTIONS, WebSocketMessageTypes.UNSUBSCRIBE]), // Message type of the request.
    topic: Z.string().max(64).optional(), //The topic you want to subscribe or unsubscribe
})

const errorSchema = Z.object({
    id: Z.string().optional(),
    type: Z.enum([WebSocketMessageTypes.ERROR]),
    code: Z.number(),
    message: Z.string(),
})

const webSocketUpdateSchema = Z.object(
    {
        type: Z.enum([WebSocketMessageTypes.UPDATE, WebSocketMessageTypes.INITIAL_SNAPSHOT]),
        topic: Z.string(),
        data: Z.any(),
})



const responseSchema = Z.object({
    id: Z.string(),
    type: Z.enum([WebSocketMessageTypes.SUBSCRIBED, WebSocketMessageTypes.UNSUBSCRIBED, WebSocketMessageTypes.SUBSCRIPTIONS]),
    topics: Z.array(Z.string()).optional(),
    topic: Z.string().optional()
})

export type RequestMessage = Z.TypeOf<typeof requestSchema>
export type WsUpdateMessage = Z.TypeOf<typeof webSocketUpdateSchema>
export type WsErrorMessage = Z.TypeOf<typeof errorSchema>
export type WebsocketError = WsErrorMessage & Error
export type ResponseMessage = Z.TypeOf<typeof responseSchema>

export type WsOutgoingMessage = WsErrorMessage | WsUpdateMessage | ResponseMessage
export function parseWithSchema<T>(message: any, schema: Z.Schema<T> ): T {
    const safeParse = schema.safeParse(message)
    if(safeParse.success){
        return safeParse.data as T
    }
    throw new Error(`Invalid Schema ${safeParse.error.message}`)
}

export const parseResponseMessage = (message: any): ResponseMessage => {
    return parseWithSchema<ResponseMessage>(message, responseSchema)
}
export const parseRequestMessage = (message: any): RequestMessage => {
    return parseWithSchema<RequestMessage>(message, requestSchema)
}

export const parseErrorMessage = (message: any): WsErrorMessage => {
    return parseWithSchema<WsErrorMessage>(message, errorSchema)
}
export const parseWsEventMessage = (message: any): WsUpdateMessage => {
    return parseWithSchema<WsUpdateMessage>(message, webSocketUpdateSchema)
}


export const parseSubject = (topic: string): undefined | TopicType =>  {
    const [topicType, _] = topic.split(":")
    const schema = Z.enum([
        TopicType.userOrderEvents,
        TopicType.level1,
        TopicType.marketTrades,
        TopicType.level2Depth20,
        TopicType.bookDelta])
    const parsed = schema.safeParse(topicType)
    return parsed.success ? parsed.data : undefined
}

export const parseUserEvent = (status: any) : PrivateUserSubjects | undefined =>{
    const orderStatusSchema = Z.enum([
        OrderStatus.NEW,
        OrderStatus.FILLED,
        OrderStatus.PARTIAL_FILL,
        OrderStatus.CANCELLED,
    ])
    const parsedStatus = orderStatusSchema.safeParse(status)
    if(parsedStatus.success){
        switch (parsedStatus.data) {
            case OrderStatus.NEW:
                return PrivateUserSubjects.order
            case OrderStatus.FILLED:
            case OrderStatus.PARTIAL_FILL:
                return PrivateUserSubjects.trade
            case OrderStatus.CANCELLED:
                return PrivateUserSubjects.cancel
        }
    }
    return undefined
}



export const encodeWebsocketMessage = (message: any): string => {
    return stringifyJSON(message,true)
}