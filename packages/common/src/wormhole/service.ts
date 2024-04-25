/**
 * IMPORTANT, PLEASE READ!!
 * DO NOT IMPORT WORMHOLE FUNCTION FROM ROOT: @certusone/wormhole-sdk
 * This will import all unnecessary dependencies and increase bundle size
 **/
import {
    getForeignAssetAlgorand,
    getForeignAssetEth,
    getIsTransferCompletedAlgorand,
    getIsTransferCompletedEth,
    getOriginalAssetAlgorand,
    redeemOnAlgorand,
    redeemOnEth,
    redeemOnEthNative,
    transferFromAlgorand,
    transferFromEth,
    transferFromEthNative,
    getIsTransferCompletedSolana
} from "@certusone/wormhole-sdk/lib/cjs/token_bridge";
import {
    getEmitterAddressAlgorand,
    getEmitterAddressEth,
    getEmitterAddressSolana,
    parseSequenceFromLogAlgorand,
    parseSequenceFromLogEth,
    parseSequenceFromLogSolana
} from "@certusone/wormhole-sdk/lib/cjs/bridge"
import { TransactionSignerPair } from '@certusone/wormhole-sdk/lib/cjs/algorand';
import { getGovernorIsVAAEnqueuedWithRetry, getSignedVAAWithRetry } from "@certusone/wormhole-sdk/lib/cjs/rpc"
// ****************************************************

import algosdk, { Algodv2, encodeUint64 } from "algosdk";
import { BigNumberish, ContractReceipt, ethers, PayableOverrides, Signer } from "ethers";
import {
    isEVMChain,
    toChainId,
    WORMHOLE_RPC_HOSTS,
    AlgorandChainName,
    CONTRACTS,
    coalesceChainName,
    SolanaChainName,
} from "./constants";
import {
    ChainName,
    WormholeEnvironment,
    WormholeNetwork,
    XAssetId,
    XContractAddress,
    XRecipientId,
} from "./types"
import { WormholeDictionary } from "./dictionary";
import { encodeUint16, getAlgorandIdAsString, toBigInt, zeroPadBytes } from "../utils";
import { getPublicKeyByAddress } from "../chains";
import { CircleIntegration } from "./circle";
import { tryHexToNativeString, tryNativeToUint8Array, tryUint8ArrayToNative } from "@certusone/wormhole-sdk/lib/cjs/utils/array";
import { Connection, Keypair, PublicKey, PublicKeyInitData, SendTransactionError, Transaction, TransactionResponse, TransactionSignature, VersionedTransactionResponse } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { SolanaSignTxCallback } from "../tools";
import { custom_postVaaWithRetry, custom_redeemOnSolana, custom_transferFromSolana, custom_transferNativeSol } from "./internal/wrappedSolanaTokenBridge";
import { addPriorityFees } from "../internal";
import { sendAndConfirmTransactionsWithRetry } from "@certusone/wormhole-sdk/lib/cjs/solana";

export type SolanaRedeemProgress = {
    verifySigTxs?: Transaction[];
    postVaaTx?: Transaction;
    signers?: any[]; // see https://vscode.dev/github/c3exchange/c3/blob/fix/solana-redeem-rework/app/node_modules/%40certusone/wormhole-sdk/lib/cjs/solana/utils/transaction.d.ts#L6
    successTxCount: number;
    totalTxCount: number;
}

