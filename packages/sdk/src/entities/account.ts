import { UrlConfig } from "../config";
import { MarketInfo } from "../internal/helpers/parser";
import AccountAPIClient from "../internal/account_endpoints"
import HttpClient, { Headers } from "../internal/utils/http"
import { toMarketTrade, toAccountOrder } from "../internal/helpers/order"
import {
    DepositFundsAlgorand,
    DepositFundsWormhole,
    DepositResult,
    Order,
    WithdrawResult,
    WormholeDepositResult,
    WormholeWithdrawResult
} from "../internal/types";
import { AccountOperation, toAccountOperation } from "../internal/helpers/operation";
import {
    Account as AccountInfo,
    AccountId,
    Instrument,
    InstrumentAmount,
    InstrumentId,
    Market,
    MarketId,
    MessageSigner,
    UserAddress,
    AccountOrdersForMarketFilters,
    AccountLoginCompleteResponse,
    SupportedChainId,
    toSupportedChainId,
    PortfolioOverviewResponse,
    ALL_MARKETS_ID,
    AccountOrder,
    AccountTrade,
    OperationStatus,
    AccountOperationType,
    EVMSigner,
    AlgorandSigner,
    toChainId,
    WormholeService,
    createWithdraw,
    InstrumentSlotId,
    AssetId,
    getDataToSign,
    createPoolMove,
    RawSignature,
    createLiquidation,
    XContractAddress,
    OrderId,
    signCancelOrders,
    signOrder,
    SuccessOrder,
    SignedOrderData,
    NewOrderDataRequestBody,
    UnixTimestampInSeconds,
    UnixTimestampInMiliseconds,
    ChainName,
    isChainName,
    MILISECONDS_IN_SECOND,
    decodeAccountId,
    encodeBase64,
    OrderSide,
    OrderType,
    MarketPrice,
    isValidAccountId,
    DelegationId,
    encodeAccountId,
    SolanaSigner,
    CHAIN_UTILS,
    Margin,
    buildDelegationOperation,
    Base64,
    Signer as SignerUtil,
    ChainId,
    defaultOrderExpiration,
    userAddressToAccountId,
    isEVMChain,
    CHAIN_ID_SOLANA,
    getAndValidateSolanaTokenAddress,
    SolanaRedeemProgress,
} from "@c3exchange/common"
import algosdk, { waitForConfirmation, type Algodv2 } from "algosdk";
import crypto from "crypto";
import * as ethers from "ethers";
import * as solana from "@solana/web3.js"
import assert from "assert";
import { ROUNDS_TO_WAIT } from "../internal/const";
import { asMargin } from "../internal/helpers/parser"
import { getWormholeDepositInfo } from "../main";
import { WebSocketClient } from "../ws/WebSocketClient"

interface GetTradesQuery {
    offset?: number
    pageSize?: number
    creator?: UserAddress
}

export interface AccountLimits {
    maxBuyOrderSize: InstrumentAmount
    maxSellOrderSize: InstrumentAmount
    buyAvailableCash: InstrumentAmount
    sellAvailableCash: InstrumentAmount
    buyPoolBalance: InstrumentAmount
    sellPoolBalance: InstrumentAmount
}

export interface AccountBalance {
    instrumentsInfo: {
        instrumentId: InstrumentId
        availableCash: InstrumentAmount
        lockedCash: InstrumentAmount
        maxBorrow: InstrumentAmount
        maxLend: InstrumentAmount
        maxWithdraw: InstrumentAmount
        maxWithdrawWithBorrow: InstrumentAmount
        cash: InstrumentAmount
        poolPosition: InstrumentAmount
        shortfall: InstrumentAmount
    }[],
    initialMargin: Margin,
    portfolioOverview: PortfolioOverviewResponse
}

export interface AccountSession extends Omit<AccountLoginCompleteResponse, "encryptionKey"> {
    chainId: ChainId
    encryptedEphimeralKey?: Base64
    ephemeralAddress?: UserAddress
    ephemeralExpiration?: UnixTimestampInSeconds
}

export interface AccountOperationQuery {
    types?: AccountOperationType[]
    statuses?: OperationStatus[]
    instrumentIds?: InstrumentId[],
    createdSince?: number,
    createdUntil?: number,
    idBefore?: number
    pageSize?: number
}

interface DepositParams {
    amount: string,
    instrumentId: InstrumentId,
    chainName?: ChainName,
    funder?: MessageSigner,
    repayAmount?: string,
}

