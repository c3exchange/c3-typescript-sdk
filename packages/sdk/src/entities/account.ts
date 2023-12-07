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
    groupByKey,
    AccountOrderResponse,
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
    AccountOrdersResponse,
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
    createGTDExpiration,
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
    getPublicKeyByAddress,
    createDelegation
} from "@c3exchange/common"
import { waitForConfirmation, type Algodv2 } from "algosdk";
import crypto from "crypto";
import type { Signer, providers } from "ethers";
import assert from "assert";
import { ROUNDS_TO_WAIT } from "../internal/const";
import { asMargin } from "../internal/helpers/parser"
import { Margin } from "@c3exchange/common"
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

export interface AccountSession extends AccountLoginCompleteResponse { }

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

export default class Account<T extends MessageSigner = MessageSigner> {
    public userAddress: UserAddress
    public chainId: SupportedChainId
    private accountId: AccountId
    private httpClient: HttpClient;
    private accountClient: AccountAPIClient
    private webSocketClient: WebSocketClient

    // Cache
    private lastStoredDate = Date.now()
    private accountInfo: AccountInfo | null = null

    constructor(
        private serverConfig: UrlConfig,
        private session: AccountSession,
        private messageSigner: T,
        private isWebMode: boolean,
        private helpers: {
            depositAlgorand: DepositFundsAlgorand,
            depositWormhole: DepositFundsWormhole,
            getSlotId: (assetId: AssetId) => Promise<InstrumentSlotId>,
            findMarketInfoOrFail: (marketId: MarketId) => Promise<MarketInfo>,
            findInstrumentOrFail(instrumentId: InstrumentId): Promise<Instrument>,
            services: {
                algod: Algodv2,
                wormholeService: WormholeService
            }
        },
        operateOn?: AccountId
    ) {
        this.userAddress = this.messageSigner.address
        this.chainId = toSupportedChainId(this.messageSigner.chainId)
        this.accountId = operateOn ?? session.accountId
        if (!isValidAccountId(this.accountId)) {
            throw new Error("Invalid provided accountId: " + this.accountId)
        }
        const headers: Headers = {
            "Authorization": `Bearer ${this.session.token}`
        }
        this.httpClient = new HttpClient(this.serverConfig.server, serverConfig.port, headers, this.isWebMode)
        this.accountClient = new AccountAPIClient(this.httpClient)
        this.webSocketClient = new WebSocketClient(this.serverConfig, this.accountId, this.session.token)
    }

