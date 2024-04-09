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
  buildDelegationOperation,
  EphemeralSession,
  Signature,
  decodeBase64,
  userAddressToAccountId,
  AccountLoginStatusResponse,
  UnixTimestampInSeconds,
  RawSignature,
  maxOrderExpiration,
  accountIdToUserAddress,
} from "@c3exchange/common"
import { DepositFundsAlgorand, DepositFundsWormhole, DepositOverrides, DepositResult, SubmitWormholeVAA, WormholeDepositResult, WormholeSigner } from "./internal/types"
import { AlgorandDeposit, WormholeDeposit } from "./internal/account_endpoints"
import { prepareAlgorandDeposit, prepareWormholeDeposit } from "./internal/helpers/deposit"
import algosdk, { waitForConfirmation } from "algosdk"
import BigNumber from "bignumber.js"
import { ROUNDS_TO_WAIT_ON_DEPOSIT } from "./internal/const"
import { logger } from "ethers"
import { Connection } from "@solana/web3.js"
import { asInstrumentWithRiskParameters } from "./internal/helpers/parser"
import { cryptoUtilsBuilder } from "./internal/utils/crypto"

export { asWormholeDepositResult, getWormholeDepositInfo, isCCTPInstrument } from "./internal/helpers/deposit"
export { asWormholeWithdrawResult } from "./internal/helpers/operation"

export class C3SDK {
  private instrumentCache: InstrumentWithRiskParameters[] | undefined = undefined
  private marketInfoCache: MarketInfo[] | undefined = undefined
  private systemInfo: SystemInfoResponse | undefined = undefined

  private client: HttpClient
  private markets: MarketsEntity
  public algodClient: algosdk.Algodv2
  private wormholeService: WormholeService

  private cryptoUtils = cryptoUtilsBuilder()

