import { defaultConfig } from "./config"
import HttpClient from "./internal/utils/http"
import Markets, { Markets as MarketsEntity } from "./entities/markets"
import Account, { AccountSession } from "./entities/account"
import { MarketInfo } from "./internal/helpers/parser"
import {
  AccountId,
  AccountLoginCompleteResponse,
  AlgorandSigner,
  ChainName,
  DepositRequest,
  EVMSigner,
  Instrument,
  InstrumentAmount,
  InstrumentId,
  InstrumentPoolInfo,
  InstrumentPoolInfoResponse,
  InstrumentPriceResponse,
  InstrumentPrices,
  InstrumentSlotId,
  MarketId,
  MessageSigner,
  OperationSuccess,
  SystemInfoResponse,
  UsdPrice,
  UserAddress,
  WormholeService,
  WormholeServiceImpl,
  encodeBase64,
  getSlotId,
  getWormholeContractsByNetwork,
  InstrumentWithRiskParameters,
  InstrumentWithRiskParametersResponse,
  encodeAccountId,
  getPublicKeyByAddress,
} from "@c3exchange/common"
import { DepositFundsAlgorand, DepositFundsWormhole, DepositOverrides, DepositResult, SubmitWormholeVAA, WormholeDepositResult } from "./internal/types"
import { AlgorandDeposit, WormholeDeposit } from "./internal/account_endpoints"
import { prepareAlgorandDeposit, prepareWormholeDeposit } from "./internal/helpers/deposit"
import algosdk, { waitForConfirmation } from "algosdk"
import BigNumber from "bignumber.js"
import { ROUNDS_TO_WAIT_ON_DEPOSIT } from "./internal/const"
import { logger } from "ethers"
import { asInstrumentWithRiskParameters } from "./internal/helpers/parser"

export { asWormholeDepositResult, getWormholeDepositInfo } from "./internal/helpers/deposit"
export { asWormholeWithdrawResult } from "./internal/helpers/operation"

export class C3SDK {
  private instrumentCache: InstrumentWithRiskParameters[] | undefined = undefined
  private marketInfoCache: MarketInfo[] | undefined = undefined
  private systemInfo: SystemInfoResponse | undefined = undefined

  private client: HttpClient
  private markets: MarketsEntity
  public algodClient: algosdk.Algodv2
  private wormholeService: WormholeService

  constructor(private config = defaultConfig) {
    // To avoid other classes to steal our cache, we need to bind this methods to our instance
    this.getInstruments = this.getInstruments.bind(this)
    this.findInstrumentOrFail = this.findInstrumentOrFail.bind(this)
    this.findMarketInfoOrFail = this.findMarketInfoOrFail.bind(this)
    this.login = this.login.bind(this)
    this.getSlotId = this.getSlotId.bind(this)

    let { server, port } = this.config.c3_api
    if (server.endsWith("/v1")) {
        server = server.substring(0, server.length - "/v1".length)
    }
    this.client = new HttpClient(server, port)
    this.markets = new Markets(this.client, { findMarketInfoOrFail: this.findMarketInfoOrFail })
    this.algodClient = new algosdk.Algodv2(
      this.config.algorand_node.token || "",
      this.config.algorand_node.server,
      this.config.algorand_node.port || ""
    )
    this.wormholeService = new WormholeServiceImpl(getWormholeContractsByNetwork(this.config.c3_api.wormhole_network), this.algodClient)
  }

  getHealth = async (): Promise<void> => {
    await this.client.get("/health")
  }

  getInstruments = async (): Promise<InstrumentWithRiskParameters[]> => {
    if (!this.instrumentCache) {
      const responses = await this.client.get<InstrumentWithRiskParametersResponse[]>("/v1/instruments")
      this.instrumentCache = responses.map((instrument) => asInstrumentWithRiskParameters(instrument))
    }
    return this.instrumentCache.slice()
  }

