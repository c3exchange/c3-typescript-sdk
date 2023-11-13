
/*************************************************************************
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
 */
import { Algodv2 } from 'algosdk'
import sha512 from 'js-sha512'
import hibase32 from 'hi-base32'

export namespace pricecasterTools {
  const ALGORAND_ADDRESS_SIZE = 58

  export function timeoutPromise(ms: number, promise: Promise<any>) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('promise timeout'))
      }, ms)
      promise.then(
        (res) => {
          clearTimeout(timeoutId)
          resolve(res)
        },
        (err) => {
          clearTimeout(timeoutId)
          reject(err)
        }
      )
    })
  }

  export function getInt64Bytes(x: number, len: number) {
    if (!len) {
      len = 8
    }
    const bytes = new Uint8Array(len)
    do {
      len -= 1
      // eslint-disable-next-line no-bitwise
      bytes[len] = x & (255)
      // eslint-disable-next-line no-bitwise
      x >>= 8
    } while (len)
    return bytes
  }

  export function addressFromByteBuffer(addr: string) {
    const bytes = Buffer.from(addr, 'base64')

    // compute checksum
    const checksum = sha512.sha512_256.array(bytes).slice(28, 32)

    const c = new Uint8Array(bytes.length + checksum.length)
    c.set(bytes)
    c.set(checksum, bytes.length)

    const v = hibase32.encode(c)

    return v.toString().slice(0, ALGORAND_ADDRESS_SIZE)
  }

  export function printAppCallDeltaArray(deltaArray: any[]) {
    for (let i = 0; i < deltaArray.length; i++) {
      if (deltaArray[i].address) {
        console.log('Local state change address: ' + deltaArray[i].address)
        for (let j = 0; j < deltaArray[i].delta.length; j++) {
          printAppCallDelta(deltaArray[i].delta[j])
        }
      } else {
        console.log('Global state change')
        printAppCallDelta(deltaArray[i])
      }
    }
  }

  export function printAppStateArray(stateArray: any[]): void {
    for (let n = 0; n < stateArray.length; n++) {
      printAppState(stateArray[n])
    }
  }

  export function appValueState(stateValue: any, disableParseAddress: boolean = false) {
    let text = ''

    if (stateValue.type === 1 && !disableParseAddress) {
      const addr = addressFromByteBuffer(stateValue.bytes)
      if (addr.length === ALGORAND_ADDRESS_SIZE) {
        text += addr
      } else {
        text += stateValue.bytes
      }
    } else if (stateValue.type === 2) {
      text = stateValue.uint
    } else {
      text += stateValue.bytes
    }

    return text
  }

  export function appValueStateString(stateValue: any) {
    let text = ''

    if (stateValue.type === 1) {
      const addr = addressFromByteBuffer(stateValue.bytes)
      if (addr.length === ALGORAND_ADDRESS_SIZE) {
        text += addr
      } else {
        text += stateValue.bytes
      }
    } else if (stateValue.type === 2) {
      text += stateValue.uint
    } else {
      text += stateValue.bytes
    }

    return text
  }

  export function printAppState(state: any) {
    let text = Buffer.from(state.key, 'base64').toString() + ': '

    text += appValueStateString(state.value)

    console.log(text)
  }

  export async function printAppLocalState(algodClient: Algodv2, appId: number, accountAddr: string) {
    const ret = await readAppLocalState(algodClient, appId, accountAddr)
    if (ret) {
      console.log('Application %d local state for account %s:', appId, accountAddr)
      printAppStateArray(ret)
    }
  }

  export async function printAppGlobalState(algodClient: Algodv2, appId: number) {
    const ret = await readAppGlobalState(algodClient, appId)
    if (ret) {
      console.log('Application %d global state:', appId)
      printAppStateArray(ret)
    }
  }

  export async function readCreatedApps(algodClient: Algodv2, accountAddr: string) {
    const accountInfoResponse = await algodClient.accountInformation(accountAddr).do()
    return accountInfoResponse['created-apps']
  }

  export async function readOptedInApps(algodClient: Algodv2, accountAddr: string) {
    const accountInfoResponse = await algodClient.accountInformation(accountAddr).do()
    return accountInfoResponse['apps-local-state']
  }

  // read global state of application
  export async function readAppGlobalState(algodClient: Algodv2, appId: number) {
    const appInfo = await algodClient.getApplicationByID(appId).do()
    return appInfo.params['global-state']
  }

  export async function readAppGlobalStateByKey(algodClient: Algodv2, appId: number, key: string | bigint | number, disableParseAddress?: boolean) {
    const appInfo = await algodClient.getApplicationByID(appId).do()
    const stateArray = appInfo.params['global-state']
    for (let j = 0; j < stateArray.length; j++) {
      if (typeof key === 'string') {
        const text = Buffer.from(stateArray[j].key, 'base64').toString()

        if (key === text) {
          return appValueState(stateArray[j].value, disableParseAddress)
        }
      } else if (typeof key === 'bigint' || typeof key === 'number') {
        let n
        const v = (Buffer.from(stateArray[j].key, 'base64'))
        if (v.length >= 8) {
          n = v.readBigUint64BE()
        }
        if (BigInt(key) === n) {
          return appValueState(stateArray[j].value, true)
        }
      } else {
        throw new Error('Unsupported parameter type')
      }
    }
      }

  // read local state of application from user account
  export async function readAppLocalState(algodClient: Algodv2, appId: number, accountAddr: string) {
    const accountInfoResponse = await algodClient.accountInformation(accountAddr).do()
    for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
      if (accountInfoResponse['apps-local-state'][i].id === appId) {
        if (accountInfoResponse['apps-local-state'][i]['key-value']) {
          return accountInfoResponse['apps-local-state'][i]['key-value']
        }
      }
    }
  }

  export async function readAppLocalStateByKey(algodClient: Algodv2, appId: number, accountAddr: string, key: string) {
    const accountInfoResponse = await algodClient.accountInformation(accountAddr).do()
    for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
      if (accountInfoResponse['apps-local-state'][i].id === appId) {
        const stateArray = accountInfoResponse['apps-local-state'][i]['key-value']

        if (!stateArray) {
          return null
        }
        for (let j = 0; j < stateArray.length; j++) {
          const text = Buffer.from(stateArray[j].key, 'base64').toString()

          if (key === text) {
            return appValueState(stateArray[j].value)
          }
        }
        // not found assume 0
        return 0
      }
    }
  }

  export function uintArray8ToString(byteArray: Uint8Array): string {
    return Array.from(byteArray, function (byte: number) {
      // eslint-disable-next-line no-bitwise
      return ('0' + (byte & 0xFF).toString(16)).slice(-2)
    }).join('')
  }

  /**
   * Verify if transactionResponse has any information about a transaction local or global state change.
   * @param  {Object} transactionResponse object containing the transaction response of an application call
   * @return {Boolean} returns true if there is a local or global delta meanining that
   * the transaction made a change in the local or global state
   */
  export function anyAppCallDelta(transactionResponse: any): any {
    return (transactionResponse['global-state-delta'] || transactionResponse['local-state-delta'])
  }

  /**
   * Print to stdout the changes introduced by the transaction that generated the transactionResponse if any.
   * @param  {Object} transactionResponse object containing the transaction response of an application call
   * @return {void}
   */
  export function printAppCallDelta(transactionResponse: any) {
    if (transactionResponse['global-state-delta'] !== undefined) {
      console.log('Global State updated:')
      printAppCallDeltaArray(transactionResponse['global-state-delta'])
    }
    if (transactionResponse['local-state-delta'] !== undefined) {
      console.log('Local State updated:')
      printAppCallDeltaArray(transactionResponse['local-state-delta'])
    }
  }
  /**
   * Extracts a buffer slice specifying start and number of bytes.
   * @param {*} buffer An input buffer object.
   * @param {*} start The start postion.
   * @param {*} size The size of the byte slice to extract.
   * @returns A buffer with extracted bytes.
   */
  export function extract3(buffer: Buffer, start: number, size: number): Buffer {
    return buffer.slice(start, start + size)
  }

  /**
   * Divides an array in chunks.
   * @param {*} array  The input array
   * @param {*} chunkSize The desired chunk size
   * @returns A collection of arrays containing chunks of the original array
   */
  export function arrayChunks<T>(array: Array<T>, chunkSize: number): Array<T>[] {
    return Array(Math.ceil(array.length / chunkSize))
      .fill(undefined).map((_, index) => index * chunkSize)
      .map(begin => array.slice(begin, begin + chunkSize))
  }

  /**
   * Divides an array in chunks.
   * @param {*} array  The input array
   * @param {*} numOfChunks The number of desired chunks
   * @returns A collection of arrays containing chunks of the original array
   */
  export function arrayChunks2<T>(array: Array<T>, numOfChunks: number): Array<T>[] {
    return arrayChunks(array, Math.ceil(array.length / numOfChunks))
  }
}
