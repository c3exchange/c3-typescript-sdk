import { AppId, AssetId, Instrument } from "../interfaces";
import { ChainId, ChainName, WormholeEnvironment, WormholeNetwork, XAssetId, XContractAddress } from "./types";
import { AlgorandChainName, CHAIN_ID_AVAX, WrappedAssetMap, createWrappedAssetMap, toChainId, toChainName } from "./constants"

export const SUPPORTED_MAINNET_CCTP_CHAINS = [
    'arbitrum',
    'ethereum',
    // 'optimism',
    // We should receive USDC AVAX via Wormhole bridge.
    'avalanche',
] as const

export const SUPPORTED_TESTNET_CCTP_CHAINS = [
    ...SUPPORTED_MAINNET_CCTP_CHAINS,
    'sepolia',
    'arbitrum_sepolia'
] as const

export type CCTPChain = typeof SUPPORTED_TESTNET_CCTP_CHAINS[number]

export class WormholeDictionary {
    private tokenBridgeAppId: bigint
    private coreAppId: bigint
    private readonly wNatives: WrappedAssetMap

    constructor(private wormholeEnvironment: WormholeEnvironment) {
        this.wNatives = createWrappedAssetMap(this.wormholeEnvironment.WormholeNetwork)
        this.coreAppId = BigInt(this.wormholeEnvironment.Contracts[AlgorandChainName].core ?? '0')
        this.tokenBridgeAppId = BigInt(this.wormholeEnvironment.Contracts[AlgorandChainName].token_bridge ?? '0')
    }

    public getCoreAppId(): AppId { return Number.parseInt(this.coreAppId.toString()) }
    public getTokenBridgeAppId(): AppId { return Number.parseInt(this.tokenBridgeAppId.toString()) }

    public getTokenBridgeContractAddress(chain: ChainName): XContractAddress {
        const ct = this.wormholeEnvironment.Contracts[chain].token_bridge;
        if (!ct) {
            throw new Error("Specified chain and network does not have a valid token bridge address.")
        }
        return {
            tokenAddress: ct,
            chain: chain
        }
    }

    public getCoreContractAddress(chain: ChainName): XContractAddress {
        const ct = this.wormholeEnvironment.Contracts[chain].core
        if (!ct) {
            throw new Error("Specified chain and network does not have a valid core address.")
        }
        return {
            tokenAddress: ct,
            chain: chain
        }
    }

    public getAvaxUsdcAsaId(): AssetId {
        const AVAX_USDC_ASAID = {
            MAINNET: 1007352535,
            TESTNET: 166458877,
            DEVNET: 0
        }

        return AVAX_USDC_ASAID[this.wormholeEnvironment.WormholeNetwork]
    }

