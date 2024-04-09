import {
    WsUpdateMessage,
    MarketId,
    WebSocketMessages,
    WebSocketMessageTypes,
    TopicType,
    TopicCodes,
    RequestMessage,
    PrivateUserSubjects,
    CancelOrderMessage,
    ResponseMessage,
    WsOutgoingMessage,
    TypedDataMessage,
    L1MessagePayload,
    BookDepthMessagePayload,
    BookDeltaPayload,
    OpenOrderMessage,
    TradeMessage,
    WebSocketEvents,
    UnixTimestampInMiliseconds,
    parseSubject,
    parseResponseMessage,
    encodeWebsocketMessage,
    parseWsEventMessage,
    parseUserEvent,
    parseJSON,
    isValidAccountId,
    SnapshotPayload
} from "@c3exchange/common"
import { TypedEmitter } from 'tiny-typed-emitter'
import WebSocket from "ws"
import { WebSocketResponseTypes } from "@c3exchange/common"
import { parseErrorMessage } from "@c3exchange/common"
import { WsErrorMessage } from "@c3exchange/common"
import { MarketTradeMessagePayload } from "@c3exchange/common"

// TODO: Move to sdk if needed
export type WebSocketClientMessages  = WebSocketMessages &{
    connected: () => void
    connectionError: (error: Error) => void
    disconnected: (reason: string) => void
    error: (error: WsErrorMessage) => void
}

type RequestCallback = (data?: WsOutgoingMessage) => void
export class WebSocketClient extends TypedEmitter<WebSocketClientMessages> {
    private ws: WebSocket.WebSocket | undefined
    private reconnectionAttempt = 0
    private pingTimer: NodeJS.Timeout | undefined
    private pongTimeoutTimer: NodeJS.Timeout | undefined
    private requestMap: Map<string,RequestCallback > = new Map()
    constructor(public url: string, private accountId: string, private jwtToken: string, private pingInterval: UnixTimestampInMiliseconds = 1000, private pingTimeout: UnixTimestampInMiliseconds = 10*60*1000, private latency: UnixTimestampInMiliseconds = 1000) {
        if (!isValidAccountId(accountId))
            throw new Error('Invalid account id')
        super()
    }

    public async connect( onConnect: (client: WebSocketClient) => Promise<void> = async (client: WebSocketClient)=>{} ){
        return new Promise<void>((resolve, reject) => {
            try{
                this.requestMap.set('login', (data) => {
                    resolve()
                })
                if (this.ws !== undefined) {
                    this.ws.close()
                    this.ws = undefined
                    clearInterval(this.pingTimer as NodeJS.Timeout)
                }

                const options: WebSocket.ClientOptions = {
                    headers: {
                        Authorization: `Bearer ${this.jwtToken}`
                    }
                }
                this.ws = new WebSocket(`${this.url}?accountId=${this.accountId}`, options)
                this.bind(onConnect)
                this.reconnectionAttempt = 0
            }catch (e) {
                reject(e)
            }
        })
    }

    private bind( onConnected?:(client: WebSocketClient)=>Promise<void> ){

        this.ws?.on('error', (error: Error) => {
            this.emit('connectionError', error)
        })
        this.ws?.on('close', async (code, reason) => {
            this.emit('disconnected', reason.toString())
            this.killTimers()
        })

        this.ws?.on('disconnect', async (reason , description?) => {
            const disconnectReason = `${reason} ${description ?? ''}`
            this.emit('disconnected',disconnectReason)
        })
        this.ws?.on('open', async () => {
            try {
                const loginCallback = this.requestMap.get('login')
                if(loginCallback !== undefined){
                    loginCallback()
                }
                if(onConnected !== undefined){
                    await onConnected(this)
                }
            }catch (e) {
                console.log(e)
            }
        })

        this.ws?.on('ping', (data) => {
            this.ws?.pong()
        })

        this.ws?.on('message', (message) => {
            //TODO: decode message and emit event
            try {
                const obj = parseJSON(message.toString())
                if(obj === undefined)
                    return
                const messageHeader = obj as { type: WebSocketResponseTypes }
                switch (messageHeader.type) {
                    case WebSocketMessageTypes.INITIAL_SNAPSHOT:
                    {
                        const wsMessage = parseWsEventMessage(obj)
                        if (wsMessage.topic !== undefined) {
                            console.log('Raising Snapshot event ', wsMessage)
                            this.emitEvent(wsMessage)
                        }
                    }break
                    case WebSocketMessageTypes.UPDATE: {
                        const wsMessage = parseWsEventMessage(obj)
                        if (wsMessage.topic !== undefined) {
                            this.emitEvent(wsMessage)
                        }
                        //TODO: decode message and emit event
                        break
                    }
                    case WebSocketMessageTypes.SUBSCRIPTIONS:
                    case WebSocketMessageTypes.UNSUBSCRIBED:
                    case WebSocketMessageTypes.SUBSCRIBED: {
                        const response = parseResponseMessage(obj)
                        const handler = this.requestMap.get(response.id)
                        if (handler !== undefined) {
                            handler(response)
                        }
                        this.requestMap.delete(response.id)
                        break
                    }
                    case WebSocketMessageTypes.ERROR: {
                        const errorMessage = parseErrorMessage(obj)
                        this.emit('error', errorMessage)
                    }
                }
            }catch (e) {
                console.log('Something Failed Parsing message',e)
            }
        })
    }

