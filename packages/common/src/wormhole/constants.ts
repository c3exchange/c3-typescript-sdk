import type { ChainContracts, ChainName, ChainId } from "@certusone/wormhole-sdk";
import {
    CONTRACTS,
    CHAINS,
    CHAIN_ID_ALGORAND,
    CHAIN_ID_ETH,
    CHAIN_ID_POLYGON,
    CHAIN_ID_FANTOM,
    CHAIN_ID_BSC,
    CHAIN_ID_AVAX,
    CHAIN_ID_SOLANA,
    CHAIN_ID_ARBITRUM,
    CHAIN_ID_ARBITRUM_SEPOLIA,
    CHAIN_ID_SEPOLIA,
    toChainName,
    toChainId,
    isEVMChain,
    assertChain,
    assertEVMChain,
    coalesceChainName,
} from "@certusone/wormhole-sdk/lib/cjs/utils/consts";
import { WormholeEnvironment, WormholeNetwork, XContractAddress } from "./types";
import { SupportedChainName } from "../chains";

const isChainName = (s:string): s is ChainName => s in CHAINS;
const isChainId = (id:number): id is ChainId => Object.values(CHAINS).includes(id as ChainId)

const getWormholeContractsByNetwork = (network : WormholeNetwork): WormholeEnvironment =>{
    const contracts: ChainContracts = CONTRACTS[network];
    return {
        WormholeNetwork : network,
        Contracts : contracts
    }
}

const getChainNameByChainId = (chainId: ChainId): ChainName => {
    for (const chain of Object.keys(CHAINS) as Array<ChainName>) {
        if (CHAINS[chain] === chainId) return chain
    }

    throw new Error(`Invalid chainId: "${chainId}"`)
}

const WORMHOLE_RPC_HOSTS: Record<WormholeNetwork, string[]> = {
    MAINNET: [
        "https://api.wormholescan.io",
        "https://wormhole.inotel.ro",
        "https://wormhole-v2-mainnet-api.mcf.rocks",
        "https://wormhole-v2-mainnet-api.chainlayer.network",
        "https://wormhole-v2-mainnet-api.staking.fund",
        "https://wormhole-v2-mainnet.01node.com",
    ],
    DEVNET: [
        "http://localhost:7071",
    ],
    TESTNET: [
        "https://api.testnet.wormholescan.io",
    ],
}

const EthereumChainName = toChainName(CHAIN_ID_ETH) as "ethereum"
const AlgorandChainName = toChainName(CHAIN_ID_ALGORAND) as "algorand"
const AvalancheChainName = toChainName(CHAIN_ID_AVAX) as "avalanche"
const SolanaChainName = toChainName(CHAIN_ID_SOLANA) as "solana"
const PolygonChainName = toChainName(CHAIN_ID_POLYGON) as "polygon"
const FantomChainName = toChainName(CHAIN_ID_FANTOM) as "fantom"
const BscChainName = toChainName(CHAIN_ID_BSC) as "bsc"
const ArbitrumChainName = toChainName(CHAIN_ID_ARBITRUM) as "arbitrum"
const ArbitrumSepoliaChainName = toChainName(CHAIN_ID_ARBITRUM_SEPOLIA) as "arbitrum_sepolia"
const SepoliaChainName = toChainName(CHAIN_ID_SEPOLIA) as "sepolia"

type WrappedAssetMap = Record<Exclude<SupportedChainName, "algorand">, XContractAddress>;

const createWrappedAssetMap = (network: WormholeNetwork): WrappedAssetMap =>{
    switch(network){
        case "MAINNET":
            return {
                solana: { chain: SolanaChainName, tokenAddress: "So11111111111111111111111111111111111111112" },
                ethereum: { chain: EthereumChainName, tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
                avalanche: { chain: AvalancheChainName, tokenAddress: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7" },
                arbitrum: { chain: ArbitrumChainName, tokenAddress: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1" },
                arbitrum_sepolia: { chain: ArbitrumSepoliaChainName, tokenAddress: "" },
                bsc: { chain: BscChainName, tokenAddress: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c" },
                sepolia: { chain: SepoliaChainName, tokenAddress: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9" },
            }
            // addEntry(wrappedCurrencyMap,BscChainName,"0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
            // addEntry(wrappedCurrencyMap,PolygonChainName,"0x7ceb23fd6bc0add59e62ac25578270cff1b9f619");
            // addEntry(wrappedCurrencyMap,FantomChainName,"0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83");
        case "TESTNET":
            return {
                solana: { chain: SolanaChainName, tokenAddress: "So11111111111111111111111111111111111111112" },
                ethereum: { chain: EthereumChainName, tokenAddress: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6" },
                avalanche: { chain: AvalancheChainName, tokenAddress: "0x9c3c9283d3e44854697cd22d3faa240cfb032889" },
                arbitrum: { chain: ArbitrumChainName, tokenAddress: "" },
                arbitrum_sepolia: { chain: ArbitrumSepoliaChainName, tokenAddress: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" },
                bsc: { chain: BscChainName, tokenAddress: "0xae13d989dac2f0debff460ac112a837c89baa7cd" },
                sepolia: { chain: SepoliaChainName, tokenAddress: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9" },
            }
            // addEntry(wrappedCurrencyMap,BscChainName,"0xae13d989dac2f0debff460ac112a837c89baa7cd")
            // addEntry(wrappedCurrencyMap,PolygonChainName,"0x9c3c9283d3e44854697cd22d3faa240cfb032889")
            // addEntry(wrappedCurrencyMap,FantomChainName,"0xf1277d1Ed8AD466beddF92ef448A132661956621")
        case "DEVNET":
            return {
                solana: { chain: SolanaChainName, tokenAddress: "So11111111111111111111111111111111111111112" },
                ethereum: { chain: EthereumChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
                avalanche: { chain: AvalancheChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
                arbitrum: { chain: ArbitrumChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
                arbitrum_sepolia: { chain: ArbitrumSepoliaChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
                bsc: { chain: BscChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
                sepolia: { chain: BscChainName, tokenAddress: "0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E" },
            }
        default:
            throw new Error(`Unsupported network: ${network}`)
    }
}

export type {
    WrappedAssetMap,
}

export {
    CHAIN_ID_ETH,
    CHAIN_ID_ALGORAND,
    CHAIN_ID_AVAX,
    CHAIN_ID_SOLANA,
    CHAIN_ID_ARBITRUM,
    CHAIN_ID_ARBITRUM_SEPOLIA,
    CHAIN_ID_BSC,
    CHAIN_ID_SEPOLIA,
    CHAINS,
    CONTRACTS,
    WORMHOLE_RPC_HOSTS,
    AlgorandChainName,
    EthereumChainName,
    AvalancheChainName,
    SolanaChainName,
    PolygonChainName,
    FantomChainName,
    BscChainName,
    ArbitrumChainName,
    ArbitrumSepoliaChainName,
    SepoliaChainName,
    getChainNameByChainId,
    isChainId,
    isChainName,
    isEVMChain,
    toChainId,
    toChainName,
    getWormholeContractsByNetwork,
    assertChain,
    assertEVMChain,
    createWrappedAssetMap,
    coalesceChainName,
}
