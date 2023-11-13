import { ALGORAND_MIN_TX_FEE, Algodv2, LogicSigAccount, OnApplicationComplete, Transaction } from 'algosdk'
import type { TransactionSignerPair } from '@certusone/wormhole-sdk/lib/cjs/algorand'
import { randomUUID } from 'crypto'
import { ContractAmount } from '../tools'
import { AppId, AssetId, ContractIds, InstrumentSlotId, UserAddress } from '../interfaces'
import { WormholeService, XContractAddress } from '../wormhole'
import { decodeBase16, encodeApplicationAddress, encodeString, encodeUint8 } from '../utils'
import { makeAssetTransferTransaction, makeCallTransaction, makePayTransaction } from './algosdk'
import { getPublicKeyByAddress } from '../chains'

export type DepositGroup = {
    txns: Transaction[],
    transferStartIndex: number,
}

export type WormholeDepositGroup = DepositGroup & {
    wormholeTxSignerPairs: TransactionSignerPair[]
}

export const DEPOSIT_ABI_SELECTOR = '71818e84'
export const WORMHOLE_DEPOSIT_ABI_SELECTOR = '6ed2f8a8'
export const NO_OP_ABI_SELECTOR = '58759fa2'

export async function makeBudgetBoxesTx(algodClient: Algodv2, server: UserAddress, appId: AppId): Promise<Transaction> {
    const noopSelector = decodeBase16(NO_OP_ABI_SELECTOR)
    const budgetBox = {appIndex: appId, name: new Uint8Array()}
    const budgetBoxes = [budgetBox, budgetBox, budgetBox, budgetBox, budgetBox, budgetBox, budgetBox, budgetBox]
    return makeCallTransaction(algodClient, server, appId, OnApplicationComplete.NoOpOC, [noopSelector], [], [], [], "", ALGORAND_MIN_TX_FEE, undefined, budgetBoxes)
}

export async function generateWormholeDepositGroup(
    algodClient: Algodv2,
    wormholeService: WormholeService,
    contracts: ContractIds,
    signatureValidator: LogicSigAccount,
    server: XContractAddress,
    target: UserAddress,
    wormholeVAA: Uint8Array,
    instrumentSlotId: InstrumentSlotId,
): Promise<WormholeDepositGroup> {
    const allTxns: Transaction[] = []
    // TX_Fee to allocate for the Wormhole deposit transaction
    // 12*0001 =  6000 uALGOS allocated to wormhole internal transactions + 6000 uALGOS for C3 contract call
    // (see SETUP_WORMHOLE_DEPOSIT_BUDGET in Constants.py)
    const REDEEM_WORMHOLE_DEPOSIT_TX_FEE = 12 * ALGORAND_MIN_TX_FEE
    allTxns.push(await makePayTransaction(
        algodClient, server.tokenAddress, encodeApplicationAddress(contracts.ceOnchain), BigInt(0), REDEEM_WORMHOLE_DEPOSIT_TX_FEE,

        // This is a quick-hack to support relayer retries. When the C3 Relayer quickly triggers a re-try it may
        // issue the same transaction/group ID causing the C3 Server to reject  the transaction/group as a duplicate.
        // To avoid this, we generate a new transaction/group ID for each retry.
        randomUUID()
    ))

    // Funds transfer transactions
    const transferStartIndex = allTxns.length
    let wormholeTxSignerPairs: TransactionSignerPair[] = []
    wormholeTxSignerPairs = await wormholeService.redeemOnAlgorand(server, wormholeVAA)
    allTxns.push(...wormholeTxSignerPairs.map(pair => pair.tx))

    // The Wormhole SDK indicates which transaction must be signed by which signer
    // As we need to return a list of unsigned transactions and then sign them when the transaction group is created, the received signers are returned in a different array
    // This information is used only when this function is called inside the server, not from the client.
    //
    // Note that the stateless programs that govern the 'dynamic memory' scheme of
    // Wormhole-Algorand implementation may require optin when the 'virtual' ~16K address space is exhausted,
    // so we must check this condition.  In case of required optins, we leave our server to pay
    // for the excess re-optin.  See doc at https://github.com/certusone/wormhole/tree/dev.v2/algorand for details.
    // Optins maybe one or two, paired with two matching funding transactions.

    const DEPOSIT_BUDGET = 3000
    const targetBytes = getPublicKeyByAddress(target)
    allTxns.push(await makeCallTransaction(
        algodClient,
        signatureValidator.address(),
        contracts.ceOnchain,
        OnApplicationComplete.NoOpOC,
        [decodeBase16(WORMHOLE_DEPOSIT_ABI_SELECTOR), targetBytes, "deposit", encodeUint8(instrumentSlotId), DEPOSIT_BUDGET],
        [],
        [contracts.pricecaster],
        [],
        '',
        0,
        undefined,
        [
            // TODO: Remember to change the name of this box to instrumentBoxName when we move this to the server
            {appIndex: contracts.ceOnchain, name: encodeString("i")},
            {appIndex: contracts.ceOnchain, name: targetBytes}
        ]
    ))

    const budgetBoxesTx = await makeBudgetBoxesTx(algodClient, server.tokenAddress, contracts.pricecaster)
    allTxns.push(budgetBoxesTx)

    // PLEASE NOTE: Removed call to assignGroupID from this place because we might need to manipulate depositTxns further outside of this function.
    //  For instance, in the server side of deposits, we might want to change firstRound and lastRound to match the ones provided in the signed user's transaction.
    // We need to ensure all the generated transactions have the same valid rounds,
    // because in the server we are going to pick one of them to set these values
    // to all the server generated transactions
    const [firstRound, lastRound] = [allTxns[0].firstRound, allTxns[0].lastRound]
    allTxns.forEach(tx => {
        tx.firstRound = firstRound
        tx.lastRound = lastRound
    })
    return { txns: allTxns, transferStartIndex, wormholeTxSignerPairs }
}

