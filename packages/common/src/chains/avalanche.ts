import { UserAddress, SignMethod } from "../interfaces"
import { decodeEthereumAddress } from "../utils"
import { CHAIN_ID_AVAX } from "../wormhole"
import { getEthereumAddressByPublicKey, getEthereumDataPrefix, isValidEVMTxHash, isValidEthereumAddress, toValidEthereumAddress, verifyEthereumSignature } from "./evm"
import { ChainTools } from "./type"

const AvalancheUtils: ChainTools = {
    getPublicKey: (address: UserAddress) => decodeEthereumAddress(address),
    getDataPrefix: (dataLength: number) => getEthereumDataPrefix(dataLength),
    isValidAddress: isValidEthereumAddress,
    toValidAddress: toValidEthereumAddress,
    getAddressByPublicKey: getEthereumAddressByPublicKey,
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_AVAX, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: "avalanche", tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ECDSA,
    verifySignature: verifyEthereumSignature,
    isValidTxHash: isValidEVMTxHash,
}

export default AvalancheUtils