    public getCircleContractAddress(chain: ChainName): {
        messageTransmitter: string, tokenMinter: string, tokenMessenger: string } {
        /**
         * Object containing the messageTransmitter, tokenMinter, and tokenMessenger values for each network.
         * Values can be found at https://developers.circle.com/stablecoin/docs/cctp-protocol-contract.
         */
        const CIRCLE_MESSAGE_TRANSMITTER = {
            MAINNET: {
                arbitrum: {
                    messageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
                    tokenMinter: "0xE7Ed1fa7f45D05C508232aa32649D89b73b8bA48",
                    tokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A"
                },
                avalanche: {
                    messageTransmitter: "0x8186359af5f57fbb40c6b14a588d2a59c0c29880",
                    tokenMinter: "0x420f5035fd5dc62a167e7e7f08b604335ae272b8",
                    tokenMessenger: "0x6b25532e1060ce10cc3b0a99e5683b91bfde6982"
                },
                ethereum: {
                    messageTransmitter: "0x0a992d191deec32afe36203ad87d7d289a738f81",
                    tokenMinter: "0xc4922d64a24675e16e1586e3e3aa56c06fabe907",
                    tokenMessenger: "0xbd3fa81b58ba92a82136038b25adec7066af3155"
                },
                optimism: {
                    messageTransmitter: "0x4d41f22c5a0e5c74090899e5a8fb597a8842b3e8",
                    tokenMinter: "0x33E76C5C31cb928dc6FE6487AB3b2C0769B1A1e3",
                    tokenMessenger: "0x2B4069517957735bE00ceE0fadAE88a26365528f"
                },
                sepolia: {
                    messageTransmitter: "0xcafecafecafecafecafecafecafecafecafecafe",
                    tokenMinter: "0xcafecafecafecafecafecafecafecafecafecafe",
                    tokenMessenger: "0xcafecafecafecafecafecafecafecafecafecafe"
                },
                arbitrum_sepolia: {
                    messageTransmitter: "0x109bc137cb64eab7c0b1dddd1edf341467dc2d35",
                    tokenMinter: "0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a",
                    tokenMessenger: "0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352"
                }
            },
            TESTNET: {
                arbitrum: {
                    messageTransmitter: "0x109bc137cb64eab7c0b1dddd1edf341467dc2d35",
                    tokenMinter: "0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a",
                    tokenMessenger: "0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352"
                },
                avalanche: {
                    messageTransmitter: "0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79",
                    tokenMinter: "0x4ed8867f9947a5fe140c9dc1c6f207f3489f501e",
                    tokenMessenger: "0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0"
                },
                ethereum: {
                    messageTransmitter: "0x26413e8157cd32011e726065a5462e97dd4d03d9",
                    tokenMinter: "0xca6b4c00831ffb77afe22e734a6101b268b7fcbe",
                    tokenMessenger: "0xd0c3da58f55358142b8d3e06c1c30c5c6114efe8"
                },
                optimism: {
                    messageTransmitter: "0x9ff9a4da6f2157a9c82ce756f8fd7e0d75be8895",
                    tokenMinter: "0x162580c71df51638df454e9ad75f11d184ff867b",
                    tokenMessenger: "0x23a04d5935ed8bc8e3eb78db3541f0abfb001c6e"
                },
                sepolia: {
                    messageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
                    tokenMinter: "0xE997d7d2F6E065a9A93Fa2175E878Fb9081F1f0A",
                    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"
                },
                arbitrum_sepolia: {
                    messageTransmitter: "0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872",
                    tokenMinter: "0xE997d7d2F6E065a9A93Fa2175E878Fb9081F1f0A",
                    tokenMessenger: "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5"
                }
            },
            DEVNET: {
                arbitrum: {
                    messageTransmitter: "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
                avalanche: {
                    messageTransmitter: "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
                ethereum: {
                    messageTransmitter: "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
                optimism: {
                    messageTransmitter: "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
                sepolia: {
                    messageTransmitter:  "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
                arbitrum_sepolia: {
                    messageTransmitter:  "0x0000000000000000000000000000000000000000",
                    tokenMinter: "0x0000000000000000000000000000000000000000",
                    tokenMessenger: "0x0000000000000000000000000000000000000000"
                },
            }
        }
        if (!this.isValidCCTPChain(chain)) {
            throw new Error("Specified chain and network does not have a supported CCTP contract address.")
        }

        return CIRCLE_MESSAGE_TRANSMITTER[this.wormholeEnvironment.WormholeNetwork][chain]
    }

    public getWormholeCctpIntegrationContractAddress(chain: ChainName): XContractAddress {

        // This does not seem to be in any SDK yet.
        // https://github.com/wormhole-foundation/docs.wormhole.com/blob/fc9a8cb864d1e02146b5741a75d5e4783bc51732/scripts/src/config.ts#L104C1-L116C5

        const CCTP_CONTRACT_ADDRESSES = {
            MAINNET: {
                arbitrum: { cctp: "0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c" },
                avalanche: { cctp: "0x09Fb06A271faFf70A651047395AaEb6265265F13" },
                ethereum: { cctp: "0xAaDA05BD399372f0b0463744C09113c137636f6a" },
                optimism: { cctp: "0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c" },
                sepolia: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                arbitrum_sepolia: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
            },

            TESTNET: {
                arbitrum: { cctp: "0x2e8f5e00a9c5d450a72700546b89e2b70dfb00f2" },
                avalanche: { cctp: "0x58f4c17449c90665891c42e14d34aae7a26a472e" },
                ethereum: { cctp: "0x0a69146716b3a21622287efa1607424c663069a4" },
                optimism: { cctp: "0x2703483b1a5a7c577e8680de9df8be03c6f30e3c" },
                sepolia: { cctp: "0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c" },
                arbitrum_sepolia: { cctp: "0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c" },
            },

            // Those are bugs addresses!
            DEVNET: {
                arbitrum: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                avalanche: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                ethereum: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                optimism: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                sepolia: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" },
                arbitrum_sepolia: { cctp: "0xcafecafecafecafecafecafecafecafecafecafe" }
            }
        }

        if (!this.isValidCCTPChain(chain)) {
            throw new Error("Specified chain and network does not have a supported CCTP contract address.")
        }

        return {
            chain,
            tokenAddress: CCTP_CONTRACT_ADDRESSES[this.wormholeEnvironment.WormholeNetwork][chain].cctp
        }
    }

    public getUSDCTokenAddress = (chain: ChainName): XContractAddress => {
        if (!this.isValidCCTPChain(chain)) {
            throw new Error("Specified chain and network does not have a supported CCTP contract address.")
        }
        const USDC_TOKEN_ADDRESSES: Record<WormholeNetwork, Record<CCTPChain, string>> = {
            MAINNET: {
                ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                // optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
                sepolia: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe",
                arbitrum_sepolia: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe"
            },
            TESTNET: {
                ethereum: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
                avalanche: "0x5425890298aed601595a70AB815c96711a31Bc65",
                arbitrum: "0xF175520C52418dfE19C8098071a252da48Cd1C19",
                // optimism: "0xe05606174bac4A6364B31bd0eCA4bf4dD368f8C6"
                sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                arbitrum_sepolia: "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d"
            },
            DEVNET: {
                ethereum: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe",
                avalanche: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe",
                arbitrum: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe",
                // optimism: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe"
                sepolia: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe",
                arbitrum_sepolia: "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe"
            }
        }

        return { chain, tokenAddress: USDC_TOKEN_ADDRESSES[this.wormholeEnvironment.WormholeNetwork][chain] }
    }

    public getCCTPHubChainId(): ChainId {
        // TODO: ChainId AVAX MUST NOT BE HARDCODED HERE, WE MUST MOVE THIS VALUE INTO ANOTHER PLACE
        return CHAIN_ID_AVAX;
    }

    public getCCTPAvailableChains(): CCTPChain[] {
        return this.wormholeEnvironment.WormholeNetwork === "TESTNET" ? [...SUPPORTED_TESTNET_CCTP_CHAINS] : [...SUPPORTED_MAINNET_CCTP_CHAINS];
    }

    public isValidCCTPChain(chain: ChainName): chain is CCTPChain {
        return this.getCCTPAvailableChains().includes(chain as any);
    }

    public isCCTPAsset(chainId: ChainId, tokenAddress: string): boolean {
        try {
            const xContractAddress = this.getUSDCTokenAddress(toChainName(chainId))
            return xContractAddress?.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        } catch (err) {
            return false
        }
    }

    public isWrappedCurrency(asset: XAssetId) {
        const wrappedNativeTokenAddress = this.getWrappedNativeCurrencyAddress(asset.chain);
        return asset.tokenAddress.toLowerCase() === wrappedNativeTokenAddress.tokenAddress.toLowerCase();
    }

    public isWormholeAppId(appId: AppId): boolean {
        const appIdBig = BigInt(appId.toString());
        return appIdBig === this.tokenBridgeAppId || appIdBig === this.coreAppId;
    }

    public getWrappedNativeCurrencyAddress(evmChain: ChainName): XContractAddress {
        // @ts-expect-error
        const native: XContractAddress | undefined = this.wNatives[evmChain] as XContractAddress;
        if (native === undefined)
            throw new Error("Unsupported chain/network");
        return native;
    }

    public isCctpWithdraw(instrument: Instrument, destinationChain: ChainName): boolean {
        return (instrument.asaId === this.getAvaxUsdcAsaId()) && (toChainId(destinationChain) !== this.getCCTPHubChainId())
    }
}
