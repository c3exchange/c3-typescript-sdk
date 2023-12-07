import { MarketId, UnixTimestamp} from "../types"
import { pack, unpack } from "msgpackr"
import * as Z from 'zod'
import { TypedEmitter } from "tiny-typed-emitter"
import { TradeMessage, OpenOrderMessage, CancelOrderMessage } from "../responses"
import { Market } from "../entities"
import { AuctionResultMessage } from "../responses"

type SocketId = string

interface SnapshotMessage {
    timestamp: UnixTimestamp,
    marketId: MarketId,
}
interface WebSocketRequests {
    requestSnapshot: (market?: Market) => void
    subscribe: (market: MarketId) => void
    unsubscribe: (market: MarketId) => void
}

type WebSocketMessages =  {
    openOrderSnapshot: (order: OpenOrderMessage[]) => void
    openOrders: (order: OpenOrderMessage[]) => void
    trades: (execution: TradeMessage[]) => void
    cancels: (cancelledOrders: CancelOrderMessage[]) => void
    auctionEnd: (auctionEnd: AuctionResultMessage) => void
}

// Parser
type DecoderEvent = {
    decoded: (packet: Packet) => void
}

// NOTE: nsp = "namespace", this format is part of the standard format for socket.io
// see https://socket.io/docs/v4/custom-parser/ (isPacketValid)
const SocketPacketType = {
    CONNECT: 0,
    DISCONNECT: 1,
    EVENT: 2,
    ACK: 3,
    CONNECT_ERROR: 4,
} as const

const packetSchema = Z.union([
    Z.object({
        nsp: Z.string(),
        id: Z.optional(Z.number().int()),
        type: Z.literal(SocketPacketType.CONNECT),
        data: Z.optional(Z.object({})),
    }),
    Z.object({
        nsp: Z.string(),
        id: Z.optional(Z.number().int()),
        type: Z.literal(SocketPacketType.DISCONNECT),
        data: Z.undefined(),
    }),
    Z.object({
        nsp: Z.string(),
        id: Z.optional(Z.number().int()),
        type: Z.literal(SocketPacketType.EVENT),
        data: Z.array(Z.any()).nonempty(),
    }),
    Z.object({
        nsp: Z.string(),
        id: Z.optional(Z.number().int()),
        type: Z.literal(SocketPacketType.ACK),
        data: Z.array(Z.any()),
    }),
    Z.object({
        nsp: Z.string(),
        id: Z.optional(Z.number().int()),
        type: Z.literal(SocketPacketType.CONNECT_ERROR),
        data: Z.object({}),
    }),
])

type Packet = Z.TypeOf<typeof packetSchema>


export class Encoder {
    public encode(packet: Packet): Uint8Array[] {
        return [pack(packet)]
    }
}

export class Decoder extends TypedEmitter<DecoderEvent> {
    public add(chunk: Uint8Array): void {
        const packet = unpack(chunk)
        if (packetSchema.parse(packet)) {
            this.emit("decoded", packet)
        } else {
            throw new Error("invalid format")
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public destroy(): void {}
}

export type {
    SocketId,
    WebSocketMessages,
    WebSocketRequests,
    SnapshotMessage,
}

