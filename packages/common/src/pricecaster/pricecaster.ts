/**
 *
 * Pricecaster Service Utility Library.
 *
 * Copyright 2022 C3 LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import algosdk from 'algosdk'
import axios from 'axios'
import { pricecasterTools as tools } from './app-tools'
import fs from 'fs'
const wormholeSdk = require('@certusone/wormhole-sdk')

type ContractInfo = {
  schema: {
    globalInts: number,
    globalBytes: number,
    localInts: number,
    localBytes: number
  },
  approvalProgramFile: string,
  clearStateProgramFile: string,
  compiledApproval: {
    bytes: Uint8Array,
    hash: string
  },
  compiledClearState: {
    bytes: Uint8Array,
    hash: string
  },
  appId: number
}

// Pricecaster Contract Info
export const PRICECASTER_CI: ContractInfo = {
  schema: {
    globalInts: 0,
    globalBytes: 64,
    localInts: 0,
    localBytes: 0
  },
  approvalProgramFile: 'teal/build/pricecaster-approval.teal',
  clearStateProgramFile: 'teal/build/pricecaster-clear.teal',
  compiledApproval: {
    bytes: new Uint8Array(),
    hash: ''
  },
  compiledClearState: {
    bytes: new Uint8Array(),
    hash: ''
  },
  appId: 0
}

export type PriceSlotData = {
  asaId: number,
  normalizedPrice: bigint,
  pythPrice: bigint,
  confidence: bigint,
  exponent: number,
  priceEMA: bigint,
  confEMA: bigint,
  attTime: bigint,
  pubTime: bigint,
  prevPubTime: bigint,
  prevPrice: bigint,
  prevConf: bigint
}

export type AsaIdSlot = { asaid: number, slot: number }
export type SystemSlotInfo = { entryCount: number, flags: number }

const GLOBAL_SLOT_SIZE = 92
const SYSTEM_SLOT_INDEX = 85
const NUM_SLOTS = 86

const CORE_OP_QUA_ENTRY = 'CORE_OP_QUA'

// --------------------------------------------------------------------------------------
type SignCallback = (arg0: string, arg1: algosdk.Transaction) => any

export interface IPriceCasterApiClient {
  getPrices(): Promise<PriceSlotData[]>
}
export class PriceCasterApiClient implements IPriceCasterApiClient {
  private baseUrl = ''

  constructor(url: string, port?: number) {
    if (port) {
      url = url + ":" + port.toString()
    }

    if (url) {
      // Throws an error if format is invalid
      new URL(url)

      if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1)
      }

      this.baseUrl = url
    }

  }

  async getPrices(): Promise<PriceSlotData[]> {
    const prices = await axios.get(this.baseUrl + '/prices')
    return prices.data as PriceSlotData[]
  }
}
export class PricecasterLib {
  private minFee: number
  private dumpFailedTx: boolean
  private dumpFailedTxDirectory: string

  constructor(readonly algodClient?: algosdk.Algodv2) {
    this.algodClient = algodClient
    this.minFee = 1000
    this.dumpFailedTx = false
    this.dumpFailedTxDirectory = './'
  }

  /** Set the file dumping feature on failed group transactions
     * @param {boolean} f Set to true to enable function, false to disable.
     */
  enableDumpFailedTx(f: boolean) {
    this.dumpFailedTx = f
  }

  /** Set the file dumping feature output directory
     * @param {string} dir The output directory.
     */
  setDumpFailedTxDirectory(dir: string) {
    this.dumpFailedTxDirectory = dir
  }

  /** Sets a contract approval program filename
     * @param {string} contract The contract info to set
     * @param {string} filename New file name to use.
     */
  setApprovalProgramFile(pcci: ContractInfo, filename: string) {
    pcci.approvalProgramFile = filename
  }

  /** Sets a contract clear state program filename
     * @param {string} contract The contract info to set
     * @param {string} filename New file name to use.
     */
  setClearStateProgramFile(pcci: ContractInfo, filename: string) {
    pcci.clearStateProgramFile = filename
  }

  /** Sets approval program bytes and hash
    * @param {string} contract The contract info to set
    * @param {*}      bytes Compiled program bytes
    * @param {string} hash  Compiled program hash
    */
  setCompiledApprovalProgram(pcci: ContractInfo, bytes: Uint8Array, hash: string) {
    pcci.compiledApproval.bytes = bytes
    pcci.compiledApproval.hash = hash
  }

  /** Sets compiled clear state contract bytes and hash
    * @param {string} contract The contract info to set
    * @param {*}      bytes Compiled program bytes
    * @param {string} hash  Compiled program hash
    */
  setCompiledClearStateProgram(pcci: ContractInfo, bytes: Uint8Array, hash: string) {
    pcci.compiledClearState.bytes = bytes
    pcci.compiledClearState.hash = hash
  }

  /**
     * Set Application Id for a contract.
     * @param {number} applicationId application id
     * @returns {void}
     */
  setAppId(pcci: ContractInfo, applicationId: number) {
    pcci.appId = applicationId
  }

  /**
     * Get the Application id for a specific contract
     * @returns The requested application Id
     */
  getAppId(pcci: ContractInfo) {
    return pcci.appId
  }

  /**
     * Get minimum fee to pay for transactions.
     * @return {Number} minimum transaction fee
     */
  minTransactionFee(): number {
    return this.minFee
  }

  /**
     * Internal function.
     * Read application local state related to the account.
     * @param  {String} accountAddr account to retrieve local state
     * @return {Array} an array containing all the {key: value} pairs of the local state
     */
  async readLocalState(accountAddr: string, pcci: ContractInfo): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    return tools.readAppLocalState(this.algodClient, pcci.appId, accountAddr)
  }

  /**
     * Internal function.
     * Read application global state.
     * @return {Array} an array containing all the {key: value} pairs of the global state
     * @returns {void}
     */
  async readGlobalState(pcci: ContractInfo): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    return tools.readAppGlobalState(this.algodClient, pcci.appId)
  }

  /**
     * Print local state of accountAddr on stdout.
     * @param  {String} accountAddr account to retrieve local state
     * @returns {void}
     */
  async printLocalState(accountAddr: string, pcci: ContractInfo): Promise<void> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    await tools.printAppLocalState(this.algodClient, pcci.appId, accountAddr)
  }

  /**
     * Print application global state on stdout.
     * @returns {void}
     */
  async printGlobalState(pcci: ContractInfo): Promise<void> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    await tools.printAppGlobalState(this.algodClient, pcci.appId)
  }

  /**
     * Internal function.
     * Read application local state variable related to accountAddr.
     * @param  {String} accountAddr account to retrieve local state
     * @param  {String} key variable key to get the value associated
     * @return {String/Number} it returns the value associated to the key that could be an address, a number or a
     * base64 string containing a ByteArray
     */
  async readLocalStateByKey(accountAddr: string, key: string, pcci: ContractInfo): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    return tools.readAppLocalStateByKey(this.algodClient, pcci.appId, accountAddr, key)
  }

  /**
     * Internal function.
     * Read application global state variable.
     * @param  {String} key variable key to get the value associated
     * @return {String/Number} it returns the value associated to the key that could be an address,
     * a number or a base64 string containing a ByteArray
     */
  async readGlobalStateByKey(key: string, pcci: ContractInfo, disableParseAddress?: boolean): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    return tools.readAppGlobalStateByKey(this.algodClient, pcci.appId, key, disableParseAddress)
  }

  /**
     * Compile program that programFilename contains.
     * @param {String} programBytes Array of program bytes
     * @return {String} base64 string containing the compiled program
     */
  async compileProgram(programBytes: Uint8Array | string): Promise<{ bytes: Uint8Array; hash: any }> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    const compileResponse = await this.algodClient.compile(programBytes).do()
    const compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, 'base64'))
    return { bytes: compiledBytes, hash: compileResponse.hash }
  }

  /**
     * Compile clear state program.
     */
  async compileClearProgram(pcci: ContractInfo) {
    const program = fs.readFileSync(pcci.clearStateProgramFile, 'utf8')
    pcci.compiledClearState = await this.compileProgram(program)
  }

  /**
     * Compile approval program.
     */
  async compileApprovalProgram(pcci: ContractInfo, tmplReplace: [string, string][] = []) {
    let program = fs.readFileSync(pcci.approvalProgramFile, 'utf8')
    tmplReplace.forEach((repl) => {
      const regex = new RegExp(`${repl[0]}`, 'g')
      program = program.replace(regex, repl[1])
    })
    pcci.compiledApproval = await this.compileProgram(program)
  }

  /**
     * Helper function to retrieve the application id from a createApp transaction response.
     * @param  {Object} txResponse object containig the transactionResponse of the createApp call
     * @return {Number} application id of the created application
     */
  appIdFromCreateAppResponse(txResponse: any): any {
    return txResponse['application-index']
  }

  /**
     * Helper function to retrieve the asset id id from a createApp transaction response.
     * @param  {Object} txResponse object containig the transactionResponse of the createApp call
     * @return {Number} asset id of the created asset
     */
  assetIdFromCreateAppResponse(txResponse: any): any {
    return txResponse['asset-index']
  }

  /**
     * Create an application based on the default approval and clearState programs or based on the specified files.
     * @param  {String} sender account used to sign the createApp transaction
     * @param  {Function} signCallback callback with prototype signCallback(sender, tx) used to sign transactions
     * @param  {Tuple[]} tmplReplace Array of tuples specifying template replacements in output TEAL.
     * @return {String} transaction id of the created application
     */
  async createApp(sender: string,
    pcci: ContractInfo,
    appArgs: Uint8Array[],
    signCallback: SignCallback,
    tmplReplace: [string, string][] = [],
    skipCompile?: any,
    fee?: number): Promise<string> {
    const onComplete = algosdk.OnApplicationComplete.NoOpOC
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }

    // get node suggested parameters
    const params = await this.algodClient.getTransactionParams().do()
    params.fee = fee ?? this.minFee
    params.flatFee = true

    if (!skipCompile) {
      await this.compileApprovalProgram(pcci, tmplReplace)
      await this.compileClearProgram(pcci)
    }

    // create unsigned transaction
    const txApp = algosdk.makeApplicationCreateTxn(
      sender, params, onComplete,
      pcci.compiledApproval.bytes,
      pcci.compiledClearState.bytes,
      pcci.schema.localInts,
      pcci.schema.localBytes,
      pcci.schema.globalInts,
      pcci.schema.globalBytes, appArgs
    )
    const txId = txApp.txID().toString()

    // Sign the transaction
    const txAppSigned = signCallback(sender, txApp)

    // Submit the transaction
    await this.algodClient.sendRawTransaction(txAppSigned).do()
    return txId
  }

  /**
       * Create the Pricekeeper application based on the default approval and clearState programs or based on the specified files.
       * @param  {String} sender account used to sign the createApp transaction
       * @param  {String} wormholeCore The application id of the Wormhole Core program associated.
       * @param  {boolean} testMode Set to true to enable test mode (ignore transaction format and VAA checks)
       * @param  {boolean} disableMerkleVerification Set to true to disable merkle root verification
       * @param  {Function} signCallback callback with prototype signCallback(sender, tx) used to sign transactions
       * @return {String} transaction id of the created application
       */
  async createPricecasterApp(
    creatorAddr: string,
    operatorAddr: string,
    quantAddr: string,
    wormholeCore: number, testMode: boolean, 
    disableMerkleVerification: boolean, signCallback: SignCallback, fee?: number): Promise<any> {
    return this.createApp(creatorAddr, PRICECASTER_CI,
      [algosdk.encodeUint64(wormholeCore),
      algosdk.decodeAddress(operatorAddr).publicKey,
      algosdk.decodeAddress(quantAddr).publicKey], signCallback, [
        ['TMPL_I_TESTING', testMode ? '128' : '0'],
        ['TMPL_I_DISABLE_MERKLE_PROOF', disableMerkleVerification ? '64' : '0' ]], undefined, fee)
  }

  /**
     * Internal function.
     * Call application specifying args and accounts.
     * @param  {String} sender caller address
     * @param  {Array} appArgs array of arguments to pass to application call
     * @param  {Array} appAccounts array of accounts to pass to application call
     * @param  {Function} signCallback callback with prototype signCallback(sender, tx) used to sign transactions
     * @return {String} transaction id of the transaction
     */
  async callApp(sender: string,
    pcci: ContractInfo,
    appArgs: Uint8Array[],
    appAccounts: string[],
    signCallback: SignCallback): Promise<any> {
    // get node suggested parameters
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    const params = await this.algodClient.getTransactionParams().do()

    params.fee = this.minFee
    params.flatFee = true

    // create unsigned transaction
    const txApp = algosdk.makeApplicationNoOpTxn(sender, params, pcci.appId, appArgs, appAccounts.length === 0 ? undefined : appAccounts)
    const txId = txApp.txID().toString()

    // Sign the transaction
    const txAppSigned = signCallback(sender, txApp)

    // Submit the transaction
    await this.algodClient.sendRawTransaction(txAppSigned).do()

    return txId
  }

  /**
     * ClearState sender. Remove all the sender associated local data.
     * @param  {String} sender account to ClearState
     * @param  {Function} signCallback callback with prototype signCallback(sender, tx) used to sign transactions
     * @return {[String]} transaction id of one of the transactions of the group
     */
  async clearApp(sender: string, signCallback: SignCallback, pcci: ContractInfo): Promise<string> {
    // get node suggested parameters
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    const params = await this.algodClient.getTransactionParams().do()

    params.fee = this.minFee
    params.flatFee = true

    const appId = pcci.appId

    // create unsigned transaction
    const txApp = algosdk.makeApplicationClearStateTxn(sender, params, appId)
    const txId = txApp.txID().toString()

    // Sign the transaction
    const txAppSigned = signCallback(sender, txApp)

    // Submit the transaction
    await this.algodClient.sendRawTransaction(txAppSigned).do()

    return txId
  }

  /**
      * Permanent delete the application.
      * @param  {String} sender owner account
      * @param  {Function} signCallback callback with prototype signCallback(sender, tx) used to sign transactions
      * @param  {Function} applicationId use this application id instead of the one set
      * @return {String}      transaction id of one of the transactions of the group
      */
  async deleteApp(sender: string, signCallback: SignCallback, pcci: ContractInfo): Promise<any> {
    // get node suggested parameters
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    const params = await this.algodClient.getTransactionParams().do()

    params.fee = this.minFee
    params.flatFee = true

    // create unsigned transaction
    const txApp = algosdk.makeApplicationDeleteTxn(sender, params, pcci.appId)
    const txId = txApp.txID().toString()

    // Sign the transaction
    const txAppSigned = signCallback(sender, txApp)

    // Submit the transaction
    await this.algodClient.sendRawTransaction(txAppSigned).do()

    return txId
  }

  /**
     * Helper function to wait until transaction txId is included in a block/round.
     * @param  {String} txId transaction id to wait for
     * @return {VOID} VOID
     */
  async waitForConfirmation(txId: string): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    const status = (await this.algodClient.status().do())
    let lastRound = status['last-round']
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do()
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        // Got the completed Transaction

        return pendingInfo['confirmed-round']
      }
      lastRound += 1
      await this.algodClient.statusAfterBlock(lastRound).do()
    }
  }

  /**
     * Helper function to wait until transaction txId is included in a block/round
     * and returns the transaction response associated to the transaction.
     * @param  {String} txId transaction id to get transaction response
     * @return {Object}      returns an object containing response information
     */
  async waitForTransactionResponse(txId: string): Promise<any> {
    if (!this.algodClient) {
      throw new Error('algodClient is not defined')
    }
    // Wait for confirmation
    await this.waitForConfirmation(txId)

    // display results
    return this.algodClient.pendingTransactionInformation(txId).do()
  }

  /**
   * Pricecaster.: Generate store price transaction.
   *
   * @param {*} sender The sender account (typically the VAA verification stateless program)
   * @param {*} merkleRoot The merkle root of the VAA payload. For test mode, this can be supplied with an empty buffer.
   * @param {*} asaIdSlots An array of objects of entries  (asaid, slot) for each attestation contained in the VAA to publish. 
   *                           The slot will be used to store the price and must be mantained by caller.
   * @param {*} payload The Pyth price update payload. 
   * @param {*} suggestedParams  The network suggested params, get with algosdk getTransactionParams call.
   * @param {*} budget: The computation budget to provide for the main loop.
   */
  makePriceStoreTx(sender: string, merkleRoot: Buffer, asaIdSlots: AsaIdSlot[], payload: Buffer, suggestedParams: algosdk.SuggestedParams, budget: number): algosdk.Transaction {
    const ASAID_SLOT_SIZE = 9
    const appArgs = []
    suggestedParams.flatFee = true

    if (this.dumpFailedTx) {
      console.warn(`Dump failed to ${this.dumpFailedTxDirectory} unimplemented`)
    }

    // Pricecaster use the ASA IDs to query for decimals data onchain, so valid ASA IDs
    // must be added to the foreign asset array

    const assetIds: number[] = asaIdSlots.filter(v => v.asaid !== -1).map(v => v.asaid)
    const encodedAsaIdSlots = new Uint8Array(ASAID_SLOT_SIZE * asaIdSlots.length)

    //const IGNORE_ASA = Buffer.from('FFFFFFFFFFFFFFFF', 'hex')

    for (let i = 0; i < asaIdSlots.length; ++i) {
      const buf = Buffer.concat([
        algosdk.encodeUint64(asaIdSlots[i].asaid),
        algosdk.encodeUint64(asaIdSlots[i].slot).slice(7)
      ])
      encodedAsaIdSlots.set(buf, i * ASAID_SLOT_SIZE)
    }

    // If total argument exceeds 2048 bytes, the Transaction Note field is used as data
    // extension to support up to 11 price updates in a single call.

    const appCall = Buffer.from('store')
    let finalPayload = payload
    let txNote

    if (appCall.length + 8 + payload.length + merkleRoot.length + encodedAsaIdSlots.length > 2048) {
      finalPayload = payload.subarray(0, 2048 - 8 - appCall.length - merkleRoot.length - encodedAsaIdSlots.length)
      txNote = new Uint8Array(payload.subarray(2048 - 8 - appCall.length - merkleRoot.length - encodedAsaIdSlots.length))
    } 

    appArgs.push(new Uint8Array(appCall), new Uint8Array(merkleRoot), encodedAsaIdSlots, new Uint8Array(finalPayload), algosdk.encodeUint64(budget))

    const tx = algosdk.makeApplicationNoOpTxn(sender,
      suggestedParams,
      PRICECASTER_CI.appId,
      appArgs,
      undefined,
      undefined,
      assetIds,
      txNote)

    return tx
  }

  /**
   * Allocates a new price slot.
   *
   * @param sender The sender account.
   * @param asaid The ASA ID to be assigned to the new slot.
   * @param suggestedParams  The transaction params.
   * @returns
   */
  makeAllocSlotTx(sender: string, asaid: number, suggestedParams: algosdk.SuggestedParams): algosdk.Transaction {
    const appArgs = []
    appArgs.push(new Uint8Array(Buffer.from('alloc')), algosdk.encodeUint64(asaid))

    const tx = algosdk.makeApplicationNoOpTxn(sender,
      suggestedParams,
      PRICECASTER_CI.appId,
      appArgs)

    return tx
  }

  /**
   * Resets the contract to zero.
   *
   * @param sender The sender account.
   * @param suggestedParams  The transaction params.
   * @returns
   */
  makeResetTx(sender: string, suggestedParams: algosdk.SuggestedParams): algosdk.Transaction {
    const appArgs = []
    appArgs.push(new Uint8Array(Buffer.from('reset')))

    const tx = algosdk.makeApplicationNoOpTxn(sender,
      suggestedParams,
      PRICECASTER_CI.appId,
      appArgs)

    return tx
  }

  /**
   * Set configuration flags.
   *
   * @param sender The sender account.
   * @param flags A value with the flags. The LSB is used.
   * @param suggestedParams  The transaction params.
   * @returns
   */
  makeSetFlagsTx(sender: string, flags: number, suggestedParams: algosdk.SuggestedParams): algosdk.Transaction {
    const appArgs = []
    appArgs.push(new Uint8Array(Buffer.from('setflags')))
    appArgs.push(algosdk.encodeUint64(flags & 0xFF))

    const tx = algosdk.makeApplicationNoOpTxn(sender,
      suggestedParams,
      PRICECASTER_CI.appId,
      appArgs)

    return tx
  }

  /**
   * Fetch the global store blob space
   * @returns Buffer with the entire global store
   */
  async fetchGlobalSpace(): Promise<Buffer> {
    const buf = Buffer.alloc(63 * 127)
    const global: [] = await this.readGlobalState(PRICECASTER_CI)
    if (!global) {
      throw new Error('failed to read global state: does the contract exist?')
    }
    const globalFiltered = global.filter((e: any) => { return e.key !== Buffer.from(CORE_OP_QUA_ENTRY).toString('base64') }) // filter out 'coreid_opa'
    globalFiltered.forEach((e: any) => {
      const offset = Buffer.from(e.key, 'base64').readUint8() * 127
      buf.write(e.value.bytes, offset, 'base64')
    })
    return buf
  }

  /**
   * Read a global space slot by index.
   * @param slot The slot index
   * @returns  The slot information in a buffer
   */
  async readSlot(slot: number): Promise<Buffer> {
    const globalSpace = await this.fetchGlobalSpace()
    return globalSpace.subarray(GLOBAL_SLOT_SIZE * slot, GLOBAL_SLOT_SIZE * slot + GLOBAL_SLOT_SIZE)
  }

  /**
   * Read the Pricecaster contract system slot.
   * @returns The system slot information
   */
  async readSystemSlot(): Promise<SystemSlotInfo> {
    const sysSlotBuf = await this.readSlot(SYSTEM_SLOT_INDEX)
    return {
      entryCount: sysSlotBuf.readUInt8(0),
      flags: sysSlotBuf.readUInt8(1)
    }
  }

  /**
   * Read and parse a price slot.
   * @param slot The slot number.
   * @returns Parsed price data stored in the slot.
   */

  async readParsePriceSlot(slot: number): Promise<PriceSlotData> {
    if (slot < 0 || slot > NUM_SLOTS) {
      throw new Error('Invalid slot number')
    }
    if (slot === SYSTEM_SLOT_INDEX) {
      throw new Error('Cannot parse system slot with this call')
    }
    const dataBuf = await this.readSlot(slot)
    return this.parseSlotBuffer(dataBuf)
  }

  parseSlotBuffer(dataBuf: Buffer): PriceSlotData {
    const asaId = dataBuf.subarray(0, 8).readBigInt64BE()
    const normalizedPrice = dataBuf.subarray(8, 16).readBigUint64BE()
    const pythPrice = dataBuf.subarray(16, 24).readBigUint64BE()
    const confidence = dataBuf.subarray(24, 32).readBigUint64BE()
    const exp = dataBuf.subarray(32, 36).readInt32BE()
    const priceEMA = dataBuf.subarray(36, 44).readBigUint64BE()
    const confEMA = dataBuf.subarray(44, 52).readBigUint64BE()
    const pubTime = dataBuf.subarray(52, 60).readBigUint64BE()
    const prevPubTime = dataBuf.subarray(60, 68).readBigUint64BE()
    return {
      asaId: parseInt(asaId.toString()),
      pythPrice,
      normalizedPrice,
      confidence,
      exponent: exp,
      priceEMA,
      confEMA,
      pubTime,
      prevPubTime,
      attTime: 0n,
      prevPrice: 0n,
      prevConf: 0n
    }
  }

  /**
   * Fetch the global state and parse price information from the valid slots.
   */
  async readParseGlobalState(): Promise<PriceSlotData[]> {
    const globalSpace = await this.fetchGlobalSpace()
    const sysSlot = await this.readSystemSlot()
    const psArray = []
    for (let i = 0; i < sysSlot.entryCount; ++i) {
      psArray.push(this.parseSlotBuffer(globalSpace.subarray(GLOBAL_SLOT_SIZE * i, GLOBAL_SLOT_SIZE * (i + 1))))
    }
    return psArray
  }

  /**
   * Extract Merkle root hash from Pyth payload VAA.
   * 
   * @param  The Pyth Price Service update data.
   * @returns The merkle root hash
   * 
   */
  extractVaaMerkleRoot(pythData: Buffer): { vaa: Buffer, merkleRoot: Buffer } {

    // 504e4155     header   'PNAU'
    // 01           major version (1)
    // 00           minor version (0)
    // 00           Vector of bytes,  reserved for future extension
    // 00           type-indicator (WormholeMerkle)
    // 00a0         Length of VAA in bytes (160)

    // --------- VAA with Merkle root ---------------

    // 01
    // 00000000
    // 01           # signatures
    // 00a65271a4d81be2e825f4b77b95576ef5f368009a91cf4ed6cf21b08b6f0bdfc575d55a3a628165ce81e41b9e3406d3dee8b169390b0f4559b8b099d4f7ed57cd01  sig

    // 64ba51ac     timestamp
    // 00000000     nonce
    // 001a         emitterChainId (PythNet=26)
    // e101faedac5851e32b9b23b5f9411a8c2bac4aae3ed4dd7b811dd1a72ea4aa71   emitterAddress
    // 0000000000b1ec49 sequence
    // 01               consistency

    // vaa Payload follows:

    // 41555756    Header AUWV
    // 00          WormholeMerkleRoot enum
    // 00000000050d5893 merkle_root  (Slot)
    // 00002710         merkle_root  (ring_size)
    // 1900ae58deedf1d45e6fedc738fa256a12f2b25a   (merkle root hash)

    // --------------------------------------------

    const PYTH_HEADER_LEN = 'PNAU'.length + 4
    const vaaSize = pythData.readUInt16BE(PYTH_HEADER_LEN)
    const vaa = pythData.subarray(PYTH_HEADER_LEN + 2, PYTH_HEADER_LEN + 2 + vaaSize)
    const payload = wormholeSdk.parseVaa(vaa).payload
    const merkleRootIndex = 'AUWV'.length + 1 + 8 + 4
    return { vaa, merkleRoot: payload.subarray(merkleRootIndex, merkleRootIndex + 20) }
  }

  /**
   * Extracs the price updates block from Pyth data.
   * 
   * @param pythData The Pyth Price service data.
   * @returns The price updates block containing the price information and merkle paths.
   */

  extractPriceUpdatesBlock(pythData: Buffer): Buffer {
    const PYTH_HEADER_LEN = 'PNAU'.length + 4
    const vaaSize = pythData.readUInt16BE(PYTH_HEADER_LEN)
    return pythData.subarray(PYTH_HEADER_LEN + 2 + vaaSize)
  }

  /**
  * Read the global state core id
  */
  async readCoreId(): Promise<BigInt> {
    const coreid_opa = await this.readGlobalStateByKey(CORE_OP_QUA_ENTRY, PRICECASTER_CI, true)
    return algosdk.bytesToBigInt(Buffer.from(coreid_opa, 'base64').subarray(0, 8))
  }

  /**
   * Read the global state operator address
   */
  async readOperatorAddress(): Promise<string> {
    const coreid_opa = await this.readGlobalStateByKey(CORE_OP_QUA_ENTRY, PRICECASTER_CI, true)
    return algosdk.encodeAddress(Buffer.from(coreid_opa, 'base64').subarray(8, 8 + 32))
  }

  /**
   * Read the global state quant address
   */
  async readQuantAddress(): Promise<string> {
    const coreid_opa = await this.readGlobalStateByKey(CORE_OP_QUA_ENTRY, PRICECASTER_CI, true)
    return algosdk.encodeAddress(Buffer.from(coreid_opa, 'base64').subarray(8 + 32))
  }
}


