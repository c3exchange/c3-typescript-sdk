import { ChainId, ERC20, accountIdToUserAddress, encodeBase64, generateStandardDepositGroup, getEvmGasLimitByChain, makeSignatureValidator, toChainId, toChainName } from "@c3exchange/common"
import {
    AccountId,
    AlgorandSigner,
    AssetId,
    Base64,
    ChainName,
    Instrument,
    InstrumentAmount,
    InstrumentSlotId,
    SystemInfoResponse,
    UserAddress,
    WormholeDictionary,
    WormholeService,
    XAssetId,
    XContractAddress
} from "@c3exchange/common"
import algosdk from "algosdk"
import { ethers } from "ethers"
import { PublicKey, TransactionResponse } from "@solana/web3.js"
import { getMint } from "@solana/spl-token"
import { parseUnits } from "ethers/lib/utils"
import { DepositResult, SubmitWormholeVAA, WormholeDepositResult, WormholeSigner } from "../types"
import { isEVMSigner, isSolanaSigner } from "./factory"
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport"


async function prepareAlgorandDeposit(
    algodClient: algosdk.Algodv2,
    contracts: SystemInfoResponse["contractIds"],
    serverAddress: UserAddress,
    userAddress: UserAddress,
    assetId: AssetId,
    amount: InstrumentAmount,
    instrumentSlotId: InstrumentSlotId,
    repayAmount: InstrumentAmount,
    funder: AlgorandSigner,
): Promise<Base64> {
    const signatureValidator = makeSignatureValidator(serverAddress).logicSig
    const {
        txns,
        transferStartIndex: txToSignIndex
    } = await generateStandardDepositGroup(
        algodClient,
        contracts,
        signatureValidator,
        serverAddress,
        userAddress,
        funder.address,
        amount.toContract(),
        assetId,
        instrumentSlotId,
        repayAmount.toContract(),
    )
    const grouped = algosdk.assignGroupID(txns)
    if (grouped === undefined || grouped.length === 0) {
        throw new Error('Could not assign a group ID to the payment transaction')
    }
    // Latest version of the wallet agregator supports only the ARC-01 standard
    // To maintain compatibility with both methods, AlgorandSigner will have a flag to indicate if it supports ARC-01
    const [txsToSign, signedTxIndex] = funder.isArc001 ? [grouped, txToSignIndex] : [[grouped[txToSignIndex]], 0]
    const signedTxs = await funder.signTransactions(txsToSign)
    const txToEncode = signedTxs[signedTxIndex]
    const signed = encodeBase64(txToEncode)
    return signed
}

const depositAsset = async (
    funderSigner: WormholeSigner,
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    isNativeToken: boolean,
    bridgeAddress: string,
    originChain: ChainName,
    isCCTP: boolean,
    wormholeService: WormholeService,
    systemInfo: SystemInfoResponse,
    userAddress: UserAddress,
    xAddress: XContractAddress,
    xAsset: XAssetId,
): Promise<{ txReceipt: unknown, txHash: string }> => {
    if (isEVMSigner(funderSigner)) {
        const decimalValue = amount.toDecimal()
        let baseAmountParsed
        if (!isNativeToken) {
            const erc20Contract = new ERC20(xAsset.tokenAddress, funderSigner.getSigner())
            const decimals = await erc20Contract.getTokenAddressDecimal()
            baseAmountParsed = parseUnits(decimalValue, decimals)
            const allowance = await erc20Contract.getAllowedAmountToSpend(bridgeAddress)
            if (allowance.lt(baseAmountParsed)) {
                await erc20Contract.approveAmountToSpend(bridgeAddress, baseAmountParsed, {
                    gasLimit: getEvmGasLimitByChain(originChain)?.erc20_approve,
                })
            }
        } else {
            // Is ETH Native
            baseAmountParsed = parseUnits(decimalValue, 18)
        }

        const overrides: ethers.Overrides = {
            gasLimit: getEvmGasLimitByChain(originChain)?.wormhole_transfer_with_payload,
        }
    
        let txReceipt: ethers.ContractReceipt
        const args = [xAddress, xAsset, baseAmountParsed, repayAmount.toContract(), funderSigner.getSigner(), userAddress] as const
        if (isCCTP) {
            txReceipt = await wormholeService.createWormholeTxForEvmNetworkDeposit_CCTP( ...args, systemInfo.cctpHubAddress, overrides)
        } else {
            txReceipt = await wormholeService.createWormholeTxForEvmNetworkDeposit(...args, overrides)
        }
        return { txHash: txReceipt.transactionHash, txReceipt }
    } else if (isSolanaSigner(funderSigner)) {
        if (!funderSigner.connection) {
            throw new Error("Solana connection required to deposit funds")
        }
        let txReceipt: TransactionResponse, txHash: string
        if (isCCTP) {
            // TODO: Implement CCTP for Solana
            throw new Error("CCTP not implemented for Solana")
        } else {
            let parsedAmount
            if (isNativeToken) {
                parsedAmount = amount.toContract() * BigInt(10)
            } else {
                const mint = await getMint(funderSigner.connection, new PublicKey(xAsset.tokenAddress))
                parsedAmount = parseUnits(amount.toDecimal(), mint.decimals).toBigInt()
            }
            const txSignature = await wormholeService.createWormholeTxForSolanaNetworkDeposit(
                funderSigner.connection,
                new PublicKey(funderSigner.address),
                funderSigner.signTransaction,
                xAddress,
                xAsset,
                parsedAmount,
                repayAmount.toContract(),
                userAddress,
            )
            txReceipt = await funderSigner.connection.getTransaction(txSignature, { commitment: "finalized", maxSupportedTransactionVersion: 0 }) as TransactionResponse
            if (!txReceipt) {
                throw new Error("Transaction not found")
            }
            txHash = txSignature
        }

        return { txReceipt, txHash }
    } else {
        throw new Error("Unsupported signer")
    }
}

