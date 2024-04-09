import { CHAIN_ID_BSC, CHAIN_ID_SOLANA, CHAIN_ID_SEPOLIA } from "@certusone/wormhole-sdk"
import { Base64, SignMethod, UserAddress } from "../interfaces"
import {
    CHAIN_ID_ALGORAND,
    CHAIN_ID_AVAX,
    CHAIN_ID_ETH,
    CHAIN_ID_ARBITRUM,
    ChainId,
    ChainName,
    toChainId,
    CHAIN_ID_ARBITRUM_SEPOLIA,
    AlgorandChainName,
    EthereumChainName,
    AvalancheChainName,
    ArbitrumChainName,
    ArbitrumSepoliaChainName,
    BscChainName,
    SolanaChainName,
    SepoliaChainName,
} from "../wormhole"
import AlgorandUtils from "./algorand"
import ArbitrumUtils, { ArbitrumSepoliaUtils } from "./arbitrum"
import AvalancheUtils from "./avalanche"
import EthereumUtils from "./ethereum"
import SolanaUtils from "./solana"
import BscUtils from "./bsc"
import SepoliaUtils from "./sepolia"

import { ChainTools } from "./type"

export { ALGORAND_ZERO_ADDRESS_STRING } from "./algorand"

export { isValidEthereumAddress, toValidEthereumAddress } from "./evm"

// IMPORTANT:
// In order to support a new chain, you need to add their chainId in the SUPPORTED_CHAIN_IDS array and their chainName in the SUPPORTED_CHAIN_NAMES array
// Then, you need to add their chainId in the CHAIN_UTILS object with their respective chain utils. There is a test to verify this.
const SUPPORTED_CHAIN_IDS = [CHAIN_ID_ALGORAND, CHAIN_ID_ETH, CHAIN_ID_AVAX, CHAIN_ID_ARBITRUM, CHAIN_ID_ARBITRUM_SEPOLIA, CHAIN_ID_BSC, CHAIN_ID_SOLANA, CHAIN_ID_SEPOLIA] as const
const SUPPORTED_CHAIN_NAMES = [AlgorandChainName, EthereumChainName, AvalancheChainName, ArbitrumChainName, ArbitrumSepoliaChainName, BscChainName, SolanaChainName, SepoliaChainName] as const

type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number]
type SupportedChainName = typeof SUPPORTED_CHAIN_NAMES[number]

const CHAIN_UTILS: Record<SupportedChainId, ChainTools> = {
    [CHAIN_ID_ALGORAND]: AlgorandUtils,
    [CHAIN_ID_ETH]: EthereumUtils,
    [CHAIN_ID_SEPOLIA]: SepoliaUtils,
    [CHAIN_ID_AVAX]: AvalancheUtils,
    [CHAIN_ID_ARBITRUM]: ArbitrumUtils,
    [CHAIN_ID_ARBITRUM_SEPOLIA]: ArbitrumSepoliaUtils,
    [CHAIN_ID_BSC]: BscUtils,
    [CHAIN_ID_SOLANA]: SolanaUtils
} as const

// We need to make sure these are incremental
const C3_ACCOUNT_TYPE_ALGORAND = 0
const C3_ACCOUNT_TYPE_EVM = 1
const C3_ACCOUNT_TYPE_SOLANA = 2
const C3_ACCOUNT_TYPES = [C3_ACCOUNT_TYPE_ALGORAND, C3_ACCOUNT_TYPE_EVM, C3_ACCOUNT_TYPE_SOLANA]
type C3AccountType = typeof C3_ACCOUNT_TYPES[number]
const CHAIN_ID_TO_ACCOUNT_TYPE: Record<SupportedChainId, C3AccountType> = {
    [CHAIN_ID_ALGORAND]: C3_ACCOUNT_TYPE_ALGORAND,
    [CHAIN_ID_ETH]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_SEPOLIA]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_AVAX]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_ARBITRUM]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_ARBITRUM_SEPOLIA]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_BSC]: C3_ACCOUNT_TYPE_EVM,
    [CHAIN_ID_SOLANA]: C3_ACCOUNT_TYPE_SOLANA
}

// TODO WARNING: This is a bit dangerous since the utils include chain specific stuff not only address encoding
const C3_ACCOUNT_TYPE_UTILS: Record<C3AccountType, ChainTools> = {
    [C3_ACCOUNT_TYPE_ALGORAND]: AlgorandUtils,
    [C3_ACCOUNT_TYPE_EVM]: EthereumUtils,
    [C3_ACCOUNT_TYPE_SOLANA]: SolanaUtils,
}

const isChainIdSupported = (chainId: ChainId | number): boolean => (chainId in CHAIN_UTILS)
const isChainNameSupported = (chainName: string | ChainName): boolean => isChainIdSupported(toChainId(chainName as ChainName))

