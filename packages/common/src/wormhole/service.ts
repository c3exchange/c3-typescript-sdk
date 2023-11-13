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
    transferFromEthNative
} from "@certusone/wormhole-sdk/lib/cjs/token_bridge";
import {
    getEmitterAddressAlgorand,
    getEmitterAddressEth,
    parseSequenceFromLogAlgorand,
    parseSequenceFromLogEth,
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
    CHAIN_ID_AVAX
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
import { tryNativeToUint8Array } from "@certusone/wormhole-sdk/lib/cjs/utils/array";

export interface WormholeService {
    getMirrorAsset(xAsset: XAssetId, dest: ChainName, provider?: ethers.providers.Provider | ethers.Signer): Promise<XAssetId>
    createWormholeTxForEthereumRedeem(sender: XRecipientId, vaa: Uint8Array, signer: Signer, overrides?: ethers.Overrides): Promise<ContractReceipt>
    redeemOnAlgorand(sender: XRecipientId, vaa: Uint8Array): Promise<TransactionSignerPair[]>
    createWormholeTxForEvmNetworkDeposit(toAddress: XRecipientId, asset: XAssetId, amount: BigNumberish, repayAmount: bigint, signer: Signer, receiver: string, overrides?: PayableOverrides): Promise<ContractReceipt>
    createWormholeTxForEvmNetworkDeposit_CCTP(toAddress: XRecipientId, asset: XAssetId, amount: BigNumberish, repayAmount: bigint, signer: Signer, receiver: string, overrides?: PayableOverrides): Promise<ContractReceipt>
    createWormholeTxForAlgorandNetworkWithdraw(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]>
    createWormholeTxForAlgorandNetworkWithdraw_CCTP(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]>
    fetchVaaEthereumSource(evmSourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<Uint8Array>
    getWormholeVaaSequenceFromEthereumTx(chain: ChainName,txReceipt: ethers.ContractReceipt ) : string
    getWormholeVaaSequenceFromAlgorandTx (txId: string): Promise<string>
    getDictionary() : WormholeDictionary
    isEthereumTransferComplete (signer: ethers.Signer | ethers.providers.Provider, signedVAA: Uint8Array, evmDestChain: ChainName): Promise<boolean>
    isAlgorandTransferComplete (signedVAA: Uint8Array): Promise<boolean>
    getNetwork(): WormholeNetwork
    isVaaEnqueuedEthereumSource(evmSourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<boolean> 
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
    
    buildDepositCallData(asset: XAssetId, toAddress: XRecipientId, repayAmount: bigint, receiver: string) : { payload: Buffer, recipient: XRecipientId } {

        if( !isEVMChain(asset.chain) )
            throw new Error(` ${asset.chain} is Not an EVM Chain, cant create Deposit with Ether.js`);

        if(toAddress.chain != AlgorandChainName)
            throw new Error(`${toAddress.chain} should be ${AlgorandChainName}`)

        const PAYLOAD_ID_STRING = 'wormholeDeposit'
        const destinationAlgorandContractAddress = getAlgorandIdAsString(BigInt(toAddress.tokenAddress));
        const recipient : XRecipientId = {
            chain: AlgorandChainName,
            tokenAddress: destinationAlgorandContractAddress
        }

        // To support CCTP-cross transfers we need to embed the destination address in the payload.

        let payload = Buffer.concat([Buffer.from(PAYLOAD_ID_STRING), getPublicKeyByAddress(receiver), algosdk.encodeUint64(repayAmount), algosdk.encodeUint64(BigInt(toAddress.tokenAddress))])
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

        const { payload, recipient } = this.buildDepositCallData(asset, toAddress, repayAmount, receiver)

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

    public async createWormholeTxForEvmNetworkDeposit_CCTP(
        toAddress: XRecipientId,
        asset: XAssetId,
        amount: BigNumberish,
        repayAmount: bigint,
        signer: Signer,
        receiver: string,
        overrides?: PayableOverrides,
    ): Promise<ContractReceipt> {

        const { payload, recipient } = this.buildDepositCallData(asset, toAddress, repayAmount, receiver)

        const whCctpAbi: ethers.ContractInterface = [
           "function transferTokensWithPayload(tuple(address token, uint256 amount, uint16 targetChain, bytes32 mintRecipient), uint32 batchId, bytes payload) returns (uint64 messageSequence)" ]

        const whCctpIntegrationContract = new ethers.Contract(
            this.dictionary.getWormholeCctpIntegrationContractAddress(asset.chain).tokenAddress,
            whCctpAbi,
            signer)

        const txferParams: CircleIntegration.TransferParameters = {
            token: asset.tokenAddress,
            amount: ethers.BigNumber.from(amount),
            targetChain: CHAIN_ID_AVAX,  // Hardcoded: We assume C3 CCTP hub is in Avalanche.
            mintRecipient: tryNativeToUint8Array(this.dictionary.getCctpHubAddress().address, 
                this.dictionary.getCctpHubAddress().chainId) 
        }
        
        const transferTx = await whCctpIntegrationContract.transferTokensWithPayload(txferParams, 0n, payload)
        return transferTx.wait()
    }  

    public async createWormholeTxForAlgorandNetworkWithdraw(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]> {

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

    public async createWormholeTxForAlgorandNetworkWithdraw_CCTP(fromXAddress: XRecipientId, toXAddress: XRecipientId, xAsset: XContractAddress, amount: bigint, fee: bigint, optionalArgs?: any) : Promise<TransactionSignerPair[]>
    {
        if (!optionalArgs || !optionalArgs.appId) {
            throw new Error("Missing source App ID for CCTP transfer")
        }

        if(xAsset.chain != fromXAddress.chain ){
            throw  new Error(`Source asset chain ${xAsset.chain} should match from Account chain ${fromXAddress.chain} `);
        }

        if(fromXAddress.chain !== AlgorandChainName)
            throw  new Error(`Source Address needs to be ${AlgorandChainName} `);

        const cctpHubInfo = this.dictionary.getCctpHubAddress()

        const cctpWithdrawPayload = Buffer.concat([Buffer.from('cctpWithdraw'), Buffer.from(toXAddress.tokenAddress, 'hex'), encodeUint16(toChainId(toXAddress.chain)), encodeUint64(optionalArgs.appId)])

        return await transferFromAlgorand(this.algodClient, 
            toBigInt(this.dictionary.getTokenBridgeAppId()),
            toBigInt(this.dictionary.getCoreAppId()),
            fromXAddress.tokenAddress,
            BigInt(xAsset.tokenAddress),
            amount,
            cctpHubInfo.address,
            cctpHubInfo.chainId,
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
                const tokenAddress = '0x' + ethers.utils.hexlify(wrapInfo.assetAddress).slice(26);
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
                throw new Error("There is no mapped token for such ASA ID")
            }
        }

        throw new Error(`Failed to map  ${xAsset.tokenAddress} from ${xAsset.chain} -> ${dest}`);

    }

    public  async fetchVaaEthereumSource(evmSourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<Uint8Array> {
        const hosts = WORMHOLE_RPC_HOSTS[this.wormholeEnvironment.WormholeNetwork] ?? [];
        const tokenBridgeAddress : XContractAddress = this.dictionary.getTokenBridgeContractAddress(evmSourceChain);
        const emitterAddress = isEVMChain(evmSourceChain) ? getEmitterAddressEth(this.dictionary.getTokenBridgeContractAddress(evmSourceChain).tokenAddress)
                : evmSourceChain === AlgorandChainName ? getEmitterAddressAlgorand(BigInt(tokenBridgeAddress.tokenAddress)) : '0';
        const { vaaBytes } = await getSignedVAAWithRetry(hosts,
            evmSourceChain,
            emitterAddress,
            vaaSequence.toString(),
            rpcOptions,
            retryTimeout,
            maxRetryCount)
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

    public async isVaaEnqueuedEthereumSource(evmSourceChain: ChainName, vaaSequence: bigint, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>): Promise<boolean> {
        const hosts = WORMHOLE_RPC_HOSTS[this.wormholeEnvironment.WormholeNetwork] ?? [];
        const tokenBridgeAddress: XContractAddress = this.dictionary.getTokenBridgeContractAddress(evmSourceChain);
        const emitterAddress = isEVMChain(evmSourceChain) ? getEmitterAddressEth(this.dictionary.getTokenBridgeContractAddress(evmSourceChain).tokenAddress)
            : evmSourceChain === AlgorandChainName ? getEmitterAddressAlgorand(BigInt(tokenBridgeAddress.tokenAddress)) : '0';
        const response = await getGovernorIsVAAEnqueuedWithRetry(hosts,
            evmSourceChain,
            emitterAddress,
            vaaSequence.toString(),
            rpcOptions,
            retryTimeout,
            maxRetryCount)
        return response.isEnqueued
    }

}
