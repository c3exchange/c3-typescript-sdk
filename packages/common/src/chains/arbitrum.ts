import { attestFromEth, createWrappedOnAlgorand } from "@certusone/wormhole-sdk"
import { UserAddress, SignMethod } from "../interfaces"
import { decodeEthereumAddress } from "../utils"
import { CHAIN_ID_ARBITRUM, CHAIN_ID_ARBITRUM_SEPOLIA } from "../wormhole"
import { getEthereumAddressByPublicKey, getEthereumDataPrefix, isValidEVMTxHash, isValidEthereumAddress, toValidEthereumAddress, verifyEthereumSignature } from "./evm"
import { ChainTools } from "./type"

const ArbitrumUtils: ChainTools = {
    getPublicKey: (address: UserAddress) => decodeEthereumAddress(address),
    getDataPrefix: (dataLength: number) => getEthereumDataPrefix(dataLength),
    isValidAddress: isValidEthereumAddress,
    toValidAddress: toValidEthereumAddress,
    getAddressByPublicKey: getEthereumAddressByPublicKey,
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_ARBITRUM, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: "arbitrum", tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ECDSA,
    verifySignature: verifyEthereumSignature,
    isValidTxHash: isValidEVMTxHash,
}

const ArbitrumSepoliaUtils: ChainTools = {
    getPublicKey: (address: UserAddress) => decodeEthereumAddress(address),
    getDataPrefix: (dataLength: number) => getEthereumDataPrefix(dataLength),
    isValidAddress: isValidEthereumAddress,
    toValidAddress: toValidEthereumAddress,
    getAddressByPublicKey: getEthereumAddressByPublicKey,
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_ARBITRUM_SEPOLIA, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: "arbitrum_sepolia", tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ECDSA,
    verifySignature: verifyEthereumSignature,
    isValidTxHash: isValidEVMTxHash,
}

export { ArbitrumSepoliaUtils }
export default ArbitrumUtils

attestFromEth