interface WithdrawalParams {
    amount: string,
    instrumentId: InstrumentId,
    destinationAddress: UserAddress,
    destinationChainName: ChainName,
    maxFees: string,
    maxBorrow?: string,
}

interface OrderParams {
    marketId: MarketId
    type: OrderType
    side: OrderSide
    amount: string
    price?: string
    maxRepay?: string
    maxBorrow?: string
    expiresOn?: UnixTimestampInSeconds
    clientOrderId?: string
}

interface DelegationConfiguration {
    operateOn?: AccountId
    operateOnExpiration?: UnixTimestampInSeconds
}

interface EphemeralConfiguration {
    ephemeralKey?: Uint8Array
    ephemeralExpiration?: UnixTimestampInSeconds
}

type AccountConfiguration = {
    isWebMode: boolean
} & DelegationConfiguration & EphemeralConfiguration

const ephemeralSecretoToMessageSigner = (secret: Uint8Array): MessageSigner => {
    // TODO: Right now we only support ephemeral accounts created from Algosdk
    const mnemonic = algosdk.secretKeyToMnemonic(secret)
    return new SignerUtil().addFromMnemonic(mnemonic)
}

export default class Account<T extends MessageSigner = MessageSigner> {
    public readonly userAddress: UserAddress
    public readonly chainId: SupportedChainId
    public readonly accountId: AccountId
    private readonly httpClient: HttpClient;
    private readonly accountClient: AccountAPIClient
    private webSocketClient: WebSocketClient

    // Cache
    private lastStoredDate = Date.now()
    private accountInfo: AccountInfo | null = null
    private maxOrderExpiresOn: UnixTimestampInSeconds
    private ephemeralMessageSigner: MessageSigner | undefined

    constructor(
        private readonly serverConfig: UrlConfig,
        private readonly session: AccountSession,
        public readonly messageSigner: T,
        private readonly helpers: {
            depositAlgorand: DepositFundsAlgorand,
            depositWormhole: DepositFundsWormhole,
            getSlotId: (assetId: AssetId) => Promise<InstrumentSlotId>,
            findMarketInfoOrFail: (marketId: MarketId) => Promise<MarketInfo>,
            findInstrumentOrFail(instrumentId: InstrumentId): Promise<Instrument>,
            services: {
                algod: Algodv2,
                wormholeService: WormholeService
                solanaConnection: solana.Connection
            }
        },
        private readonly accountConfiguration: AccountConfiguration
    ) {
        this.userAddress = this.messageSigner.address
        this.chainId = toSupportedChainId(this.messageSigner.chainId)
        this.accountId = this.accountConfiguration.operateOn ?? session.accountId
        if (!isValidAccountId(this.accountId)) {
            throw new Error("Invalid provided accountId: " + this.accountId)
        }

        // If the user provides the accountId and the userAddress, this must match
        const chainUtils = CHAIN_UTILS[this.chainId]
        if (session.accountId !== encodeAccountId(chainUtils.getPublicKey(this.userAddress), this.chainId)) {
            throw new Error("Invalid account id received from the server")
        }
        const headers: Headers = {
            "Authorization": `Bearer ${this.session.token}`
        }
        this.httpClient = new HttpClient(this.serverConfig.server, serverConfig.port, headers, this.accountConfiguration.isWebMode)
        this.accountClient = new AccountAPIClient(this.httpClient)
        const wsUrl = this.serverConfig.server.endsWith('/') ? `${this.serverConfig.server}ws/v1` : `${ this.serverConfig.server}/ws/v1`
        this.webSocketClient = new WebSocketClient(wsUrl, this.accountId, this.session.token)

        if (this.accountConfiguration.ephemeralKey) {
            this.ephemeralMessageSigner = ephemeralSecretoToMessageSigner(this.accountConfiguration.ephemeralKey)
        }
        const expirationArrays = [defaultOrderExpiration()]
        if (this.accountConfiguration.ephemeralExpiration) {
            expirationArrays.push(this.accountConfiguration.ephemeralExpiration)
        }
        if (this.accountConfiguration.operateOnExpiration) {
            expirationArrays.push(this.accountConfiguration.operateOnExpiration)
        }
        this.maxOrderExpiresOn = Math.min(...expirationArrays)
    }

    private getOperationSigner = () => this.ephemeralMessageSigner ?? this.messageSigner

    getUserAddress = (): UserAddress => this.userAddress