  constructor(private config = defaultConfig) {
    // To avoid other classes to steal our cache, we need to bind this methods to our instance
    this.getInstruments = this.getInstruments.bind(this)
    this.findInstrumentOrFail = this.findInstrumentOrFail.bind(this)
    this.findMarketInfoOrFail = this.findMarketInfoOrFail.bind(this)
    this.login = this.login.bind(this)
    this._loginWithEphemeral = this._loginWithEphemeral.bind(this)
    this.generateAccountEntity = this.generateAccountEntity.bind(this)
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

  async login <T extends MessageSigner = MessageSigner> (
    messageSigner: T,
    accountSession?: AccountSession,
    isWebMode = false,
    operateOn?: UserAddress,
    operateOnExpiration?: UnixTimestampInSeconds,
  ): Promise<Account<T>> {
    let encryptionKey: Uint8Array | undefined
    if (!accountSession) {
      const signature = await this._startLoginOperation(messageSigner)
      const { accountId, token, userId, firstLogin } = await this._completeLoginOperation(messageSigner, signature, isWebMode)
      accountSession = { accountId, token, userId, firstLogin, chainId: messageSigner.chainId }
    } else if (accountSession.encryptedEphimeralKey) {
      const status = await this.client.get<AccountLoginStatusResponse>("/v1/login/status", {}, {"Authorization": `Bearer ${accountSession.token}`}, true)
      if (status.ephimeralEncryptionKey) {
        encryptionKey = decodeBase64(status.ephimeralEncryptionKey)
      }
    }

    let ephemeralKey, ephemeralExpiration
    if (encryptionKey && accountSession.encryptedEphimeralKey) {
      ephemeralExpiration = accountSession.ephemeralExpiration
      ephemeralKey = await this.cryptoUtils.decrypt(encryptionKey, accountSession.encryptedEphimeralKey)
    }

    return this.generateAccountEntity(
      messageSigner,
      accountSession,
      isWebMode,
      operateOn,
      operateOnExpiration,
      ephemeralKey,
      ephemeralExpiration,
    )
  }

  /**
   * Only for internal use. This method is used to login with an ephemeral account
   * @returns Returns a completeLogin method that must be called to obtain the Account instance
   */
  async _loginWithEphemeral<T extends MessageSigner = MessageSigner> (messageSigner: T, webMode = false, operateOn?: UserAddress, operateOnExpiration?: UnixTimestampInSeconds) {
    const loginStartSignature: Signature = await this._startLoginOperation(messageSigner)
    return async (): Promise<Account<T>> => {
      const ephemeralAccount = algosdk.generateAccount()
      const ephemeralAddress = ephemeralAccount.addr
      const SESSION_DURATION = 14 * 24 * 60 * 60 // 14 days
      const ephemeralExpiresOn = maxOrderExpiration() + SESSION_DURATION
      const { dataToSign } = buildDelegationOperation(messageSigner.address, ephemeralAddress, ephemeralExpiresOn, 0)
      const ephemeralSignature: RawSignature = await messageSigner.signMessage(dataToSign)
      const ephemeralSession: EphemeralSession = {
        address: ephemeralAddress,
        expiresOn: ephemeralExpiresOn,
        signature: encodeBase64(ephemeralSignature),
      }
      const { userId, accountId, token, firstLogin, encryptionKey } = await this._completeLoginOperation(messageSigner, loginStartSignature, webMode, ephemeralSession)
      const accountSession: AccountSession = { userId, accountId, token, firstLogin, chainId: messageSigner.chainId }

      if (ephemeralSession && encryptionKey) {
        accountSession.encryptedEphimeralKey = await this.cryptoUtils.encrypt(decodeBase64(encryptionKey), ephemeralAccount.sk)
        accountSession.ephemeralAddress = ephemeralAddress
        accountSession.ephemeralExpiration = ephemeralExpiresOn
      }

      return this.generateAccountEntity(
        messageSigner,
        accountSession,
        webMode,
        operateOn,
        operateOnExpiration,
        ephemeralAccount.sk,
        ephemeralExpiresOn,
      )
    }
  }

  private async generateAccountEntity <T extends MessageSigner = MessageSigner> (
    messageSigner: T,
    accountSession: AccountSession,
    isWebMode: boolean,
    operateOn?: UserAddress,
    operateOnExpiration?: UnixTimestampInSeconds,
    ephemeralKey?: Uint8Array,
    ephemeralExpiration?: UnixTimestampInSeconds,
  ) {
    return new Account<T>(
      this.config.c3_api,
      accountSession,
      messageSigner,
      {
        depositAlgorand: this.depositAlgorand,
        depositWormhole: this.depositWormhole,
        getSlotId: this.getSlotId,
        findMarketInfoOrFail: this.findMarketInfoOrFail,
        findInstrumentOrFail: this.findInstrumentOrFail,
        services: {
          wormholeService: this.wormholeService,
          algod: this.algodClient,
          solanaConnection: new Connection(this.config.solana_cluster, "finalized")
        },
      },
      {
        operateOn: (operateOn ? userAddressToAccountId(operateOn) : undefined), isWebMode,
        operateOnExpiration, ephemeralKey, ephemeralExpiration,
      },
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
        accountIdToUserAddress(receiverAccountId),
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
    amount: InstrumentAmount,
    repayAmount: InstrumentAmount,
    funder: WormholeSigner,
    originChain: ChainName
  ): Promise<WormholeDepositResult> => {
    return prepareWormholeDeposit(
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

  private _startLoginOperation = async (messageSigner: MessageSigner): Promise<Signature> => {
    const { address, chainId } = messageSigner
    const nonceRes: { nonce: string } = await this.client.get("/v1/login/start", { address, chainId });
    const signature = await this._signLoginNonce(nonceRes.nonce, messageSigner)
    return signature
  }

  private _completeLoginOperation = async (messageSigner: MessageSigner, signature: Signature, webMode: boolean, ephemeralData?: EphemeralSession) => {
    const { address, chainId } = messageSigner
    let clientHeaders
    if (webMode === true) {
      clientHeaders = { "web-mode": "true" }
    }
    const accountSession = await this.client.post<AccountLoginCompleteResponse>(
      "/v1/login/complete",
      { address, chainId, signature, ephemeralData },
      clientHeaders,
      webMode,
    );

    return accountSession
  }

  private _signLoginNonce = async (nonce: string, messageSigner: MessageSigner): Promise<string> => {
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
