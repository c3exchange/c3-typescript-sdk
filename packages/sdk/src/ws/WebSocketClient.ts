import { TypedEmitter } from 'tiny-typed-emitter'
import { Socket, io } from 'socket.io-client'
import { Decoder, Encoder, MarketId } from "@c3exchange/common"
import { WebSocketRequests, WebSocketMessages } from "@c3exchange/common"
import { UrlConfig } from "../config"
import { Market } from "@c3exchange/common"

// TODO: Move to sdk if needed
export type WebSocketClientMessages  = WebSocketMessages &{
    connected: () => void
    connectionError: (error: Error) => void
    disconnected: (reason: string) => void
}
export class WebSocketClient extends TypedEmitter<WebSocketClientMessages> {
    private _client: Socket<WebSocketMessages, WebSocketRequests> | undefined
    private shouldBeConnected = false
    private reconnectionAttempt = 0

    constructor(private serverConfig: UrlConfig, private accountId: string, private jwtToken: string) {
        super()
    }

    public async connect(){
        if(this._client !== undefined && this._client.connected){
            this._client.close()
        }
        const url = this.serverConfig.port !== undefined ? `${this.serverConfig.server}:${this.serverConfig.port}` : this.serverConfig.server
        this._client = io(url, {
            parser: {
                Encoder,
                Decoder,
            },
            auth: {
                token: this.jwtToken,
                accountId: this.accountId
            },
            path: '/ws',
            reconnection: false,
            autoConnect: false,
        })
        this.shouldBeConnected = true
        this.reconnectionAttempt = 0
        this.bind()
        this._client.connect()
    }

    private bind() {

        this._client?.on('disconnect', async (reason , description?) => {
            const disconnectReason = `${reason} ${description ?? ''}`
            this.emit('disconnected',disconnectReason)
        })
        this._client?.on('connect_error', async (error: Error) => { this.emit('connectionError', error)
            this.shouldBeConnected = false
        })
        this._client?.on('connect', () => { this.emit('connected')})
        this._client?.on('openOrders', (orders) => this.emit('openOrders', orders))
        this._client?.on('cancels', (cancels) => this.emit('cancels', cancels))
        this._client?.on('trades', (trades) => this.emit('trades', trades))
        this._client?.on('openOrderSnapshot', (orders) => this.emit('openOrderSnapshot', orders))
        this._client?.on('auctionEnd', (result) => this.emit('auctionEnd', result))
    }

    public close(): void {
        this.shouldBeConnected = false
        if(this._client?.connected){
            this._client.close()
        }
    }
    public get isConnected(): boolean {
        return this._client?.connected ?? false
    }
    public async reconnect(){
        const waitToReconnect  = 100 + this.reconnectionAttempt*100
        return setTimeout(async () => {
            this._client?.connect()
        }, waitToReconnect)
    }


    public requestSnapshot(market?: Market): void {
        this.assertClientIsInitializedAndConnected()
        this._client?.emit('requestSnapshot', market)
    }

    public subscribe(marketId: MarketId): void {
        this.assertClientIsInitializedAndConnected()
        this._client?.emit('subscribe', marketId)
    }

    private assertClientIsInitializedAndConnected() {
        if (this._client === undefined) {
            throw new Error('Client not initialized')
        }
        if (!this._client.connected) {
            throw new Error('Client not connected')
        }
    }

    public unsubscribe(marketId: MarketId) {
        this._client?.emit('unsubscribe', marketId)
    }
}