function toSupportedChainId (chainId: ChainId): SupportedChainId {
    if (!isChainIdSupported(chainId)) {
        throw new Error(`ChainId "${chainId}" not supported`)
    }
    return chainId as SupportedChainId
}

function toSupportedChainIdFromChainName (chainName: string | ChainName): SupportedChainId {
    if (!isChainNameSupported(chainName)) {
        throw new Error(`ChainName "${chainName}" not supported`)
    }
    return toSupportedChainId(toChainId(chainName as ChainName))
}

/**
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * @private and @internal Do not export this function
 * @param address User address
 * @returns {SupportedChainId} Chain id the address belongs to
 */
function findChainIdByAddress (address: UserAddress): SupportedChainId {
    for (const key of SUPPORTED_CHAIN_IDS) {
        if (CHAIN_UTILS[key].isValidAddress(address)) {
            return key
        }
    }

    throw new Error(`Invalid address: ${address}`)
}

/**
 * IMPORTANT!!
 * PLEASE, READ THIS BEFORE USING THIS FUNCTION!!!
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * Please, avoid using it. Safe way is using its respective chain utils function.
 * I.E: CHAIN_UTILS[chainId].isValidAddress
 * @param address Any supported chain address
 * @returns {boolean} True if address is valid
 */
function isValidAddress (address: UserAddress): boolean {
    try {
        findChainIdByAddress(address)
        return true
    } catch (err) {
        return false
    }
}

/**
 * IMPORTANT!!
 * PLEASE, READ THIS BEFORE USING THIS FUNCTION!!!
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * Please, avoid using it. Safe way is using its respective chain utils function.
 * I.E: CHAIN_UTILS[chainId].getSigningMethod
 * @param address Any supported chain address
 * @returns {SignMethod} Sign method for the chain the address belongs to
 */
function getSigningMethodByAddress (address: UserAddress): SignMethod {
    const chainId = findChainIdByAddress(address)
    return CHAIN_UTILS[chainId].getSigningMethod()
}

/**
 * IMPORTANT!!
 * PLEASE, READ THIS BEFORE USING THIS FUNCTION!!!
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * Please, avoid using it. Safe way is using its respective chain utils function.
 * I.E: CHAIN_UTILS[chainId].getPublicKey
 * @param address Any supported chain address
 * @returns {Uint8Array} Public key for the chain the address belongs to
 */
function getPublicKeyByAddress (address: UserAddress): Uint8Array {
    const chainId = findChainIdByAddress(address)
    return CHAIN_UTILS[chainId].getPublicKey(address)
}

/**
 * IMPORTANT!!
 * PLEASE, READ THIS BEFORE USING THIS FUNCTION!!!
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * Please, avoid using it. Safe way is using its respective chain utils function.
 * I.E: CHAIN_UTILS[chainId].getDataPrefix
 * @param address Any supported chain address
 * @param dataLength Length of the data to be signed
 * @returns {Uint8Array} Public key for the chain the address belongs to
 */
function getDataPrefixByAddress (address: UserAddress, dataLength: number): Uint8Array {
    const chainId = findChainIdByAddress(address)
    return CHAIN_UTILS[chainId].getDataPrefix(dataLength)
}

/**
 * IMPORTANT!!
 * PLEASE, READ THIS BEFORE USING THIS FUNCTION!!!
 * @UNSAFE This function is unsafe because it does not return which chain the address belongs to.
 * Please, avoid using it. Safe way is using its respective chain utils function.
 * I.E: CHAIN_UTILS[chainId].verifySignature
 * @param signature Signature to be verified
 * @param data Data to be verified
 * @param address Any supported chain address
 * @returns {boolean} True if signature is valid
 */
function verifySignatureByAddress (signature: Uint8Array|Base64, data: Uint8Array|Base64, address: UserAddress): boolean {
    const chainId = findChainIdByAddress(address)
    return CHAIN_UTILS[chainId].verifySignature(signature, data, address)
}

export type {
    SupportedChainId,
    SupportedChainName,
    C3AccountType
}

export {
    SUPPORTED_CHAIN_IDS,
    SUPPORTED_CHAIN_NAMES,
    CHAIN_UTILS,
    C3_ACCOUNT_TYPES,
    C3_ACCOUNT_TYPE_ALGORAND,
    C3_ACCOUNT_TYPE_EVM,
    C3_ACCOUNT_TYPE_SOLANA,
    C3_ACCOUNT_TYPE_UTILS,
    CHAIN_ID_TO_ACCOUNT_TYPE,
    isChainIdSupported,
    isChainNameSupported,
    toSupportedChainId,
    toSupportedChainIdFromChainName,
    isValidAddress,
    getSigningMethodByAddress,
    getPublicKeyByAddress,
    getDataPrefixByAddress,
    verifySignatureByAddress,
    findChainIdByAddress
}