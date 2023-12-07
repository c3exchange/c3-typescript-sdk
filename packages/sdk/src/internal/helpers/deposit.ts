import { ERC20, encodeBase64, generateStandardDepositGroup, makeSignatureValidator, toChainId, toChainName } from "@c3exchange/common"
import type {
    AccountId,
    AlgorandSigner,
    AssetId,
    Base64,
    ChainName,
    EVMSigner,
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
import { parseUnits } from "ethers/lib/utils"
import { DepositResult, SubmitWormholeVAA, WormholeDepositResult } from "../types"

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

async function prepareWormholeDeposit (
    userAddress: UserAddress,
    receiverAccountId: AccountId,
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    funder: EVMSigner,
    originChain: ChainName,
    wormholeService: WormholeService,
    systemInfo: SystemInfoResponse,
    submitWormholeVAA: SubmitWormholeVAA
): Promise<WormholeDepositResult> {
    const { instrument } = amount
    // Validate instrument
    if (!instrument || !instrument.chains || instrument.chains.length === 0) {
        throw new Error("Invalid assetId provided to deposit")
    }

    // Load and validate instrument chain
    const funderChainId = toChainId(originChain)
    const instrumentChain = instrument.chains.find((c) => c.chainId === funderChainId)
    const wormholeDictionary = wormholeService.getDictionary()

    const {
        isCCTP,
        bridgeAddress,
        tokenInfo: { tokenAddress }
    } = getWormholeDepositInfo(amount.instrument, wormholeDictionary, originChain)

    if (!instrumentChain && !isCCTP) {
        throw new Error(`instrument chain with chainId: ${funderChainId} not found`)
    }

    // Generate xasset
    const xAsset: XAssetId = {
        chain: originChain,
        tokenAddress: tokenAddress
    }

    // Check if the token is eth native
    const isEthNative = wormholeDictionary.isWrappedCurrency({
        tokenAddress: tokenAddress,
        chain: originChain
    })

    if (!isEthNative && !isCCTP) {
        // If it's not eth native, get the appropriate mirror asset from wormhole for this chain and check it matches the token address
        const algorandXAsset: XAssetId = { chain: "algorand", tokenAddress: amount.instrument.asaId.toString() }
        const mirrorAsset = await wormholeService.getMirrorAsset(algorandXAsset, xAsset.chain, funder.getSigner())
        if (tokenAddress.toLowerCase() !== mirrorAsset.tokenAddress.toLowerCase()) {
          throw new Error("Token address provided by the server doesn't match to the one provided by wormhole")
        }
    }

    const overrides: ethers.Overrides = {
        gasLimit: 200000,
    }
    const decimalValue = amount.toDecimal()

    let baseAmountParsed
    if (!isEthNative) {
        const erc20Contract = new ERC20(tokenAddress, funder.getSigner())
        const decimals = await erc20Contract.getTokenAddressDecimal()
        baseAmountParsed = parseUnits(decimalValue, decimals)
        const allowance = await erc20Contract.getAllowedAmountToSpend(bridgeAddress)
        if (allowance.lt(baseAmountParsed)) {
            await erc20Contract.approveAmountToSpend(bridgeAddress, baseAmountParsed)
        }
    } else {
        // Is ETH Native
        baseAmountParsed = parseUnits(decimalValue, 18)
    }

    const xAddress: XContractAddress = {
        chain: 'algorand',
        tokenAddress: systemInfo.contractIds.ceOnchain.toString()
    }

    let txReceip: ethers.ContractReceipt
    if (isCCTP) {
        txReceip = await wormholeService.createWormholeTxForEvmNetworkDeposit_CCTP(
            xAddress,
            xAsset,
            baseAmountParsed,
            repayAmount.toContract(),
            funder.getSigner(),
            userAddress,
            systemInfo.cctpHubAddress,
            overrides,
        )
    } else {
        txReceip = await wormholeService.createWormholeTxForEvmNetworkDeposit(
            xAddress,
            xAsset,
            baseAmountParsed,
            repayAmount.toContract(),
            funder.getSigner(),
            userAddress,
            overrides,
        )
    }

    let vaaSequence: string | undefined = undefined
    let vaaSignature: Uint8Array | undefined
    let wasRedeemed = false

    const getVAASequence = async () => {
        if (!vaaSequence) {
            vaaSequence = await wormholeService.getWormholeVaaSequenceFromEthereumTx(
                toChainName(funderChainId),
                txReceip,
            )
        }
        return vaaSequence
    }

    const waitForWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
        vaaSequence = await getVAASequence()
        if (isCCTP) {
            console.warn("Ignoring waitForWormholeVAA for CCTP")
            return new Uint8Array()
        }
        if (!vaaSignature) {
            vaaSignature = await wormholeService.fetchVaaEthereumSource(toChainName(funderChainId), BigInt(vaaSequence), retryTimeout, maxRetryCount, rpcOptions)
        }
        return vaaSignature
    }

    const isVaaEnqueued = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
        vaaSequence = await getVAASequence()
        return await wormholeService.isVaaEnqueuedEthereumSource(toChainName(funderChainId), BigInt(vaaSequence), retryTimeout, maxRetryCount, rpcOptions)
    }

    const isTransferCompleted = () => {
        if (wasRedeemed) {
            return Promise.resolve(true)
        }
        if (!vaaSignature) {
            throw new Error("VAA signature is not available")
        }
        return wormholeService.isAlgorandTransferComplete(vaaSignature)
    }

    const redeemAndSubmitWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
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

        const { id } = await submitWormholeVAA(receiverAccountId, amount, encodeBase64(vaaSignature), repayAmount, { note: txReceip.transactionHash })
        wasRedeemed = true

        return id
    }

    return {
        txId: txReceip.transactionHash, amount, instrumentId: instrument.id, getVAASequence,
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

    return {
        isCCTP,
        bridgeAddress,
        tokenInfo: {
            originChain,
            tokenAddress
        }
    }
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
}