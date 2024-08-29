import {
  C3SDK,
  createAlgorandFunderFromMnemonic,
  createAlgorandOwnerFromMnemonic,
  createEVMFunderFromMnemonic,
  createEVMOwnerFromMnemonic,
  createSolanaFunderFromMnemonic,
  createSolanaOwnerFromMnemonic,
} from "@c3exchange/sdk";
import { ethers } from "ethers";
import { Connection } from "@solana/web3.js";

// Mnemonics
const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";
const Solana_MNEMONIC = "YOUR MNEMONIC HERE";

// C3SDK
export const getC3SDK = () =>
  new C3SDK({
    c3_api: {
      server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
      wormhole_network: "TESTNET", // "MAINNET" Mainnet network
    },
    algorand_node: {
      server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
    },
  });

// Solana provider
const Solana_PROVIDER_URL = "https://api.devnet.solana.com"; // "https://api.mainnet-beta.solana.com" Mainnet provider
const Solana_CONNECTION = new Connection(Solana_PROVIDER_URL);

// EVM providers
const evmChains: string[] = [
  "ethereum",
  "sepolia",
  "avalanche",
  "arbitrum",
  "bsc",
  "optimism",
  "base",
  "polygon",
];

const evmProviders: { [key: string]: string } = {
  ethereum: "goerli", // "mainnet" Mainnet provider
  sepolia: "sepolia",
  avalanche: "https://api.avax-test.network/ext/bc/C/rpc", // "https://api.avax.network/ext/bc/C/rpc" Mainnet RPC
  arbitrum: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public", // "https://endpoints.omniatech.io/v1/arbitrum/one/public" Mainnet RPC
  bsc: "https://bsc-testnet.publicnode.com", // "https://bsc.publicnode.com" Mainnet RPC
  optimism: "https://optimism-sepolia.blockpi.network/v1/rpc/public", // "https://optimism-rpc.publicnode.com" Mainnet RPC
  base: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public", // "https://base-rpc.publicnode.com" Mainnet RPC
  polygon: "https://polygon-amoy.drpc.org", // "https://polygon.llamarpc.com" Mainnet RPC
};

const evmProvider = (chainName: string) => {
  if (["ethereum", "sepolia"].includes(chainName)) {
    return new ethers.providers.InfuraProvider(evmProviders[chainName]);
  } else if (["avalanche", "arbitrum", "bsc", "optimism", "base", "polygon"].includes(chainName)) {
    return new ethers.providers.JsonRpcProvider(evmProviders[chainName]);
  } else {
    throw new Error("Invalid chain name");
  }
};

export const login = async (c3sdk: C3SDK, chainName: string) => {
  if (chainName === "algorand") {
    const owner = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);
    return await c3sdk.login(owner);
  } else if (chainName === "solana") {
    const owner = createSolanaOwnerFromMnemonic(
      Solana_MNEMONIC,
      Solana_CONNECTION
    );
    return await c3sdk.login(owner);
  } else if (evmChains.includes(chainName)) {
    const provider = evmProvider(chainName);
    const owner = createEVMOwnerFromMnemonic(EVM_MNEMONIC, provider);
    return await c3sdk.login(owner);
  } else {
    throw new Error("Invalid chain name");
  }
};

export const getFunder = (chainName: string, funderMnemonic: string) => {
  if (chainName === "algorand") {
    return createAlgorandFunderFromMnemonic(funderMnemonic);
  } else if (chainName === "solana") {
    return createSolanaFunderFromMnemonic(funderMnemonic, Solana_CONNECTION);
  } else if (evmChains.includes(chainName)) {
    const provider = evmProvider(chainName);
    if (provider === null) return;
    return createEVMFunderFromMnemonic(funderMnemonic, provider);
  } else {
    throw new Error("Invalid chain name");
  }
};

export const getProviderOrConnection = (chainName: string) => {
  if (chainName === "solana") {
    return Solana_CONNECTION;
  } else if (evmChains.includes(chainName)) {
    return evmProvider(chainName);
  } else {
    throw new Error("Invalid chain name");
  }
};
