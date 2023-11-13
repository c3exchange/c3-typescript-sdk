
import type { ChainContracts, ChainName, EVMChainName, ChainId } from "@certusone/wormhole-sdk";
import type { UserAddress } from "../interfaces/types";

const WORMHOLE_NETWORKS = ["MAINNET", "DEVNET", "TESTNET"] as const;
type WormholeNetwork = typeof WORMHOLE_NETWORKS[number];
type ContractAddress = string

interface XAddress {
    chainId: ChainId
    address: UserAddress
}

interface XRecipientAddress {
    chain: ChainName
    address: UserAddress
}
interface XContractAddress {
    chain: ChainName
    tokenAddress: ContractAddress
}
type XRecipientId = XContractAddress
type XAssetId = XContractAddress

interface WormholeEnvironment {
    WormholeNetwork: WormholeNetwork;
    Contracts: ChainContracts;
}

interface CctpHubInfo {
    contractAddress: ContractAddress;
    chain: ChainName;
}

export type {
    ChainId,
    ChainName,
    EVMChainName,
    WormholeEnvironment,
    WormholeNetwork,
    XAddress,
    XRecipientId,
    XAssetId,
    XContractAddress,
    ContractAddress,
    XRecipientAddress,
    CctpHubInfo
}

export {
    WORMHOLE_NETWORKS,
}