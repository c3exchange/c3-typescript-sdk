import { WormholeNetwork } from "@c3exchange/common"

export interface UrlConfig {
    server: string
    port?: number
}

export interface AlgorandUrlConfig extends UrlConfig {
  token?: string
}

export interface C3SDKConfig {
    algorand_node: AlgorandUrlConfig
    c3_api: UrlConfig & {
        wormhole_network: WormholeNetwork
    }
}

export const defaultConfig: C3SDKConfig = {
    algorand_node: {
        server: "https://node.algoexplorerapi.io"
    },
    c3_api: {
        server: "https://api.c3.io",
        wormhole_network: "MAINNET"
    }
}