    public close(): void {
        this.killTimers()
        if(this.ws !== undefined){
            this.ws.close()
            this.ws = undefined
        }
    }

    private killTimers() {
        if (this.pingTimer !== undefined) {
            clearInterval(this.pingTimer as NodeJS.Timeout)
        }
        if (this.pongTimeoutTimer !== undefined) {
            clearInterval(this.pongTimeoutTimer as NodeJS.Timeout)
        }
    }

    public get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    public async emitEvent(message: WsUpdateMessage): Promise<void> {
        if(message.type === "INITIAL_SNAPSHOT"){
            const result = this.emit(WebSocketEvents.bookDelta, message as TypedDataMessage<SnapshotPayload>)
            return
        }
        const topicType = parseSubject(message.topic ?? '')
        if(topicType === undefined )
            return

        switch (topicType) {
            case TopicType.userOrderEvents:
                const firstMessage = message.data[0] as OpenOrderMessage | TradeMessage | CancelOrderMessage
                const status = parseUserEvent(firstMessage.status)
                switch (status) {
                    case PrivateUserSubjects.order:{
                        this.emit(WebSocketEvents.openOrders, message as TypedDataMessage<OpenOrderMessage[]>)
                        break
                    }
                    case PrivateUserSubjects.trade:{
                        this.emit(WebSocketEvents.trades, message as TypedDataMessage<TradeMessage[]>)
                        break
                    }
                    case PrivateUserSubjects.cancel:{
                        this.emit(WebSocketEvents.cancels, message as TypedDataMessage<CancelOrderMessage[]>)
                        break
                    }
                }
                break
            case TopicType.level1:
                this.emit(WebSocketEvents.level1, message as TypedDataMessage<L1MessagePayload>)
                break
            case TopicType.marketTrades:
                this.emit(WebSocketEvents.marketTrades, message as TypedDataMessage<MarketTradeMessagePayload>)
                break
            case TopicType.level2Depth20:
                this.emit(WebSocketEvents.level2Depth20, message as TypedDataMessage<BookDepthMessagePayload>)
                break
            case TopicType.bookDelta:
                this.emit(WebSocketEvents.bookDelta, message as TypedDataMessage<BookDeltaPayload>)
                break
        }
    }
    public subscribe(markets: MarketId[], topic: TopicType ): Promise<ResponseMessage> {
        return new Promise((resolve, reject) => {
            this.assertClientIsInitializedAndConnected()
            const request: RequestMessage= {
                id: `subscribe-${Date.now()}`,
                type: WebSocketMessageTypes.SUBSCRIBE,
                topic: TopicCodes.createMarketDataTopic(markets, topic),
            }
            const callBack = (ack?: WsOutgoingMessage) => {
                try {
                    resolve(ack as ResponseMessage)
                } catch (e) {
                    reject(e)
                }
            }
            this.requestMap.set(request.id!, callBack)
            this.emitSocketMessage(request)
        })

    }

    private assertClientIsInitializedAndConnected() {
        if (this.ws === undefined) {
            throw new Error('Client not initialized')
        }
        if (!this.isConnected) {
            throw new Error('Client not connected')
        }
    }

    public async unsubscribe(markets: MarketId[], topic: TopicType ): Promise<ResponseMessage> {
        return new Promise((resolve, reject) => {
            this.assertClientIsInitializedAndConnected()
            const request: RequestMessage= {
                id: `unsubscribe-${Date.now()}`,
                type: WebSocketMessageTypes.UNSUBSCRIBE,
                topic: TopicCodes.createMarketDataTopic(markets, topic),
            }
            const callBack = (ack?: WsOutgoingMessage) => {
                try {
                    resolve(ack as ResponseMessage)
                } catch (e) {
                    reject(e)
                }
            }
            this.requestMap.set(request.id!, callBack)
            this.emitSocketMessage(request)
        })
    }

    private emitSocketMessage = (payload: RequestMessage) => {
        if(this.ws === undefined)
            return
        this.ws.send(encodeWebsocketMessage(payload))
    }

    async listSubscriptions(): Promise<string[]> {

        return  new Promise<string[]>((resolve, reject) => {
            const id = `listSubscriptions-${Date.now()}`
            try {
                const request: RequestMessage = {
                    id,
                    type: WebSocketMessageTypes.LIST_SUBSCRIPTIONS,
                }
                const callBack = (responseMessage?: WsOutgoingMessage) => {
                    try {
                        const lsResponse = responseMessage as ResponseMessage
                        resolve(lsResponse.topics ?? [])
                    } catch (e) {
                        reject(e)
                    }
                }
                this.requestMap.set(id, callBack)
                this.emitSocketMessage(request)
            } catch (e) {
                reject(e)
            }
        })

    }
}
