import type {
    AccountId,
    AlgorandSigner,
    ChainId,
    ChainName,
    EVMSigner,
    InstrumentAmount,
    InstrumentId,
    MarketId,
    MarketPrice,
    OperationSuccess,
    OrderSide,
    OrderType,
    SolanaSigner,
    UnixTimestampInSeconds,
    UserAddress,
} from "@c3exchange/common";
import type { WormholeDeposit } from "./account_endpoints";
import type { ContractReceipt, Signer, providers } from "ethers";
import type { Connection } from "@solana/web3.js";

// DEPOSIT TYPES

type WormholeSigner = EVMSigner | SolanaSigner
interface DepositResult {
    instrumentId: InstrumentId
    txId: string
    amount: InstrumentAmount
    isTransferCompleted: () => Promise<boolean>
}

interface WormholeDepositResult extends DepositResult {
    getVAASequence: () => Promise<string>
    waitForWormholeVAA: (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => Promise<Uint8Array>
    isVaaEnqueued: (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown> )=> Promise<boolean>
    redeemAndSubmitWormholeVAA: (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => Promise<string>
}

type DepositFundsAlgorand = (receiverAccountId: AccountId, amount: InstrumentAmount, repayAmount: InstrumentAmount, funder: AlgorandSigner) => Promise<DepositResult>
type DepositFundsWormhole = (receiverAccountId: AccountId, amount: InstrumentAmount, repayAmount: InstrumentAmount, funder: WormholeSigner, originChain: ChainName) => Promise<WormholeDepositResult>

interface DepositOverrides {
    note?: string
    originChain?: ChainId
    originAddress?: UserAddress
}
type SubmitWormholeVAA = (receiverAccountId: AccountId, amount: InstrumentAmount, wormholeVAA: WormholeDeposit["wormholeVAA"], repayAmount: InstrumentAmount, overrides?: DepositOverrides) => Promise<OperationSuccess>


// WITHDRAW TYPES

type WithdrawResult = DepositResult
interface WormholeWithdrawResult extends WithdrawResult {
    isTransferCompleted: (provider?: Signer | providers.Provider | Connection) => Promise<boolean>
    getVAASequence: () => Promise<string>
    waitForWormholeVAA: (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => Promise<Uint8Array>
    redeemWormholeVAA: (signer?: Signer, retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown>) => Promise<ContractReceipt>
    // isVaaEnqueued: (retryTimeout?: number, maxRetryCount?: number, rpcOptions?: Record<string, unknown> )=> Promise<boolean>
}

// ORDER TYPES

interface BaseOrder {
    side: OrderSide
    type: OrderType
    marketId: MarketId
    amount: InstrumentAmount
    price?: MarketPrice
    maxRepay?: InstrumentAmount
    maxBorrow?: InstrumentAmount
    expiresOn?: UnixTimestampInSeconds
    clientOrderId?: string
}

interface LimitOrder extends BaseOrder {
    type: "limit"
    price: MarketPrice
}

interface MarketOrder extends BaseOrder {
    type: "market"
}

type Order = LimitOrder | MarketOrder

export type {
    WormholeSigner,
    DepositResult,
    WormholeDepositResult,
    DepositFundsAlgorand,
    DepositFundsWormhole,
    SubmitWormholeVAA,
    DepositOverrides,
    WithdrawResult,
    WormholeWithdrawResult,
    Order,
    LimitOrder,
    MarketOrder
}
