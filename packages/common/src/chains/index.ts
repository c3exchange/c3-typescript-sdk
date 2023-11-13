import { Base64, SignMethod, UserAddress } from "../interfaces"
import { CHAIN_ID_ALGORAND, CHAIN_ID_AVAX, CHAIN_ID_ETH, ChainId, ChainName, toChainId } from "../wormhole"
import AlgorandUtils from "./algorand"
import AvalancheUtils from "./avalanche"
import EthereumUtils from "./ethereum"
import { ChainTools } from "./type"

export { ALGORAND_ZERO_ADDRESS_STRING } from "./algorand"

const SUPPORTED_CHAIN_IDS = [CHAIN_ID_ALGORAND, CHAIN_ID_ETH, CHAIN_ID_AVAX] as const
type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number]

const CHAIN_UTILS: Record<SupportedChainId, ChainTools> = {
    [CHAIN_ID_ALGORAND]: AlgorandUtils,
    [CHAIN_ID_ETH]: EthereumUtils,
    [CHAIN_ID_AVAX]: AvalancheUtils
} as const

const isChainIdSupported = (chainId: ChainId | number): boolean => (chainId in CHAIN_UTILS)
const isChainNameSupported = (chainName: string | ChainName): boolean => isChainIdSupported(toChainId(chainName as ChainName))

function toSupportedChainId (chainId: ChainId): SupportedChainId {
    if (!isChainIdSupported(chainId)) {
        throw new Error(`ChainId "${chainId}" not supported`)
    }
    return chainId as SupportedChainId
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
}

export {
    SUPPORTED_CHAIN_IDS,
    CHAIN_UTILS,
    isChainIdSupported,
    isChainNameSupported,
    toSupportedChainId,
    isValidAddress,
    getSigningMethodByAddress,
    getPublicKeyByAddress,
    getDataPrefixByAddress,
    verifySignatureByAddress,
    findChainIdByAddress
}