export async function generateStandardDepositGroup(
    algodClient: Algodv2,
    contracts: ContractIds,
    signatureValidator: LogicSigAccount,
    server: UserAddress,
    target: UserAddress,
    funder: UserAddress,
    amount: ContractAmount,
    assetId: AssetId,
    instrumentSlotId: InstrumentSlotId,
    repayAmount: ContractAmount,
): Promise<DepositGroup> {
    const DEPOSIT_BUDGET = 3000
    const allTxns: Transaction[] = []
    allTxns.push(await makePayTransaction(
        algodClient, server, encodeApplicationAddress(contracts.ceOnchain), BigInt(0), 7 * ALGORAND_MIN_TX_FEE
    ))
    allTxns.push(await makeBudgetBoxesTx(algodClient, server, contracts.pricecaster))

    // Funds transfer transactions
    // Funds can come from an Algorand User, using a Payment or an Asset Transfer transaction
    //   or from Wormhole by claming a VAA through a set of transactions created by the Wormhole's SDK
    const transferStartIndex = allTxns.length

    // From an Algorand user (payment or asset transfer)
    const coreAddress = encodeApplicationAddress(contracts.ceOnchain)
    const depositTx
        = assetId === 0 ? await makePayTransaction(algodClient, funder, coreAddress, amount, 0)
        : await makeAssetTransferTransaction(algodClient, funder, coreAddress, assetId, amount, 0)
    const targetBytes = getPublicKeyByAddress(target)

    // Application call to perform the Deposit Operation
    const depositCall = await makeCallTransaction(
        algodClient,
        signatureValidator.address(),
        contracts.ceOnchain,
        OnApplicationComplete.NoOpOC,
        [decodeBase16(DEPOSIT_ABI_SELECTOR), targetBytes, "deposit", encodeUint8(instrumentSlotId), repayAmount, DEPOSIT_BUDGET],
        [],
        [contracts.pricecaster],
        [],
        '',
        0,
        undefined,
        [
            // TODO: Remember to change the name of this box to instrumentBoxName when we move this to the server
            {appIndex: contracts.ceOnchain, name: encodeString("i")},
            {appIndex: contracts.ceOnchain, name: targetBytes}
        ]
    )
    allTxns.push(depositTx, depositCall)

    // PLEASE NOTE: Removed call to assignGroupID from this place because we might need to manipulate depositTxns further outside of this function.
    //  For instance, in the server side of deposits, we might want to change firstRound and lastRound to match the ones provided in the signed user's transaction.

    // We need to ensure all the generated transactions have the same valid rounds,
    // because in the server we are going to pick one of them to set these values
    // to all the server generated transactions
    const [firstRound, lastRound] = [allTxns[0].firstRound, allTxns[0].lastRound]
    allTxns.forEach(tx => {
        tx.firstRound = firstRound
        tx.lastRound = lastRound
    })

    return { txns: allTxns, transferStartIndex }
}
