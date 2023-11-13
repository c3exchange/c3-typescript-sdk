import { getPublicKeyByAddress } from '../chains'
import { Base64, InstrumentSlotId, OrderId, Signature, UnixTimestampInMiliseconds, UserAddress, OrderNonce, MarketId, AccountId } from '../interfaces'
import { ContractAmount, MessageSignCallback, MessageSigner } from '../tools'
import { encodeBase64, sha256Hash, IPackedInfo, packABIString, encodeABIValue, concatArrays, decodeBase64 } from '../utils'
import { getDataToSign } from './signerUtils'

export interface CancelRequest{
    creator: UserAddress,
    user: UserAddress,
    orders?: Base64[],
    allOrdersUntil?: UnixTimestampInMiliseconds,
    marketId?: MarketId,
}
export interface SignedCancelRequest extends CancelRequest {
    signature: Signature,
}
export interface OrderData {
    account: Base64,
    sellSlotId: InstrumentSlotId,
    buySlotId: InstrumentSlotId,
    sellAmount: ContractAmount,
    buyAmount: ContractAmount,
    maxSellAmountFromPool: ContractAmount
    maxBuyAmountToPool: ContractAmount
    expiresOn: UnixTimestampInMiliseconds,
    nonce: OrderNonce,
}

export interface SettlementTicket extends OrderData {
    creator: UserAddress,
    signature: Signature
}

export interface SignedOrderData {
    data: OrderData,
    signature: Signature,
    creator: UserAddress,
    id: OrderId // FIXME: This id should not be here but moving it outside SignedOrderData requires a lot of changes.
}


export function getOrderId(encodedData: Uint8Array): string {
    return encodeBase64(sha256Hash(encodedData))
}

export function encodeOrderWithHeader(data: OrderData): { dataToSign: Uint8Array, id: string } {
    const encodedOrder = encodeOrderData(data)
    const id = getOrderId(encodedOrder)
    // Orders do not have a lease or a last block
    const zeroLease = new Uint8Array(32)
    const zeroBlock = 0
    const dataToSign = getDataToSign(encodedOrder, decodeBase64(data.account), zeroLease, zeroBlock)
    return { dataToSign, id }
}

export async function signOrder(data: OrderData, signer: MessageSigner): Promise<SignedOrderData> {
    const { dataToSign, id } = encodeOrderWithHeader(data)
    const signature = await signer.signMessage(dataToSign)
    return { data, signature: encodeBase64(signature), creator: signer.address, id }
}

const ORDER_OPERATION_STR = '06'

export const orderDataFormat: IPackedInfo = {
    operation: { type: 'fixed', valueHex: ORDER_OPERATION_STR },
    account: { type: 'base64', size: 32 },
    nonce: { type: 'number' },
    expiresOn: { type: 'number' },
    sellSlotId: { type: 'byte' },
    sellAmount: { type: 'uint' },
    maxBorrow: { type: 'uint' },
    buySlotId: { type: 'byte' },
    buyAmount: { type: 'uint' },
    maxRepay: { type: 'uint' },
}

const ORDER_OPERATION = 6

export function encodeOrderData(data: OrderData): Uint8Array {
    const orderABIString = packABIString(orderDataFormat)
    const account = decodeBase64(data.account)
    const ABIValue = [
        ORDER_OPERATION,
        account,
        data.nonce,
        data.expiresOn,
        data.sellSlotId,
        data.sellAmount,
        data.maxSellAmountFromPool,
        data.buySlotId,
        data.buyAmount,
        data.maxBuyAmountToPool
    ]
    return encodeABIValue(ABIValue, orderABIString)
}

export function encodeCancelRequest(request: CancelRequest): Uint8Array {
    const encodedOrders =  request.orders ? concatArrays(request.orders.map((order) => decodeBase64(order))) : new Uint8Array(0)
    const encodedAllOrdersUntil = request.allOrdersUntil ? decodeBase64(request.allOrdersUntil.toString()) : new Uint8Array(0)
    return concatArrays([encodedOrders, encodedAllOrdersUntil])
}

export async function signCancelOrders(request: CancelRequest, signMessageCallback: MessageSignCallback): Promise<SignedCancelRequest> {
    const encodedCancelRequest = encodeCancelRequest(request)
    const signature = await signMessageCallback(encodedCancelRequest)
    return { ...request, signature: encodeBase64(signature) }
}
