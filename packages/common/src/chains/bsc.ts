import { SignMethod, UserAddress } from "../interfaces"
import { decodeEthereumAddress } from "../utils"
import { CHAIN_ID_BSC } from "../wormhole"
import { getEthereumAddressByPublicKey, getEthereumDataPrefix, isValidEVMTxHash, isValidEthereumAddress, toValidEthereumAddress, verifyEthereumSignature } from "./evm"
import { ChainTools } from "./type"

const BscUtils: ChainTools = {
    getPublicKey: (address: UserAddress) => decodeEthereumAddress(address),
    getDataPrefix: (dataLength: number) => getEthereumDataPrefix(dataLength),
    isValidAddress: isValidEthereumAddress,
    toValidAddress: toValidEthereumAddress,
    getAddressByPublicKey: getEthereumAddressByPublicKey,
    getXAddress: (address: UserAddress) => ({ chainId: CHAIN_ID_BSC, address }),
    getXContractAddress: (tokenAddress: string) => ({ chain: "bsc", tokenAddress }),
    getSigningMethod: () => SignMethod.SIGNING_METHOD_ECDSA,
    verifySignature: verifyEthereumSignature,
    isValidTxHash: isValidEVMTxHash,
}
export default BscUtils
