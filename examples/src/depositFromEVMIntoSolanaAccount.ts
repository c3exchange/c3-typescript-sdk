import {
  C3SDK,
  createEVMFunderFromMnemonic,
  createSolanaOwnerFromMnemonic,
  createSolanaOwnerFromPrivateKey,
  WormholeWithdrawResult,
} from "@c3exchange/sdk";
import { Connection } from "@solana/web3.js";
import { ethers } from "ethers";
import { base58 } from "ethers/lib/utils";

const TOKEN_USDC = "USDC";
const AMOUNT_USDC = "1000";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET", // MAINNET
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});

const SOLANA_PRIVATE_KEY = "private key here";
const SOLANA_MNEMONIC = "mnemonic here";
const solanaProviderUrl = "https://api.devnet.solana.com"; // "https://api.mainnet-beta.solana.com" Mainnet provider
const solanaConnection = new Connection(solanaProviderUrl);

const ARBITRUM_MNEMONIC = "mnemonic here";
const arbitrumProviderUrl =
  "https://arbitrum-sepolia.blockpi.network/v1/rpc/public"; // "https://endpoints.omniatech.io/v1/arbitrum/one/public" Mainnet RPC
const evmProvider = new ethers.providers.JsonRpcProvider(arbitrumProviderUrl);

const ARBITRUM_ADDRESS = "destination address here";

async function depositFromEVMIntoSolanaAccount(): Promise<void> {
  const pkDecoded = base58.decode(SOLANA_PRIVATE_KEY);
  const signerSolana = createSolanaOwnerFromPrivateKey(
    pkDecoded,
    solanaConnection
  );
  // const signerSolana = createSolanaOwnerFromMnemonic(
  //   SOLANA_MNEMONIC,
  //   connection
  // );

  const funderEVM = createEVMFunderFromMnemonic(ARBITRUM_MNEMONIC, evmProvider);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signerSolana);

  console.log(`Depositing ${AMOUNT_USDC} ${TOKEN_USDC}`);

  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN_USDC,
    chainName: "arbitrum",
    amount: AMOUNT_USDC,
    funder: funderEVM,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);

  // get balance
  const balance = await accountSdk.getBalance();

  console.log(`Withdrawing ${AMOUNT_USDC} ${TOKEN_USDC}`);
  const withdrawal = (await accountSdk.withdraw({
    instrumentId: TOKEN_USDC,
    amount: AMOUNT_USDC,
    destinationAddress: ARBITRUM_ADDRESS,
    destinationChainName: "arbitrum",
    maxFees: "1.5", // Check the fees of the blockchain of choice
  })) as WormholeWithdrawResult;

  console.log(
    `Withdrawal Complete: ${await withdrawal.isTransferCompleted(evmProvider)}`
  );
}

depositFromEVMIntoSolanaAccount().catch((error) =>
  console.log("Error in execution.", error)
);