export interface WormholeService {
    getMirrorAsset(xAsset: XAssetId, dest: ChainName, provider?: ethers.providers.Provider | ethers.Signer): Promise<XAssetId>
    createWormholeTxForEthereumRedeem(sender: XRecipientId, vaa: Uint8Array, signer: Signer, overrides?: ethers.Overrides): Promise<ContractReceipt>
    createWormholeTxForSolanaRedeem(asset: XAssetId, signedVAA: Uint8Array, connection: Connection, payerAccount: PublicKey, signCallback: SolanaSignTxCallback, transactionProgress: SolanaRedeemProgress, postVaaMaxRetries?: number, multiplier?: number, maxPriorityFeeCap?: number, minPriorityFee?: number): Promise<string>;
    redeemOnAlgorand(sender: XRecipientId, vaa: Uint8Array): Promise<TransactionSignerPair[]>
    createWormholeTxForEvmNetworkDeposit(toAddress: XRecipientId, asset: XAssetId, amount: BigNumberish, repayAmount: bigint, signer: Signer, receiver: string, overrides?: PayableOverrides): Promise<ContractReceipt>
    createWormholeTxForEvmNetworkDeposit_CCTP(toAddress: XRecipientId, asset: XAssetId, amount: BigNumberish, repayAmount: bigint, signer: Signer, receiver: string, hubAddress: string, overrides?: PayableOverrides): Promise<ContractReceipt>
    createWormholeTxForAlgorandNetworkWithdraw(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]>
    createWormholeTxForAlgorandNetworkWithdraw_CCTP(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, hubAddress: string, optionalArgs?: any) : Promise<TransactionSignerPair[]>
    createWormholeTxForSolanaNetworkDeposit(connection: Connection, publicKey: PublicKey, signCallback: SolanaSignTxCallback, toAddress: XRecipientId, asset: XAssetId, amount: bigint, repayAmount: bigint, receiver: string): Promise<TransactionSignature>
    // createWormholeTxForSolanaNetworkDeposit_CCTP(connection: Connection, keypair: Keypair, toAddress: XRecipientId, asset: XAssetId, amount: bigint, repayAmount: bigint, receiver: string): Promise<Transaction>
    fetchVaaFromSource(evmSourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<Uint8Array>
    getWormholeVaaSequenceFromEthereumTx(chain: ChainName,txReceipt: ethers.ContractReceipt ) : string
    getWormholeVaaSequenceFromAlgorandTx (txId: string): Promise<string>
    getWormholeVaaSequenceFromSolanaTx(transactionResponse: TransactionResponse | VersionedTransactionResponse): Promise<string>
    getDictionary() : WormholeDictionary
    isEthereumTransferComplete (signer: ethers.Signer | ethers.providers.Provider, signedVAA: Uint8Array, evmDestChain: ChainName): Promise<boolean>
    isAlgorandTransferComplete (signedVAA: Uint8Array): Promise<boolean>
    isSolanaTransferComplete(connection: Connection, signedVAA: Uint8Array): Promise<boolean>
    getNetwork(): WormholeNetwork
    isVaaEnqueued(sourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<boolean>
    createSolanaAtaAccount(connection: Connection, associatedTokenAddress: PublicKey, ownerPublicKey: PublicKey, ownerSignCallback: SolanaSignTxCallback, mint: PublicKey): Promise<string | undefined>
    solanaAtaExistsFromOwner(connection: Connection, ownerAddr: string, tokenAddress: string): Promise<boolean>
    getSolanaAssociatedTokenAddress(xAsset: XContractAddress, owner: XContractAddress): Promise<PublicKey>
    getSolanaAssociatedTokenAddressRaw(mint: PublicKeyInitData, owner: PublicKeyInitData): PublicKey
}

//TODO: Would like to depend on an interface here so we can mock Wormhole in tests
export class WormholeServiceImpl implements WormholeService {
    private dictionary: WormholeDictionary;

    constructor(private wormholeEnvironment: WormholeEnvironment, private algodClient: Algodv2) {
        this.dictionary = new WormholeDictionary(this.wormholeEnvironment);
    }

    public getDictionary() : WormholeDictionary{
        return this.dictionary;
    }

    public getNetwork(): WormholeNetwork {
        return this.wormholeEnvironment.WormholeNetwork
    }

    buildDepositCallData(asset: XAssetId, toAddress: XRecipientId, repayAmount: bigint, receiver: string, sender: string) : { payload: Buffer, recipient: XRecipientId } {

        if(toAddress.chain != AlgorandChainName)
            throw new Error(`${toAddress.chain} should be ${AlgorandChainName}`)

        const PAYLOAD_ID_STRING = 'wormholeDeposit'
        const destinationAlgorandContractAddress = getAlgorandIdAsString(BigInt(toAddress.tokenAddress));
        const recipient : XRecipientId = {
            chain: AlgorandChainName,
            tokenAddress: destinationAlgorandContractAddress
        }

        // To support CCTP-cross transfers we need to embed the originator address, chain, and destination appId in the payload.

        let payload = Buffer.concat([Buffer.from(PAYLOAD_ID_STRING),
            getPublicKeyByAddress(receiver),
            algosdk.encodeUint64(repayAmount),
            algosdk.encodeUint64(BigInt(toAddress.tokenAddress)),
            encodeUint16(toChainId(asset.chain)),
            getPublicKeyByAddress(sender)
        ])
        return { payload, recipient }
    }

    public  async createWormholeTxForEvmNetworkDeposit(
        toAddress: XRecipientId,
        asset: XAssetId,
        amount: BigNumberish,
        repayAmount: bigint,
        signer: Signer,
        receiver: string,
        overrides?: PayableOverrides,
    ): Promise<ContractReceipt> {

        const { payload, recipient } = this.buildDepositCallData(asset, toAddress, repayAmount, receiver, await signer.getAddress())

        let tx: ethers.ContractReceipt
        const relayerFee = BigInt(0);
        const assetBridge = this.dictionary.getTokenBridgeContractAddress(asset.chain);

        if (!this.dictionary.isWrappedCurrency(asset) ) {
            tx = await transferFromEth(
                assetBridge.tokenAddress,
                signer,
                asset.tokenAddress,
                amount,
                toChainId(recipient.chain),
                Buffer.from(recipient.tokenAddress, 'hex'),
                relayerFee,
                overrides,
                payload)
        } else {
            tx = await transferFromEthNative(
                assetBridge.tokenAddress,
                signer,
                amount,
                toChainId(recipient.chain),
                Buffer.from(recipient.tokenAddress, 'hex'),
                relayerFee,
                overrides,
                payload)
        }
        return tx
    }

    public async createWormholeTxForSolanaNetworkDeposit(
        connection: Connection,
        publicKey: PublicKey,
        signCallback: SolanaSignTxCallback,
        toAddress: XRecipientId,
        asset: XAssetId,
        amount: bigint,
        repayAmount: bigint,
        receiver: string): Promise<TransactionSignature> {

        const relayerFee = BigInt(0);

        const { payload, recipient } = this.buildDepositCallData(asset, toAddress, repayAmount, receiver, publicKey.toString())
        let tx: Transaction
        const tokenBridgeAddress = this.dictionary.getTokenBridgeContractAddress(SolanaChainName);
        const bridgeAddress = this.dictionary.getCoreContractAddress(SolanaChainName);

        if (this.dictionary.isWrappedCurrency(asset)) {
            tx = await custom_transferNativeSol(
                connection,
                bridgeAddress.tokenAddress,
                tokenBridgeAddress.tokenAddress,
                publicKey,
                amount,
                Buffer.from(recipient.tokenAddress, 'hex'),
                toChainId(recipient.chain),
                relayerFee,
                payload)
        } else {
            const tokenAddress = await getAssociatedTokenAddress(new PublicKey(asset.tokenAddress), publicKey)

            tx = await custom_transferFromSolana(
                connection,
                bridgeAddress.tokenAddress,
                tokenBridgeAddress.tokenAddress,
                publicKey,
                tokenAddress.toString(),
                asset.tokenAddress,
                amount,
                Buffer.from(recipient.tokenAddress, 'hex'),
                toChainId(recipient.chain),
                undefined, // originChain
                undefined, // originAddress
                undefined, // fromOwnerAddress
                relayerFee, // zero relayer fee
                payload)
        }

        const signedTx = await signCallback(tx)
        const txn = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true, maxRetries: 50 })
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            signature: txn,
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        })

        return txn
    }

    public async createWormholeTxForEvmNetworkDeposit_CCTP(
        toAddress: XRecipientId,
        asset: XAssetId,
        amount: BigNumberish,
        repayAmount: bigint,
        signer: Signer,
        receiver: string,
        hubAddress: string,
        overrides?: PayableOverrides,
    ): Promise<ContractReceipt> {

        const { payload, recipient } = this.buildDepositCallData(asset, toAddress, repayAmount, receiver, await signer.getAddress())

        const whCctpAbi: ethers.ContractInterface = [
           "function transferTokensWithPayload(tuple(address token, uint256 amount, uint16 targetChain, bytes32 mintRecipient), uint32 batchId, bytes payload) returns (uint64 messageSequence)" ]

        const whCctpIntegrationContract = new ethers.Contract(
            this.dictionary.getWormholeCctpIntegrationContractAddress(asset.chain).tokenAddress,
            whCctpAbi,
            signer)

        const txferParams: CircleIntegration.TransferParameters = {
            token: asset.tokenAddress,
            amount: ethers.BigNumber.from(amount),
            targetChain: this.dictionary.getCCTPHubChainId(),
            mintRecipient: tryNativeToUint8Array(hubAddress, this.dictionary.getCCTPHubChainId())
        }

        const transferTx = await whCctpIntegrationContract.transferTokensWithPayload(txferParams, 0n, payload)
        return transferTx.wait()
    }


    public async createWormholeTxForAlgorandNetworkWithdraw(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]> {
        
        // (!) If going to Solana, get the Associated Token Account for the destination address,
        //     not the Wallet address which WONT work
        
        if(xAsset.chain != fromXAddress.chain ){
            throw  new Error(`Source asset chain ${xAsset.chain} should match from Account chain ${fromXAddress.chain} `);
        }

        if(fromXAddress.chain !== AlgorandChainName)
            throw  new Error(`Source Address needs to be ${AlgorandChainName} `);

        
        const whTokenBridgeAppId = toBigInt(this.dictionary.getTokenBridgeAppId());
        const whCoreAppId = toBigInt(this.dictionary.getCoreAppId());
        const assetId = BigInt(xAsset.tokenAddress)
        return await transferFromAlgorand(
            this.algodClient,
            whTokenBridgeAppId,
            whCoreAppId,
            fromXAddress.tokenAddress,
            assetId,
            amount,
            toXAddress.tokenAddress,
            toXAddress.chain,
            fee
        )

    }

    public async createWormholeTxForAlgorandNetworkWithdraw_CCTP(
        fromXAddress: XRecipientId,
        toXAddress: XRecipientId,
        xAsset: XContractAddress,
        amount: bigint,
        fee: bigint,
        hubAddress: string,
        optionalArgs?: any
    ) : Promise<TransactionSignerPair[]> {
        if (!optionalArgs || !optionalArgs.appId) {
            throw new Error("Missing source App ID for CCTP transfer")
        }

        if(xAsset.chain != fromXAddress.chain ){
            throw  new Error(`Source asset chain ${xAsset.chain} should match from Account chain ${fromXAddress.chain} `)
        }

        if(fromXAddress.chain !== AlgorandChainName)
            throw  new Error(`Source Address needs to be ${AlgorandChainName} `)

        const cctpWithdrawPayload = Buffer.concat([
            Buffer.from('cctpWithdraw'),
            Buffer.from(toXAddress.tokenAddress, 'hex'),
            encodeUint16(toChainId(toXAddress.chain)),
            encodeUint64(optionalArgs.appId)
        ])

        return await transferFromAlgorand(this.algodClient,
            toBigInt(this.dictionary.getTokenBridgeAppId()),
            toBigInt(this.dictionary.getCoreAppId()),
            fromXAddress.tokenAddress,
            BigInt(xAsset.tokenAddress),
            amount,
            hubAddress,
            this.dictionary.getCCTPHubChainId(),
            fee,
            Uint8Array.from(cctpWithdrawPayload))
    }

    public  getWormholeVaaSequenceFromEthereumTx(chain: ChainName, txReceipt: ethers.ContractReceipt ) : string
    {
        const coreContractAddress = this.dictionary.getCoreContractAddress(chain);
        return parseSequenceFromLogEth(txReceipt,coreContractAddress.tokenAddress )
    }

    public async getWormholeVaaSequenceFromAlgorandTx (txId: string): Promise<string> {
        const pendingTxInfo = await this.algodClient.pendingTransactionInformation(txId).do()
        return parseSequenceFromLogAlgorand(pendingTxInfo)
    }

    public async getWormholeVaaSequenceFromSolanaTx (transactionResponse: TransactionResponse | VersionedTransactionResponse): Promise<string> {
        return parseSequenceFromLogSolana(transactionResponse)
    }

    /**
     * Returns the mirrored asset for a given destination chain.
     * @param xAsset The asset to query for. It's chain must be different from the destination chain.
     * @param dest The destination chain to map.
     * @param provider The RPC provider to use for the query, if needed. This must match the destination chain to query if it's an EVM chain.
     * @returns  The mirrored asset for the destination chain.
     */
    public  async  getMirrorAsset(xAsset: XAssetId, dest: ChainName, provider?: ethers.providers.Provider | ethers.Signer): Promise<XAssetId> {

        if (xAsset.chain === dest) {
            throw new Error("Source and destination chains must be different")
        }

        if (dest !== AlgorandChainName && xAsset.chain !== AlgorandChainName) {
            throw new Error("Either source or destination chain must be Algorand")
        }

        if(dest === AlgorandChainName){

            // Get the foreign asset mirred on Algorand.

            const tokenAddress = xAsset.tokenAddress.replace('0x', '');
            const addr = await getForeignAssetAlgorand(this.algodClient, toBigInt(this.dictionary.getTokenBridgeAppId()) ,xAsset.chain, zeroPadBytes(tokenAddress, 32))
            if (!addr) {
                throw new Error("There is no mapped ASA for such token address")
            }
            return { tokenAddress: addr.toString() , chain: dest}
        } else {

            // Get the foreign asset mirrored elsewhere.

            const asaId  = BigInt(xAsset.tokenAddress);
            const wrapInfo = await getOriginalAssetAlgorand(this.algodClient, toBigInt(this.dictionary.getTokenBridgeAppId()), asaId)
            if (wrapInfo.chainId === toChainId(dest)) {
                const tokenAddress = tryUint8ArrayToNative(wrapInfo.assetAddress, dest)
                return {
                    tokenAddress,
                    chain: dest
                };
            }
            else {
                // Use 'reverse-lookup' to see if the Original Asset is mirrored on the destination chain.

                if (isEVMChain(wrapInfo.chainId)) {
                    if (!provider) {
                        throw new Error("Signer is required to do reverse-lookup from EVM chains")
                    }
                    const tokenBridge = CONTRACTS[this.wormholeEnvironment.WormholeNetwork][coalesceChainName(dest)].token_bridge
                    if (!tokenBridge) {
                        throw new Error("There is no known token bridge for such chain")
                    }
                    const tokenAddress = await getForeignAssetEth(tokenBridge, provider, wrapInfo.chainId, wrapInfo.assetAddress)
                    if (!tokenAddress) {
                        throw new Error("There is no mapped token for such ASA ID after reverse-lookup, or the provider is not correct")
                    }

                    return {
                        tokenAddress,
                        chain: dest
                    }
                }
            }
        }

        throw new Error(`Failed to map  ${xAsset.tokenAddress} from ${xAsset.chain} -> ${dest}`);

    }

    public async fetchVaaFromSource (sourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<Uint8Array> {
        const hosts = WORMHOLE_RPC_HOSTS[this.wormholeEnvironment.WormholeNetwork] ?? [];
        const tokenBridgeAddress : XContractAddress = this.dictionary.getTokenBridgeContractAddress(sourceChain);
        let emitterAddress
        if (isEVMChain(sourceChain)) {
            emitterAddress = getEmitterAddressEth(this.dictionary.getTokenBridgeContractAddress(sourceChain).tokenAddress)
        } else if (sourceChain === SolanaChainName) {
            emitterAddress = getEmitterAddressSolana(this.dictionary.getTokenBridgeContractAddress(sourceChain).tokenAddress)
        } else if (sourceChain === AlgorandChainName) {
            emitterAddress = getEmitterAddressAlgorand(BigInt(tokenBridgeAddress.tokenAddress))
        } else {
            throw new Error(`fetchVaaFromSource: Chain ${sourceChain} is not supported`)
        }

        const { vaaBytes } = await getSignedVAAWithRetry(
            hosts,
            sourceChain,
            emitterAddress,
            vaaSequence.toString(),
            rpcOptions,
            retryTimeout,
            maxRetryCount
        )
        return vaaBytes
    }

    public  async createWormholeTxForEthereumRedeem(asset: XAssetId, signedVAA: Uint8Array, signer: ethers.Signer, overrides?: ethers.Overrides): Promise<ContractReceipt>{
        const evmDestChain = asset.chain;
        const isEthNative = this.dictionary.isWrappedCurrency(asset);
        const bridgeAddress = this.dictionary.getTokenBridgeContractAddress(evmDestChain);
        if (isEthNative) {
            return await redeemOnEthNative(bridgeAddress.tokenAddress, signer, signedVAA, overrides)
        }
        return await redeemOnEth(bridgeAddress.tokenAddress, signer, signedVAA, overrides)
    }


    /**
     * Creates a transaction for withdraw assets on Solana.
     * @remarks The transactionProgress object is modified in place, beware of any concurrency issues.
     */
    public async createWormholeTxForSolanaRedeem(asset: XAssetId, 
        signedVAA: Uint8Array, 
        connection: Connection,
        payerAccount: PublicKey, 
        signCallback: SolanaSignTxCallback<Transaction>, 
        transactionProgress: SolanaRedeemProgress, 
        postVaaMaxRetries?: number, 
        multiplier?: number, 
        maxPriorityFeeCap?: number, 
        minPriorityFee?: number):  Promise<string>
    {
        // const isNativeSol = this.dictionary.isWrappedCurrency(asset);
        const bridgeAddress = this.dictionary.getCoreContractAddress(SolanaChainName);
        const tokenBridgeAddress = this.dictionary.getTokenBridgeContractAddress(SolanaChainName);

        const feeRecipientTokenAccount = this.getSolanaAssociatedTokenAddressRaw(new PublicKey(asset.tokenAddress), payerAccount).toString()

        await custom_postVaaWithRetry(connection, signCallback, payerAccount, new PublicKey(bridgeAddress.tokenAddress), Buffer.from(signedVAA), transactionProgress, postVaaMaxRetries, "finalized", multiplier, maxPriorityFeeCap, minPriorityFee)
        const tx = await custom_redeemOnSolana(connection, bridgeAddress.tokenAddress, tokenBridgeAddress.tokenAddress, payerAccount.toString(), signedVAA, feeRecipientTokenAccount, "finalized", multiplier, maxPriorityFeeCap, minPriorityFee)
        const txn = await sendAndConfirmTransactionsWithRetry(connection, signCallback, payerAccount.toString(), [tx], postVaaMaxRetries, { skipPreflight: false, commitment: "finalized" })
        transactionProgress.successTxCount++
        return txn[0].signature
    }

    public  async redeemOnAlgorand(asset: XAssetId, vaa: Uint8Array): Promise<TransactionSignerPair[]>{
        const bridgeAddress =toBigInt(this.dictionary.getTokenBridgeAppId());
        const coreAddress = toBigInt(this.dictionary.getCoreAppId());
        return  redeemOnAlgorand(this.algodClient,bridgeAddress,coreAddress,new Uint8Array(vaa),asset.tokenAddress)
    }

    public  async isEthereumTransferComplete (signer: ethers.Signer | ethers.providers.Provider, signedVAA: Uint8Array, evmDestChain: ChainName): Promise<boolean> {
        return getIsTransferCompletedEth(
            this.dictionary.getTokenBridgeContractAddress(evmDestChain).tokenAddress,
            signer,
            signedVAA,
        )
    }

    public async isAlgorandTransferComplete (signedVAA: Uint8Array): Promise<boolean> {
        return getIsTransferCompletedAlgorand(
            this.algodClient,
            toBigInt(this.dictionary.getTokenBridgeAppId()),
            signedVAA,
        )
    }

    public async isSolanaTransferComplete(connection: Connection, signedVAA: Uint8Array): Promise<boolean> {
        return await getIsTransferCompletedSolana(this.dictionary.getTokenBridgeContractAddress(SolanaChainName).tokenAddress, signedVAA, connection)
    }

    public async isVaaEnqueued(sourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<boolean> {
        const hosts = WORMHOLE_RPC_HOSTS[this.wormholeEnvironment.WormholeNetwork] ?? [];
        const tokenBridgeAddress: XContractAddress = this.dictionary.getTokenBridgeContractAddress(sourceChain);

        let emitterAddress
        if (isEVMChain(sourceChain)) {
            emitterAddress = getEmitterAddressEth(this.dictionary.getTokenBridgeContractAddress(sourceChain).tokenAddress)
        } else if (sourceChain === SolanaChainName) {
            emitterAddress = getEmitterAddressSolana(this.dictionary.getTokenBridgeContractAddress(sourceChain).tokenAddress)
        } else if (sourceChain === AlgorandChainName) {
            emitterAddress = getEmitterAddressAlgorand(BigInt(tokenBridgeAddress.tokenAddress))
        } else {
            throw new Error(`isVaaEnqueued: Chain ${sourceChain} is not supported`)
        }

        const response = await getGovernorIsVAAEnqueuedWithRetry(hosts,
            sourceChain,
            emitterAddress,
            vaaSequence.toString(),
            rpcOptions,
            retryTimeout,
            maxRetryCount)
        return response.isEnqueued
    }


    /**
     * Gets the ATA Address for a specific token and owner tuple.
     * 
     * @param asa The token to get the ATA for.
     * @param owner The owner of the ATA.  This must be a Solana address enconded in hex (not base58 string)
     * @returns The associated token address for the owner.
     */
    public async getSolanaAssociatedTokenAddress(asa: XContractAddress, owner: XContractAddress) {
        const tokenProgram = await this.getMirrorAsset(asa, SolanaChainName)
        const associatedTokenAddress = getAssociatedTokenAddressSync(
            new PublicKey(tokenProgram.tokenAddress),
            new PublicKey(tryHexToNativeString(owner.tokenAddress, SolanaChainName)))
        return associatedTokenAddress
    }

    getSolanaAssociatedTokenAddressRaw(mint: PublicKeyInitData, owner: PublicKeyInitData): PublicKey {
        return getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner))
    }

    public async solanaAtaExistsFromOwner(connection: Connection, ownerAddress: string, tokenAddress: string): Promise<boolean> {
        const associatedTokenAddress = this.getSolanaAssociatedTokenAddressRaw(tokenAddress, ownerAddress)
        const associatedAddressInfo = await connection.getAccountInfo(associatedTokenAddress)
        return !!associatedAddressInfo
    }

    public async createSolanaAtaAccount(connection: Connection, associatedTokenAddress: PublicKey, ownerPublicKey: PublicKey, ownerSignCallback: SolanaSignTxCallback, mint: PublicKey): Promise<string | undefined> {
        const associatedAddressInfo = await connection.getAccountInfo(associatedTokenAddress)
        if (!associatedAddressInfo) {
            const tx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    ownerPublicKey, // payer
                    associatedTokenAddress, // associated token address
                    ownerPublicKey, // owner
                    mint
                )
            );
            const { blockhash } = await connection.getLatestBlockhash()
            tx.recentBlockhash = blockhash
            tx.feePayer = ownerPublicKey
            await addPriorityFees(connection, tx, 1.25)
            const signedTx = await ownerSignCallback(tx)
            const signature = await connection.sendRawTransaction(signedTx.serialize())

            const latestBlockHash = await connection.getLatestBlockhash();

            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature,
            });

            return signature
        }
    }
}