  getInstrumentsPool = async (): Promise<InstrumentPoolInfo[]> => {
    const instrumentsPoolsData = await this.client.get<InstrumentPoolInfoResponse[]>("/v1/instruments/pools")
    const results: InstrumentPoolInfo[] = []
    for (const instrumentPoolData of instrumentsPoolsData) {
      const instrument = await this.findInstrumentOrFail(instrumentPoolData.id)
      results.push({
        id: instrumentPoolData.id,
        lendApr: instrumentPoolData.lendApr,
        borrowApr: instrumentPoolData.borrowApr,
        totalLiquidity: InstrumentAmount.fromDecimal(instrument, instrumentPoolData.totalLiquidity),
        totalBorrowed: InstrumentAmount.fromDecimal(instrument, instrumentPoolData.totalBorrowed),
        liquidityThreshold: InstrumentAmount.fromDecimal(instrument, instrumentPoolData.liquidityThreshold),
      })
    }

    return results
  }

  getInstrumentPrices = async (): Promise<InstrumentPrices[]> => {
    const instrumentsPricesData = await this.client.get<InstrumentPriceResponse[]>("/v1/instruments/prices")
    const results: InstrumentPrices[] = []
    for (const instrumentPriceData of instrumentsPricesData) {
      results.push({
        id: instrumentPriceData.id,
        price: new UsdPrice(new BigNumber(instrumentPriceData.price)),
      })
    }

    return results
  }

  getMarkets = (): MarketsEntity => this.markets

  async login <T extends MessageSigner = MessageSigner> (messageSigner: T, accountSession?: AccountSession, webMode = false, operateOn?: UserAddress): Promise<Account<T>> {
    if (!accountSession) {
      const { address, chainId } = messageSigner
      const nonceRes: { nonce: string } = await this.client.get("/v1/login/start", { address, chainId });
      const signature = await this.signNonce(nonceRes.nonce, messageSigner)

      let clientHeaders
      if (webMode === true) {
        clientHeaders = { "web-mode": "true" }
      }
      accountSession = await this.client.post<AccountLoginCompleteResponse>(
        "/v1/login/complete",
        { address, chainId, signature },
        clientHeaders,
        webMode,
      );
    }

    return new Account<T>(
      this.config.c3_api,
      accountSession,
      messageSigner,
      webMode,
      {
        depositAlgorand: this.depositAlgorand,
        depositWormhole: this.depositWormhole,
        getSlotId: this.getSlotId,
        findMarketInfoOrFail: this.findMarketInfoOrFail,
        findInstrumentOrFail: this.findInstrumentOrFail,
        services: { wormholeService: this.wormholeService, algod: this.algodClient },
      },
      (operateOn ? encodeAccountId(getPublicKeyByAddress(operateOn)) : undefined),
    );
  }

  public submitWormholeVAA: SubmitWormholeVAA = async (
    receiverAccountId: AccountId,
    amount: InstrumentAmount,
    wormholeVAA: WormholeDeposit["wormholeVAA"],
    repayAmount: InstrumentAmount,
    overrides?: DepositOverrides
  ) => {
    return this.submitDeposit(receiverAccountId, {
      instrumentId: amount.instrument.id, amount, wormholeVAA, repayAmount, note: overrides?.note,
      overrideOriginAddress: overrides?.originAddress, overrideOriginChain: overrides?.originChain,
    })
  }

  private depositAlgorand: DepositFundsAlgorand = async (
    receiverAccountId: AccountId,
    receiverUserAddress: UserAddress,
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    funder: AlgorandSigner,
  ): Promise<DepositResult> => {
    const [systemInfo, slotId] = await Promise.all([
      this.getSystemInfo(),
      this.getSlotId(amount.instrument.asaId),
    ])
    const algorandSignedFundingTransaction = await prepareAlgorandDeposit(
        this.algodClient,
        systemInfo.contractIds,
        systemInfo.serverAddress,
        receiverUserAddress,
        amount.instrument.asaId,
        amount,
        slotId,
        repayAmount,
        funder,
    )
    const { id } = await this.submitDeposit(receiverAccountId, { instrumentId: amount.instrument.id, amount, algorandSignedFundingTransaction, repayAmount })

    return {
        txId: id, amount, instrumentId: amount.instrument.id,
        isTransferCompleted: async (roundsToWait=ROUNDS_TO_WAIT_ON_DEPOSIT) => {
          try {
            await waitForConfirmation(this.algodClient, id, roundsToWait)
            return true
          } catch (err) {
            logger.warn("Could not wait for transaction to be completed: ", err)
            return false
         }
        },
    }
  }

