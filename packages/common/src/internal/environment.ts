import { WormholeNetwork } from "../wormhole"


export type AlgorandServerConnectionConfig = {
    token: string,
    server: string,
    port: number | string
}


export type ExecutionEnvironmentConfig = {
    algod: AlgorandServerConnectionConfig,
    kmd?: AlgorandServerConnectionConfig,
    wormholeNetwork : WormholeNetwork
}

export type AccountSigningData = {
    mnemonic: string
} | {
    secretKey: Uint8Array
}

export type Mnemonic = string
export type TestExecutionEnvironmentConfig = ExecutionEnvironmentConfig & {
    masterAccount: Mnemonic
}