    getUserAddress = (): UserAddress => this.userAddress
    getSession = (): AccountSession => ({ ...this.session })
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
            return this.helpers.depositAlgorand(this.accountId, this.userAddress, instrumentAmount, instrumentRepayAmount ?? InstrumentAmount.zero(instrumentAmount.instrument), funder)
        } else if (funder instanceof EVMSigner && chainName) {
            return this.helpers.depositWormhole(this.accountId, this.userAddress, instrumentAmount, instrumentRepayAmount ?? InstrumentAmount.zero(instrumentAmount.instrument), funder, chainName)
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

        // Fix types

        const encodedOperation = createWithdraw(slotId, instrumentAmount.toContract(), {
            chain: destinationChainName,
            tokenAddress: destinationAddress,
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
            signature, destination: { address: destinationAddress, chain: destinationChainName }
        })

        if (destinationChainName === "algorand" || !extraInfo.sendTransferTxId) {
            return {
                txId: id,
                instrumentId:instrument.id,
                amount: instrumentAmount,
                isTransferCompleted: async () => {
                    try {
                        await waitForConfirmation(this.helpers.services.algod, id, ROUNDS_TO_WAIT)
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

        const isCCTP: boolean = getWormholeDepositInfo(instrument, this.helpers.services.wormholeService.getDictionary(), destinationChainName).isCCTP

        const getVAASequence = async () => {
            if (!vaaSequence) {
                await waitForConfirmation(this.helpers.services.algod, id, ROUNDS_TO_WAIT)
                vaaSequence = await this.helpers.services.wormholeService.getWormholeVaaSequenceFromAlgorandTx(extraInfo.sendTransferTxId)
            }
            return vaaSequence
        }

        const waitForWormholeVAA = async (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
            if (!vaaSignature) {
                vaaSignature = await this.helpers.services.wormholeService.fetchVaaEthereumSource(
                    "algorand",
                    BigInt(vaaSequence),
                    retryTimeout,
                    maxRetryCount,
                    rpcOptions,
                )
            }
            return vaaSignature
        }

        const isTransferCompleted = (provider?: Signer | providers.Provider) => {
            if (wasRedeemed) {
                return Promise.resolve(true)
            }
            if (!vaaSignature) {
                throw new Error("VAA signature is not available")
            }

            if (!(this.messageSigner instanceof EVMSigner) || !provider) {
                throw new Error("Only EVMSigner is supported for redeeming VAA")
            }

            const ethersProvider = provider ?? this.messageSigner.getSigner()

            return this.helpers.services.wormholeService.isEthereumTransferComplete(ethersProvider, vaaSignature, destinationChainName)
        }

        const redeemWormholeVAA = async (signer?: Signer, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => {
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
            const evmSigner = signer ? signer : this.messageSigner instanceof EVMSigner ? this.messageSigner.getSigner() : undefined
            if (!evmSigner) {
                throw new Error("Only EVMSigner is supported for redeeming VAA")
            }
            const overrides = {
                gasLimit: 1000000,
            }
            const instrumentChain = instrument.chains.find((c) => c.chainId === toChainId(destinationChainName))
            const xAsset: XContractAddress = { chain: destinationChainName, tokenAddress: instrumentChain!.tokenAddress }
            const contractReceip = await this.helpers.services.wormholeService.createWormholeTxForEthereumRedeem(xAsset, vaaSignature, evmSigner, overrides)
            if (contractReceip.status && contractReceip.status !== 0) {
                wasRedeemed = true
                return contractReceip
            }

            throw new Error("VAA redeem failed")
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
        await waitForConfirmation(this.helpers.services.algod, result.id, ROUNDS_TO_WAIT)
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
        await waitForConfirmation(this.helpers.services.algod, result.id, ROUNDS_TO_WAIT)
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
        await waitForConfirmation(this.helpers.services.algod, result.id, ROUNDS_TO_WAIT)
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
        await waitForConfirmation(this.helpers.services.algod, result.id, ROUNDS_TO_WAIT)
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

        const signature = await this.messageSigner.signMessage(dataToSign)

        const result = await this.accountClient.submitLiquidation(this.accountId, {
            target: liquidatee,
            assetBasket: cash.map((amount) => ({ instrumentId: amount.instrument.id, amount })),
            liabilityBasket: pool.map((amount) => ({ instrumentId: amount.instrument.id, amount })),
            lease, lastValid, signature,
        })
        await waitForConfirmation(this.helpers.services.algod, result.id, ROUNDS_TO_WAIT)
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

    private async createOrderData(marketInfo: MarketInfo, side: "buy" | "sell", type: "limit" | "market", amount: string, price: string | undefined, maxBorrow: string | undefined, maxRepay: string | undefined, expiresOn: number | undefined, clientOrderId: string | undefined) {
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
            expiresOn: expiresOn ?? createGTDExpiration(),
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
            }, this.messageSigner)
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
                creator: signedOrderData.creator,
                signature: signedOrderData.signature
            }
        }
        return newOrderData
    }

    cancelOrder = async (order: OrderId | OrderId[]) => {
        const orders = Array.isArray(order) ? order : [order]
        const { signature } = await signCancelOrders({
            creator: this.userAddress,
            user: this.accountId,
            orders,
        }, this.messageSigner.signMessage)

        return this.accountClient.cancelOrders(this.accountId, orders, signature, this.userAddress)
    }

    cancelAllOrders = async () => {
        const now = Date.now()
        const signedCancelRequest = await signCancelOrders({
            creator: this.userAddress,
            user: this.accountId,
            allOrdersUntil: now,
        }, this.messageSigner.signMessage)

        return await this.accountClient.cancelAllOrders(signedCancelRequest.user, signedCancelRequest.signature, signedCancelRequest.allOrdersUntil!, signedCancelRequest.creator)
    }

    cancelAllOrdersByMarket = async (marketId : MarketId) => {
        const now = Date.now()
        const signedCancelRequest = await signCancelOrders({
            creator: this.userAddress,
            user: this.accountId,
            allOrdersUntil: now,
        }, this.messageSigner.signMessage)

        return await this.accountClient.cancelAllOrdersByMarket(signedCancelRequest.user, marketId, signedCancelRequest.signature, signedCancelRequest.allOrdersUntil!, signedCancelRequest.creator)
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

        const signature = await this.messageSigner.signMessage(dataToSign)

        return { signature, lease, lastValid }
    }

    public events() {
        return this.webSocketClient
    }

    public getDelegations = async () => this.accountClient.getDelegations(this.accountId)

    public revokeDelegation = async (delegatee: DelegationId) => this.accountClient.submitRevokeDelegation(this.accountId, delegatee)

    public addNewDelegation = async (delegateTo: UserAddress, name: string, expiresOn: UnixTimestampInSeconds) => {
        const nonce = Date.now()
        const encodedOperation = createDelegation(delegateTo, nonce, expiresOn)
        const dataToSign = getDataToSign(encodedOperation, decodeAccountId(this.accountId), new Uint8Array(32), 0)
        const signature = await this.messageSigner.signMessage(dataToSign)

        return this.accountClient.submitNewDelegation(this.accountId, encodeAccountId(getPublicKeyByAddress(delegateTo)), name, nonce, expiresOn, signature)
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