    getSession = (): AccountSession => ({
        firstLogin: this.session.firstLogin,
        accountId: this.session.accountId,
        token: this.session.token,
        userId: this.session.userId,
        chainId: this.chainId,
        encryptedEphimeralKey: this.session.encryptedEphimeralKey,
        ephemeralAddress: this.session.ephemeralAddress,
        ephemeralExpiration: this.session.ephemeralExpiration,
    })
    getInfo = async () => {
        if (!this.accountInfo) {
            this.accountInfo = await this.accountClient.getOne(this.accountId)
        }
        return this.accountInfo
    }
    getLimits = async (marketId: MarketId): Promise<AccountLimits> => {
        const [marketInfo, accountLimits] = await Promise.all([
            this.helpers.findMarketInfoOrFail(marketId),
            this.accountClient.getLimits(this.accountId, marketId),
        ])

        return {
            maxBuyOrderSize: InstrumentAmount.fromDecimal(marketInfo.quoteInstrument, accountLimits.maxBuyOrderSize),
            maxSellOrderSize: InstrumentAmount.fromDecimal(marketInfo.baseInstrument, accountLimits.maxSellOrderSize),
            buyAvailableCash: InstrumentAmount.fromDecimal(marketInfo.quoteInstrument, accountLimits.buyAvailableCash),
            sellAvailableCash: InstrumentAmount.fromDecimal(marketInfo.baseInstrument, accountLimits.sellAvailableCash),
            buyPoolBalance: InstrumentAmount.fromDecimal(marketInfo.quoteInstrument, accountLimits.buyPoolBalance),
            sellPoolBalance: InstrumentAmount.fromDecimal(marketInfo.baseInstrument, accountLimits.sellPoolBalance)
        }
    }
    getTrades = async (marketId: MarketId = ALL_MARKETS_ID, filter?: GetTradesQuery): Promise<AccountTrade[]> => {
        const trades = await this.accountClient.getTrades(
            this.accountId,
            marketId,
            filter?.offset,
            filter?.pageSize,
            filter?.creator
        )
        const result: AccountTrade[] = []
        for (const trade of trades) {
            const marketInfo = await this.helpers.findMarketInfoOrFail(trade.marketId)
            const market: Market = marketInfo
            result.push({
                ...toMarketTrade(trade, market),
                accountSide: trade.accountSide,
            })
        }
        return result
    }
    getOrders = async (marketId: MarketId = ALL_MARKETS_ID, filter?: AccountOrdersForMarketFilters): Promise<AccountOrder[]> => {
        const orders = await this.accountClient.getOrders(this.accountId, marketId, filter)
        const result: AccountOrder[] = []
        for (const order of orders) {
            const marketInfo = await this.helpers.findMarketInfoOrFail(order.newOrderData.marketId)
            const market: Market = marketInfo
            result.push({
                ...toAccountOrder(order, market),
            })
        }
        return result
    }

    getOperations = async (query?: AccountOperationQuery): Promise<AccountOperation[]> => {
        const accountOperations = await this.accountClient.getOperations(
            this.accountId,
            query?.types,
            query?.statuses,
            query?.instrumentIds,
            query?.createdSince,
            query?.createdUntil,
            query?.idBefore,
            query?.pageSize,
        )
        return Promise.all(accountOperations.map((o) => toAccountOperation(o, this.helpers.findInstrumentOrFail)))
    }

    getBalance = async (): Promise<AccountBalance> => {
        const response = await this.accountClient.getBalance(this.accountId)
        return {
            initialMargin : asMargin(response.portfolioOverview.initialMarginCalculation),
            portfolioOverview: response.portfolioOverview,
            instrumentsInfo: await Promise.all(response.instrumentsInfo.map(async (instrumentInfo) => {
                const intrument = await this.helpers.findInstrumentOrFail(instrumentInfo.instrumentId)
                return {
                    instrumentId: instrumentInfo.instrumentId,
                    availableCash: InstrumentAmount.fromDecimal(intrument, instrumentInfo.availableCash),
                    lockedCash: InstrumentAmount.fromDecimal(intrument, instrumentInfo.lockedCash),
                    maxBorrow: InstrumentAmount.fromDecimal(intrument, instrumentInfo.maxBorrow),
                    maxLend: InstrumentAmount.fromDecimal(intrument, instrumentInfo.maxLend),
                    maxWithdraw: InstrumentAmount.fromDecimal(intrument, instrumentInfo.maxWithdraw),
                    maxWithdrawWithBorrow: InstrumentAmount.fromDecimal(intrument, instrumentInfo.maxWithdrawWithBorrow),
                    cash: InstrumentAmount.fromDecimal(intrument, instrumentInfo.cash),
                    poolPosition: InstrumentAmount.fromDecimal(intrument, instrumentInfo.poolPosition),
                    shortfall: InstrumentAmount.fromDecimal(intrument, instrumentInfo.shortfall),
                }
            }))
        }
    }

