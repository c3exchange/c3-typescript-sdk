import {
    ALGORAND_MIN_TX_FEE,
    Algodv2,
    OnApplicationComplete,
    Transaction,
    SuggestedParams,
    waitForConfirmation,
    makeAssetTransferTxnWithSuggestedParamsFromObject,
    makeApplicationCallTxnFromObject,
    makePaymentTxnWithSuggestedParamsFromObject,
    SignedTransaction,
    decodeSignedTransaction,
} from 'algosdk'
import { AppId, AssetId, Base64, UserAddress } from '../interfaces'
import { AlgorandType, decodeBase64, encodeArgArray, encodeString } from '../utils'
import { ContractAmount } from '../tools'

let lastFetchedTime = 0
let lastFetchedParams: SuggestedParams|undefined = undefined

export async function getParams(algodClient: Algodv2): Promise<SuggestedParams> {
    const currentTime = Date.now()
    // FIXME: This should be removed during testing since several blocks are pushed in the span of 10 seconds
    if (!lastFetchedParams || (currentTime - lastFetchedTime > 2 * 1000)) {
        lastFetchedParams = await algodClient.getTransactionParams().do()
        lastFetchedTime = currentTime
    }
    lastFetchedParams.fee = ALGORAND_MIN_TX_FEE
    lastFetchedParams.flatFee = true
    return lastFetchedParams
}

export function refreshGetParamsCache () {
    lastFetchedParams = undefined
}

export async function makeCallTransaction(
    algodClient: Algodv2,
    from: UserAddress,
    appIndex: AppId,
    onComplete: OnApplicationComplete = OnApplicationComplete.NoOpOC,
    args: AlgorandType[] = [],
    appAccounts: string[] = [],
    appForeignApps: number[] = [],
    appForeignAssets: number[] = [],
    txNote = "",
    fee = ALGORAND_MIN_TX_FEE,
    rekeyTo?: UserAddress,
    boxReferences: {appIndex: number, name: Uint8Array}[] = [],
    lease: Uint8Array = new Uint8Array(32),
): Promise<Transaction> {
    const suggestedParams = await getParams(algodClient)
    suggestedParams.fee = fee
    const appArgs = args.length > 0 ? encodeArgArray(args) : undefined
    const accounts = appAccounts.length > 0 ? appAccounts : undefined
    const foreignApps = appForeignApps.length > 0 ? appForeignApps : undefined
    const foreignAssets = appForeignAssets.length > 0 ? appForeignAssets : undefined
    const boxes = boxReferences.length > 0 ? boxReferences : undefined
    const note = encodeString(txNote)
    return makeApplicationCallTxnFromObject({
        from, suggestedParams, appIndex,
        onComplete, appArgs, accounts, foreignApps, foreignAssets,
        note, rekeyTo, boxes, lease,
    })
}

export async function makeAssetTransferTransaction(
    algodClient: Algodv2,
    from: UserAddress,
    to: UserAddress,
    assetIndex: number,
    amount: number | bigint,
    fee = ALGORAND_MIN_TX_FEE,
    txNote = ""
): Promise<Transaction> {
    const suggestedParams = await getParams(algodClient)
    suggestedParams.fee = fee
    const note = encodeString(txNote)
    return makeAssetTransferTxnWithSuggestedParamsFromObject({
        from, to, assetIndex, amount, suggestedParams, note
    })
}

export async function makeAssetOptInTransaction(
    algodClient: Algodv2,
    from: UserAddress,
    assetId: AssetId,
    fee = ALGORAND_MIN_TX_FEE,
    txNote = ""
): Promise<Transaction> {
    return makeAssetTransferTransaction(algodClient, from, from, assetId, 0, fee, txNote)
}

export async function makePayTransaction(
    algodClient: Algodv2,
    from: UserAddress,
    to: UserAddress,
    amount: ContractAmount,
    fee: number = ALGORAND_MIN_TX_FEE,
    txNote: string | Uint8Array = ""
): Promise<Transaction> {
    const suggestedParams = await getParams(algodClient)
    suggestedParams.fee = fee as number
    const note = encodeString(txNote)
    return makePaymentTxnWithSuggestedParamsFromObject({
        from, to, amount, suggestedParams, note
    })
}

function transactionFailed(result: Record<string, any>): boolean {
    return (result["confirmed-round"] == null || result["confirmed-round"] <= 0)
        && result["pool-error"] != null
        && result["pool-error"].length > 0
}

export async function waitForTransactionResponse(algodClient: Algodv2, txId: string): Promise<Record<string, any>> {
    // Validate transaction was sucessful
    const result = await waitForConfirmation(algodClient, txId, 10000)
    if (transactionFailed(result)) {
        throw new Error(JSON.stringify(result))
    }
    return result
}

export function decodeEncodedSignedTransaction(signedTransaction: Base64) {
    // The funds come from an Algorand User, using a payment or asset transfer transaction
    const signedFundsTransfer = decodeBase64(signedTransaction)
    const signedPayTx: SignedTransaction = decodeSignedTransaction(signedFundsTransfer)
    if (signedPayTx === undefined) {
        throw new Error('Could not decode the signed transaction')
    }
    return { signedFundsTransfer, signedPayTx }
}