const getWormholeVAASequence = async ( funderSigner: WormholeSigner, wormholeService: WormholeService, funderChainId: ChainId, txReceipt: any): Promise<string> => {
    if (isEVMSigner(funderSigner)) {
        return wormholeService.getWormholeVaaSequenceFromEthereumTx(toChainName(funderChainId), txReceipt)
    } else if (isSolanaSigner(funderSigner)) {
        return wormholeService.getWormholeVaaSequenceFromSolanaTx(txReceipt)
    }
    throw new Error("Unsupported signer")
}

async function prepareWormholeDeposit (
    receiverAccountId: AccountId,
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    funderSigner: WormholeSigner,
    originChain: ChainName,
    wormholeService: WormholeService,
    systemInfo: SystemInfoResponse,
    submitWormholeVAA: SubmitWormholeVAA
): Promise<WormholeDepositResult> {
    const userAddress = accountIdToUserAddress(receiverAccountId)
    const { instrument } = amount
    // Validate instrument
    if (!instrument || !instrument.chains || instrument.chains.length === 0) {
        throw new Error("Invalid assetId provided to deposit")
    }

    // Load and validate instrument chain
    const funderChainId = toChainId(originChain)
    const instrumentChain = instrument.chains.find((c) => c.chainId === funderChainId)
    const wormholeDictionary = wormholeService.getDictionary()

    const { isCCTP, bridgeAddress, tokenInfo: { tokenAddress, isNativeToken } } = getWormholeDepositInfo(amount.instrument, wormholeDictionary, originChain)

    if (!instrumentChain && !isCCTP) {
        throw new Error(`instrument chain with chainId: ${funderChainId} not found`)
    }

    const xAsset: XAssetId = {
        chain: originChain,
        tokenAddress: tokenAddress
    }

    const xAddress: XContractAddress = {
        chain: 'algorand',
        tokenAddress: systemInfo.contractIds.ceOnchain.toString()
    }

    const { txReceipt, txHash } = await depositAsset(
        funderSigner, amount, repayAmount, isNativeToken, bridgeAddress, originChain,
        isCCTP, wormholeService, systemInfo, userAddress, xAddress, xAsset,
    )

    let vaaSequence: string | undefined = undefined
    let vaaSignature: Uint8Array | undefined
    let wasRedeemed = false

    let rpcTransport: Record<string, unknown> | undefined = undefined
    // @ts-ignore NodeHttpTransport is not available in the browser and it is required for the node environment
    if (typeof window === "undefined") {
        rpcTransport = { transport: NodeHttpTransport() }
    }

    const getVAASequence = async () => {
        if (!vaaSequence) {
            vaaSequence = await getWormholeVAASequence(funderSigner, wormholeService, funderChainId, txReceipt)
        }
        return vaaSequence
    }

    const waitForWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions = rpcTransport) => {
        vaaSequence = await getVAASequence()
        if (isCCTP) {
            console.warn("Ignoring waitForWormholeVAA for CCTP")
            return new Uint8Array()
        }
        if (!vaaSignature) {
            vaaSignature = await wormholeService.fetchVaaFromSource(toChainName(funderChainId), BigInt(vaaSequence), retryTimeout, maxRetryCount, rpcOptions)
        }
        return vaaSignature
    }

    const isVaaEnqueued = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions = rpcTransport) => {
        vaaSequence = await getVAASequence()
        return await wormholeService.isVaaEnqueued(toChainName(funderChainId), BigInt(vaaSequence), retryTimeout, maxRetryCount, rpcOptions)
    }

    const isTransferCompleted: WormholeDepositResult["isTransferCompleted"] = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions = rpcTransport) => {
        if (wasRedeemed) {
            return true
        }
        if (!vaaSignature) {
            try {
                vaaSignature = await waitForWormholeVAA(retryTimeout || 0, maxRetryCount || 1, rpcOptions)
            } catch (err) {
                return false
            }
        }
        return wormholeService.isAlgorandTransferComplete(vaaSignature)
    }

    const redeemAndSubmitWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions = rpcTransport) => {
        if (isCCTP) {
            console.warn("Ignoring redeemAndSubmitWormholeVAA for CCTP")
            return ""
        }

        if (wasRedeemed) {
            throw new Error("VAA was already redeemed")
        }
        if (!vaaSignature) {
            vaaSignature = await waitForWormholeVAA(retryTimeout, maxRetryCount, rpcOptions)
        }

        const { id } = await submitWormholeVAA(receiverAccountId, amount, encodeBase64(vaaSignature), repayAmount, { note: txHash })
        wasRedeemed = true

        return id
    }

    return {
        txId: txHash, amount, instrumentId: instrument.id, getVAASequence,
        isTransferCompleted, isVaaEnqueued, waitForWormholeVAA, redeemAndSubmitWormholeVAA
    }
}

