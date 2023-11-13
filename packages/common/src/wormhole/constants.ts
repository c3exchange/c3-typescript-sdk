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
    toChainName,
    toChainId,
    isEVMChain,
    assertChain,
    assertEVMChain,
    coalesceChainName,
} from "@certusone/wormhole-sdk/lib/cjs/utils/consts";
import { WormholeEnvironment, WormholeNetwork, XContractAddress } from "./types";

const isChainName = (s:string)=> s in CHAINS;
const isChainId = (id:number) => id in Object.values(CHAINS)

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
        "https://wormhole-v2-mainnet-api.certus.one",
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
        "https://wormhole-v2-testnet-api.certus.one",
    ],
}

const EthereumChainName: ChainName = toChainName(CHAIN_ID_ETH);
const AlgorandChainName: ChainName = toChainName(CHAIN_ID_ALGORAND);
const AvalancheChainName: ChainName = toChainName(CHAIN_ID_AVAX);
const SolanaChainName: ChainName = toChainName(CHAIN_ID_SOLANA);
const PolygonChainName: ChainName = toChainName(CHAIN_ID_POLYGON);
const FantomChainName: ChainName = toChainName(CHAIN_ID_FANTOM);
const BscChainName: ChainName = toChainName(CHAIN_ID_BSC);

const createWrappedAssetMap = (network: WormholeNetwork) : Map<ChainName, XContractAddress> =>{
    const wrappedCurrencyMap : Map<ChainName, XContractAddress> =new Map<ChainName, XContractAddress>();
    const addEntry = (map :Map<ChainName, XContractAddress>,chainName :ChainName,address :string) => {
        const xAddress :XContractAddress ={chain: chainName,tokenAddress: address}
        map.set(chainName,xAddress);
    }

    switch(network){
        case "MAINNET":
            addEntry(wrappedCurrencyMap,EthereumChainName,"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
            addEntry(wrappedCurrencyMap,AvalancheChainName,"0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7");
            addEntry(wrappedCurrencyMap,BscChainName,"0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
            addEntry(wrappedCurrencyMap,PolygonChainName,"0x7ceb23fd6bc0add59e62ac25578270cff1b9f619");
            addEntry(wrappedCurrencyMap,FantomChainName,"0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83");
            break
        case "TESTNET":
            addEntry(wrappedCurrencyMap,AvalancheChainName,"0xd00ae08403b9bbb9124bb305c09058e32c39a48c")
            addEntry(wrappedCurrencyMap,BscChainName,"0xae13d989dac2f0debff460ac112a837c89baa7cd")
            addEntry(wrappedCurrencyMap,EthereumChainName,"0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6")
            addEntry(wrappedCurrencyMap,PolygonChainName,"0x9c3c9283d3e44854697cd22d3faa240cfb032889")
            addEntry(wrappedCurrencyMap,FantomChainName,"0xf1277d1Ed8AD466beddF92ef448A132661956621")
            break
        case "DEVNET":
            addEntry(wrappedCurrencyMap,AvalancheChainName,"0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E")
            addEntry(wrappedCurrencyMap,BscChainName,"0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E")
            addEntry(wrappedCurrencyMap,EthereumChainName,"0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E")
            addEntry(wrappedCurrencyMap,PolygonChainName,"0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E")
            addEntry(wrappedCurrencyMap,FantomChainName,"0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E")
    }
    return wrappedCurrencyMap;
}

export {
    CHAIN_ID_ETH,
    CHAIN_ID_ALGORAND,
    CHAIN_ID_AVAX,
    CHAIN_ID_SOLANA,
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