  private depositWormhole: DepositFundsWormhole = async (
    receiverAccountId: AccountId,
    receiverUserAddress: UserAddress,
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    funder: EVMSigner,
    originChain: ChainName
  ): Promise<WormholeDepositResult> => {
    return prepareWormholeDeposit(
      receiverUserAddress,
      receiverAccountId,
      amount,
      repayAmount,
      funder,
      originChain,
      this.wormholeService,
      await this.getSystemInfo(),
      this.submitWormholeVAA
    )
  }

  public getSystemInfo = async () => {
    if (!this.systemInfo) {
        this.systemInfo = await this.client.get<SystemInfoResponse>(`/v1/system-info`)
    }
    return this.systemInfo
  }

  public getWormholeDictionary = () => this.wormholeService.getDictionary()

  /*
    FIXME: This functionality is temporarily exposed so that the FE can query the status of a pending txn before the server receives it.
    In the future it will no longer be exposed so avoid its use.
  */
  public getWormholeService = () => this.wormholeService

  private submitDeposit = (accountId: AccountId, payload: AlgorandDeposit | WormholeDeposit) => {
      let algorandSignedFundingTransaction, wormholeVAA, overrideOriginAddress, overrideOriginChain
      if ("algorandSignedFundingTransaction" in payload) {
          algorandSignedFundingTransaction = payload.algorandSignedFundingTransaction
      }
      if ("wormholeVAA" in payload) {
          wormholeVAA = payload.wormholeVAA
          overrideOriginAddress = payload.overrideOriginAddress
          overrideOriginChain = payload.overrideOriginChain
      }
      return this.client.post<OperationSuccess, Partial<DepositRequest>>(`/v1/accounts/${accountId}/deposit`, {
          amount: payload.amount.toDecimal(),
          instrumentId: payload.instrumentId,
          algorandSignedFundingTransaction,
          wormholeVAA,
          repayAmount: payload.repayAmount.toDecimal(),
          note: payload.note,
          overrideOriginAddress,
          overrideOriginChain,
      })
  }

  private signNonce = async (nonce: string, messageSigner: MessageSigner): Promise<string> => {
    try {
      const nonceAsBytes = new Uint8Array(Buffer.from(nonce, "ascii"))
      const sig = await messageSigner.signMessage(nonceAsBytes);
      const signature = encodeBase64(sig)
      return signature
    } catch (error) {
      throw new Error("Error while signing the nonce login. " + error)
    }
  }

  private findMarketInfoOrFail = async (marketId: MarketId): Promise<MarketInfo> => {
    if (!this.marketInfoCache) {
      this.marketInfoCache = await this.markets.getAll()
    }
    const marketInfo = this.marketInfoCache.find((marketInfo) => marketInfo.id === marketId)
    if (!marketInfo) {
      throw new Error("Invalid marketId")
    }
    return marketInfo
  }

  private findInstrumentOrFail = async (instrumentId: InstrumentId): Promise<Instrument> => {
    if (!this.instrumentCache) {
      this.instrumentCache = await this.getInstruments()
    }
    const instrument = this.instrumentCache.find((instrument) => instrument.id === instrumentId)
    if (!instrument) {
      throw new Error("Invalid instrumentId")
    }
    return instrument
  }

  private getSlotId = async (asaId: number): Promise<InstrumentSlotId> => {
    const instruments = await this.getInstruments()
    return getSlotId(instruments.map((i => i.asaId)), asaId)
  }
}