    deposit = async ({ amount, instrumentId, chainName, funder, repayAmount }: DepositParams): Promise<DepositResult> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)

        if (!funder) {
            funder = this.messageSigner
        }

        if (chainName && !isChainName(chainName)) {
            throw new Error("Invalid chain name")
        }

        let instrumentRepayAmount: InstrumentAmount | undefined = undefined

        if (repayAmount) {
            instrumentRepayAmount = InstrumentAmount.fromDecimal(instrument, repayAmount)
        }

        if (!instrumentAmount.isPositive() || (instrumentRepayAmount && !instrumentRepayAmount.isPositive())) {
            throw new Error("Amounts must be positive")
        }

        if (funder instanceof AlgorandSigner) {
            return this.helpers.depositAlgorand(this.accountId, instrumentAmount, instrumentRepayAmount ?? InstrumentAmount.zero(instrumentAmount.instrument), funder)
        } else if ((funder instanceof EVMSigner || funder instanceof SolanaSigner) && chainName) {
            return this.helpers.depositWormhole(this.accountId, instrumentAmount, instrumentRepayAmount ?? InstrumentAmount.zero(instrumentAmount.instrument), funder, chainName)
        }

        throw new Error("Invalid message signer type or no originChain provided")
    }

    withdraw = async ({ amount, instrumentId, destinationAddress, destinationChainName, maxFees, maxBorrow }: WithdrawalParams): Promise<WithdrawResult> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)
        const instrumentMaxFeeAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, maxFees)


        //check if maxBorrow is present
        let instrumentMaxBorrowAmount: InstrumentAmount = InstrumentAmount.zero(instrument)

        if (maxBorrow) {
            instrumentMaxBorrowAmount = InstrumentAmount.fromDecimal(instrument, maxBorrow)
        }

        if (!instrumentAmount.isPositive() || (instrumentMaxBorrowAmount && !instrumentMaxBorrowAmount.isPositive())) {
            throw new Error("Amounts must be positive")
        }

        const [{ lease, lastValid }, slotId] = await Promise.all([
            this.getOperationParams(),
            this.helpers.getSlotId(instrument.asaId),
        ])

        /**
         * IMPORTANT PLEASE READ:
         * WE MUST DERIVATE THE ACCOUNT TOKEN ADDRESS DESTINATION FOR SOLANA
         * IF WE DONT DO IT, WE ARE TAKING THE RISK OF LOSING THE FUNDS
         * DO NOT REMOVE THIS CODE
         */
        let destinationAddressFixed: UserAddress = destinationAddress, solanaOwnerAddress: UserAddress | undefined = undefined
        if (destinationChainName === "solana") {
            const instrumentChain = instrument.chains.find(c => c.chainId === CHAIN_ID_SOLANA)
            if (!instrumentChain)
                throw new Error("Invalid destination chain")
            const { tokenAccountAddress, ownerAddress } = await getAndValidateSolanaTokenAddress(
                destinationChainName,
                destinationAddress,
                instrumentChain,
                this.helpers.services.solanaConnection,
                this.helpers.services.wormholeService
            )
            destinationAddressFixed = tokenAccountAddress
            solanaOwnerAddress = ownerAddress
        }

        const encodedOperation = createWithdraw(slotId, instrumentAmount.toContract(), {
            chain: destinationChainName,
            tokenAddress: destinationAddressFixed,
        }, instrumentMaxBorrowAmount.toContract(), instrumentMaxFeeAmount.toContract())

        const dataToSign = getDataToSign(encodedOperation, decodeAccountId(this.accountId), lease, lastValid)

        const signature = await this.messageSigner.signMessage(dataToSign)

        const { id, extraInfo } = await this.accountClient.submitWithdraw(this.accountId, {
            instrumentId: instrument.id,
            amount: instrumentAmount,
            lease,
            lastValid,
            maxBorrow: instrumentMaxBorrowAmount,
            maxFees: instrumentMaxFeeAmount,
            signature, destination: { address: destinationAddressFixed, chain: destinationChainName },
            // The following address will be used in the BE to validate the ATA account
            solanaOwnerAddress,
        })

        if (destinationChainName === "algorand" || !extraInfo.sendTransferTxId) {
            return {
                txId: id,
                instrumentId:instrument.id,
                amount: instrumentAmount,
                isTransferCompleted: async () => {
                    try {
                        await this.waitForConfirmation(id)
                        return true
                    } catch (err) {
                        return false
                    }
                }
            }
        }

        // The client should not depend of the following process
        let vaaSequence: string
        let vaaSignature: Uint8Array
        let wasRedeemed = false

        const { isCCTP } = getWormholeDepositInfo(instrument, this.helpers.services.wormholeService.getDictionary(), destinationChainName)

        const getVAASequence = async () => {
            if (!vaaSequence) {
                await this.waitForConfirmation(id)
                vaaSequence = await this.helpers.services.wormholeService.getWormholeVaaSequenceFromAlgorandTx(extraInfo.sendTransferTxId)
            }
            return vaaSequence
        }

        const waitForWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
            if (!vaaSignature) {
                vaaSignature = await  this.helpers.services.wormholeService.fetchVaaFromSource("algorand", BigInt(vaaSequence), retryTimeout, maxRetryCount, rpcOptions)
            }
            return vaaSignature
        }

        const isTransferCompleted = (provider?: ethers.Signer | ethers.providers.Provider | solana.Connection) => {
            if (wasRedeemed) {
                return Promise.resolve(true)
            }
            if (!vaaSignature) {
                throw new Error("VAA signature is not available")
            }
            if (destinationChainName === "solana") {
                if (provider instanceof solana.Connection) {
                    return this.helpers.services.wormholeService.isSolanaTransferComplete(provider, vaaSignature)
                } else if (this.messageSigner instanceof SolanaSigner && this.messageSigner.connection) {
                    return this.helpers.services.wormholeService.isSolanaTransferComplete(this.messageSigner.connection, vaaSignature)
                }
            } else if (isEVMChain(destinationChainName)) {
                if (provider instanceof ethers.Signer || provider instanceof ethers.providers.Provider) {
                    return this.helpers.services.wormholeService.isEthereumTransferComplete(provider, vaaSignature, destinationChainName)
                } else if (this.messageSigner instanceof EVMSigner) {
                    return this.helpers.services.wormholeService.isEthereumTransferComplete(this.messageSigner.getSigner(), vaaSignature, destinationChainName)
                }
            }
            throw new Error("Unsupported chain")
        }

        // TODO: First argument must be generic for EVM and Solana
        const redeemWormholeVAA = async (ethersSigner?: ethers.Signer, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {

            if (isCCTP) {
                console.warn("Ignoring redeemAndSubmitWormholeVAA for CCTP")
                // TODO: Handle this in a better way
                return undefined as any
            }
            if (wasRedeemed) {
                throw new Error("VAA was already redeemed")
            }
            if (!vaaSignature) {
                await waitForWormholeVAA(retryTimeout, maxRetryCount, rpcOptions)
            }

            const instrumentChain = instrument.chains.find((c) => c.chainId === toChainId(destinationChainName))
            const xAsset: XContractAddress = { chain: destinationChainName, tokenAddress: instrumentChain!.tokenAddress }

            if (this.messageSigner instanceof EVMSigner) {
                const overrides = {
                    gasLimit: 1000000,
                }
                const concreteSigner = ethersSigner ?? this.messageSigner.getSigner() 
                const contractReceip = await this.helpers.  services.wormholeService.createWormholeTxForEthereumRedeem(xAsset, vaaSignature, concreteSigner, overrides)
                if (contractReceip.status && contractReceip.status !== 0) {
                    wasRedeemed = true
                    return contractReceip
                }                
            } else if (this.messageSigner instanceof SolanaSigner) {
                if (!this.messageSigner.connection) {
                    throw new Error("Solana signer requires a connection")
                }
                // Try to create the solana token account
                await this.helpers.services.wormholeService.createSolanaAtaAccount(
                    this.messageSigner.connection,
                    new solana.PublicKey(destinationAddressFixed),
                    new solana.PublicKey(this.messageSigner.address),
                    this.messageSigner.signTransaction,
                    new solana.PublicKey(instrumentChain!.tokenAddress)
                )

                const txProgress: SolanaRedeemProgress = {
                    verifySigTxs: [],
                    signers: [],
                    totalTxCount: 0,
                    successTxCount: 0,
                }
                const transaction = await this.helpers.services.wormholeService.createWormholeTxForSolanaRedeem(xAsset, vaaSignature, this.messageSigner.connection, this.messageSigner.publickey, this.messageSigner.signTransaction, txProgress)
                wasRedeemed = true
                return transaction
            }
            throw new Error("VAA redeem failed. Unsupported signer type")
        }

        const result: WormholeWithdrawResult = {
            instrumentId: instrument.id,
            amount: instrumentAmount,
            txId: id,
            isTransferCompleted,
            redeemWormholeVAA,
            waitForWormholeVAA,
            getVAASequence,
        }

        return result
    }


    lend = async (instrumentId: InstrumentId, amount: string): Promise<string> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)

        assert(instrumentAmount.isPositive(), "Amount must be positive")
        const { lease, lastValid, signature } = await this.encodeAndSignPoolMoveOperation(instrument.asaId, instrumentAmount.toContract())

        const result = await this.accountClient.submitLend(this.accountId, {
            instrumentId: instrument.id,
            amount: instrumentAmount,
            lease,
            lastValid,
            signature,
        })
        await this.waitForConfirmation(result.id)
        return result.id
    }

    redeem = async (instrumentId: InstrumentId, amount: string): Promise<string> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)

        assert(instrumentAmount.isPositive(), "Amount must be positive")
        const { lease, lastValid, signature } = await this.encodeAndSignPoolMoveOperation(instrument.asaId, -instrumentAmount.toContract())

        const result = await this.accountClient.submitRedeem(this.accountId, {
            instrumentId: instrument.id,
            amount: instrumentAmount,
            lease,
            lastValid,
            signature,
        })
        await this.waitForConfirmation(result.id)
        return result.id
    }

    borrow = async (instrumentId: InstrumentId, amount: string): Promise<string> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)

        assert(instrumentAmount.isPositive(), "Amount must be positive")
        const { lease, lastValid, signature } = await this.encodeAndSignPoolMoveOperation(instrument.asaId, -instrumentAmount.toContract())

        const result = await this.accountClient.submitBorrow(this.accountId, {
            instrumentId: instrument.id,
            amount:instrumentAmount,
            lease,
            lastValid,
            signature,
        })
        await this.waitForConfirmation(result.id)
        return result.id
    }

    repay = async (instrumentId: InstrumentId, amount: string): Promise<string> => {
        const instrument: Instrument = await this.helpers.findInstrumentOrFail(instrumentId)
        const instrumentAmount: InstrumentAmount = InstrumentAmount.fromDecimal(instrument, amount)

        assert(instrumentAmount.isPositive(), "Amount must be positive")
        const { lease, lastValid, signature } = await this.encodeAndSignPoolMoveOperation(instrument.asaId, instrumentAmount.toContract())

        const result = await this.accountClient.submitRepay(this.accountId, {
            instrumentId: instrument.id,
            amount: instrumentAmount, lease, lastValid, signature,
        })
        await this.waitForConfirmation(result.id)
        return result.id
    }

    liquidate = async (
        liquidatee: UserAddress,
        cash: InstrumentAmount[],
        pool: InstrumentAmount[],
    ) => {
        const [{ lease, lastValid }, mapCash, mapPool] = await Promise.all([
            this.getOperationParams(),
            Promise.all(cash.map(async (amount): Promise<[number, bigint]> => [await this.helpers.getSlotId(amount.instrument.asaId), amount.toContract()])),
            Promise.all(pool.map(async (amount): Promise<[number, bigint]> => [await this.helpers.getSlotId(amount.instrument.asaId), amount.toContract()]))
        ])

        const encodedOperation = createLiquidation(
            liquidatee,
            new Map(mapCash),
            new Map(mapPool),
        )

        const dataToSign = getDataToSign(encodedOperation, decodeAccountId(this.accountId), lease, lastValid)

        const signature = await this.getOperationSigner().signMessage(dataToSign)

        const result = await this.accountClient.submitLiquidation(this.accountId, {
            target: liquidatee,
            assetBasket: cash.map((amount) => ({ instrumentId: amount.instrument.id, amount })),
            liabilityBasket: pool.map((amount) => ({ instrumentId: amount.instrument.id, amount })),
            lease, lastValid, signature,
        })
        await this.waitForConfirmation(result.id)
        return result.id
    }

    /**
     *
     * @param order
     * @returns
     */

    createOrder = async ({ marketId, type, side, amount, price, maxRepay = "0", maxBorrow = "0", expiresOn, clientOrderId }: OrderParams): Promise<SuccessOrder> => {
        const marketInfo = await this.helpers.findMarketInfoOrFail(marketId)
        const newOrderData = await this.createOrderData(marketInfo, side, type, amount, price, maxBorrow, maxRepay, expiresOn, clientOrderId)
        const result =  await this.accountClient.submitNewOrder(this.accountId, newOrderData)
        return result.length > 0 ? result[0] : { id: "" }
    }

    createOrders = async (marketId: string, ordersParams: OrderParams[]): Promise<SuccessOrder[]> => {
        const marketInfo = await this.helpers.findMarketInfoOrFail(marketId)
        const newOrders= []
        for (const orderParams  of ordersParams) {
            const { marketId, type, side, amount, price, maxRepay = "0", maxBorrow = "0", expiresOn, clientOrderId } = orderParams
            if(marketId !== marketInfo.id)
                throw new Error("MarketId mismatch")
            const newOrderData = await this.createOrderData(marketInfo, side, type, amount, price, maxBorrow, maxRepay, expiresOn, clientOrderId)
            newOrders.push(newOrderData)
        }
        return await this.accountClient.submitNewOrders(this.accountId, marketId, newOrders)
    }

    private async createOrderData(marketInfo: MarketInfo, side: "buy" | "sell", type: "limit" | "market", amount: string, price?: string, maxBorrow?: string, maxRepay?: string, expiresOn: number = defaultOrderExpiration(), clientOrderId?: string) {
        const [maxBorrowInstrument, maxRepayInstrument] = side === "buy" ? [marketInfo.quoteInstrument, marketInfo.baseInstrument] : [marketInfo.baseInstrument, marketInfo.quoteInstrument]
        // @ts-expect-error Type is not assignable to market and limit. price is checked just in case
        const order: Order = {
            marketId: marketInfo.id,
            type,
            side,
            amount: type === "limit" ? InstrumentAmount.fromDecimal(marketInfo.baseInstrument, amount) : (
                // For market orders, buy side is the quote asset
                side === "buy" ? InstrumentAmount.fromDecimal(marketInfo.quoteInstrument, amount) : InstrumentAmount.fromDecimal(marketInfo.baseInstrument, amount)
            ),
            price: price && type === "limit" ? MarketPrice.fromDecimal(marketInfo, price) : undefined,
            maxBorrow: InstrumentAmount.fromDecimal(maxBorrowInstrument, maxBorrow ?? "0"),
            maxRepay: InstrumentAmount.fromDecimal(maxRepayInstrument, maxRepay ?? "0"),
            // We are using the minimum between the expiration of the order and the expiration of the session
            expiresOn: Math.min(expiresOn, this.maxOrderExpiresOn),
            clientOrderId
        }
        const now = Date.now()
        if (this.lastStoredDate === undefined || this.lastStoredDate < now) {
            this.lastStoredDate = now
        } else {
            this.lastStoredDate++
        }
        const orderNonce = this.lastStoredDate
        const _expiresOn = order.expiresOn!

        const validateOrder = (order: Order, now: UnixTimestampInMiliseconds) => {
            const hasPrice = "price" in order && order.price !== undefined
            if (!order.amount.isPositive() ||
                (order.maxBorrow && !order.maxBorrow.isPositive()) ||
                (order.maxRepay && !order.maxRepay.isPositive()) ||
                (hasPrice && !order.price?.isPositive())
            ) {
                throw new Error("Order amounts or price must be positive")
            }
            if (order.side !== "buy" && order.side !== "sell") {
                throw new Error("Order side must be either buy or sell")
            }
            if (order.expiresOn && order.expiresOn * MILISECONDS_IN_SECOND < now) {
                throw new Error("Order expires before creation")
            }
        }
        const encodeAndSignOrder = async (sellAmount: InstrumentAmount, buyAmount: InstrumentAmount, expiresOn: UnixTimestampInSeconds, maxBorrow?: InstrumentAmount, maxRepay?: InstrumentAmount) => {
            // Sign the order and generate the clientOrderId
            const buySlotId = await this.helpers.getSlotId(buyAmount.instrument.asaId)
            const sellSlotId = await this.helpers.getSlotId(sellAmount.instrument.asaId)
            return signOrder({
                account: encodeBase64(decodeAccountId(this.accountId)),
                buySlotId,
                buyAmount: buyAmount.toContract(),
                sellSlotId,
                sellAmount: sellAmount.toContract(),
                maxSellAmountFromPool: maxBorrow?.toContract() || BigInt(0),
                maxBuyAmountToPool: maxRepay?.toContract() || BigInt(0),
                nonce: orderNonce,
                expiresOn,
            }, this.getOperationSigner(), clientOrderId)
        }
        const getBuySellAmounts =  (order: Order):[sellAmount: InstrumentAmount, buyAmount: InstrumentAmount] => {
            if(order.type === "market") {
                const sellAmount = order.amount
                let buyAmount = InstrumentAmount.zero(marketInfo.baseInstrument)
                if (sellAmount.instrument.id === marketInfo.baseInstrument.id) {
                    buyAmount = InstrumentAmount.zero(marketInfo.quoteInstrument)
                }
                return [sellAmount, buyAmount]
            }
            const quoteAmount = order.price!.baseToQuote(order.amount)
            return  order.side === "buy" ? [quoteAmount, order.amount] : [order.amount, quoteAmount]

        }
        validateOrder(order, now)
        const [sellAmount, buyAmount] = getBuySellAmounts(order)
        const signedOrderData: SignedOrderData = await encodeAndSignOrder(sellAmount, buyAmount, _expiresOn, order.maxBorrow, order.maxRepay)
        const newOrderData: NewOrderDataRequestBody = {
            marketId: order.marketId,
            type: order.type,
            side: order.side,
            size: order.amount.toDecimal(),
            price: order.price?.toDecimal(),
            clientOrderId: order.clientOrderId,
            sentTime: now,
            settlementTicket: {
                ...signedOrderData.data,
                creator: this.messageSigner.address,
                signature: signedOrderData.signature
            }
        }
        return newOrderData
    }

    cancelOrder = async (order: OrderId | OrderId[]) => {
        const orders = Array.isArray(order) ? order : [order]
        const { signature } = await signCancelOrders({
            creator: this.messageSigner.address,
            accountId: this.accountId,
            orders,
        }, this.getOperationSigner().signMessage)

        return this.accountClient.cancelOrders(this.accountId, orders, signature, this.userAddress)
    }

    cancelAllOrders = async (creator?: UserAddress) => {
        const now = Date.now()
        const signedCancelRequest = await signCancelOrders({
            creator,
            accountId: this.accountId,
            allOrdersUntil: now,
        }, this.getOperationSigner().signMessage)

        return await this.accountClient.cancelAllOrders(signedCancelRequest.accountId, signedCancelRequest.signature, signedCancelRequest.allOrdersUntil!, signedCancelRequest.creator)
    }

    cancelAllOrdersByMarket = async (marketId : MarketId, creator?: UserAddress) => {
        const now = Date.now()
        const signedCancelRequest = await signCancelOrders({
            creator,
            accountId: this.accountId,
            allOrdersUntil: now,
        }, this.getOperationSigner().signMessage)

        return await this.accountClient.cancelAllOrdersByMarket(signedCancelRequest.accountId, marketId, signedCancelRequest.signature, signedCancelRequest.allOrdersUntil!, signedCancelRequest.creator)
    }

    logout = async () => this.httpClient.post("/v1/logout")

    private getOperationParams = async () => {
        const params = await this.helpers.services.algod.getTransactionParams().do()
        const lease = crypto.randomBytes(32)

        return {
            lease: new Uint8Array(lease),
            lastValid: params.lastRound,
        }
    }

    private encodeAndSignPoolMoveOperation = async (assetId: AssetId, amount: bigint): Promise<{
        signature: RawSignature,
        lease: Uint8Array,
        lastValid: number,
    }> => {
        const [{ lease, lastValid }, slotId] = await Promise.all([
            this.getOperationParams(),
            this.helpers.getSlotId(assetId),
        ])

        const encodedOperation = createPoolMove(slotId, amount)

        const dataToSign = getDataToSign(encodedOperation, decodeAccountId(this.accountId), lease, lastValid)

        const signature = await this.getOperationSigner().signMessage(dataToSign)

        return { signature, lease, lastValid }
    }

    public events() {
        return this.webSocketClient
    }

    private waitForConfirmation = async (txId: string) => {
        await waitForConfirmation(this.helpers.services.algod, txId, ROUNDS_TO_WAIT)
    }

    public getDelegations = async () => this.accountClient.getDelegations(this.accountId)

    public revokeDelegation = async (delegatee: DelegationId) => this.accountClient.submitRevokeDelegation(this.accountId, delegatee)

    public addNewDelegation = async (delegateTo: UserAddress, name: string, expiresOn: UnixTimestampInSeconds) => {
        const nonce = Date.now()
        const { dataToSign } = buildDelegationOperation(this.userAddress, delegateTo, expiresOn, nonce)
        const signature = await this.messageSigner.signMessage(dataToSign)

        return this.accountClient.submitNewDelegation(this.accountId, userAddressToAccountId(delegateTo), name, nonce, expiresOn, signature)
    }
}

export type {
    Order,
    Account,
    DepositParams,
    DepositResult,
    WormholeDepositResult,
    WithdrawalParams,
    WithdrawResult,
    WormholeWithdrawResult,
    OrderParams
}