const getWormholeDepositInfo = (instrument: Instrument, wormholeDictionary: WormholeDictionary, originChain: ChainName) => {
    const instrumentChain = instrument.chains[0]
    const isCCTP = originChain !== toChainName(wormholeDictionary.getCCTPHubChainId()) &&  wormholeDictionary.isCCTPAsset(instrumentChain.chainId, instrumentChain.tokenAddress)
    let bridgeAddress, tokenAddress
    if (isCCTP) {
        bridgeAddress = wormholeDictionary.getWormholeCctpIntegrationContractAddress(originChain).tokenAddress
        tokenAddress = wormholeDictionary.getUSDCTokenAddress(originChain).tokenAddress
    } else {
        bridgeAddress = wormholeDictionary.getTokenBridgeContractAddress(originChain).tokenAddress
        tokenAddress = instrument.chains.find((c) => c.chainId === toChainId(originChain))?.tokenAddress
        // Validate token address
        if (!tokenAddress) {
            throw new Error("Token address cannot be undefined or null")
        }
    }

    // Check if the token is native
    const isNativeToken = wormholeDictionary.isWrappedCurrency({
        tokenAddress: tokenAddress,
        chain: originChain
    })

    return {
        isCCTP,
        bridgeAddress,
        tokenInfo: {
            originChain,
            tokenAddress,
            isNativeToken,
        }
    }
}

const isCCTPInstrument = (instrument: Instrument, wormholeDictionary: WormholeDictionary): boolean => {
    return instrument.chains.some((c) => c.chainId === wormholeDictionary.getCCTPHubChainId())
}

const asWormholeDepositResult = (result: DepositResult): WormholeDepositResult|undefined => {
    if (
        "getVAASequence" in result &&
        "isTransferCompleted" in result &&
        "isVaaEnqueued" in result &&
        "waitForWormholeVAA" in result &&
        "redeemAndSubmitWormholeVAA" in result
    ) {
        return result as WormholeDepositResult
    }
}

export {
    prepareAlgorandDeposit,
    prepareWormholeDeposit,
    asWormholeDepositResult,
    getWormholeDepositInfo,
    isCCTPInstrument,
}