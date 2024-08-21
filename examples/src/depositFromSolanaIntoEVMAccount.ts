import {
  C3SDK,
  createEVMOwnerFromMnemonic,
  createSolanaFunderFromPrivateKey,
  createSolanaFunderFromMnemonic,
  WormholeWithdrawResult,
} from "@c3exchange/sdk";
import { Connection } from "@solana/web3.js";
import { ethers } from "ethers";
import { base58 } from "ethers/lib/utils";

const TOKEN_SOL = "SOL";
const AMOUNT_SOL = "1";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET", // MAINNET
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});

const ARBITRUM_MNEMONIC = "mnemonic here";
const arbitrumProviderUrl =
  "https://arbitrum-sepolia.blockpi.network/v1/rpc/public"; // "https://endpoints.omniatech.io/v1/arbitrum/one/public" Mainnet RPC
const evmProvider = new ethers.providers.JsonRpcProvider(arbitrumProviderUrl);

const SOLANA_PRIVATE_KEY = "private key here";
const SOLANA_MNEMONIC = "mnemonic here";
const solanaProviderUrl = "https://api.devnet.solana.com"; // "https://api.mainnet-beta.solana.com" Mainnet provider
const solanaConnection = new Connection(solanaProviderUrl);

const SOLANA_ADDRESS = "destination address here";

async function depositFromSolanaIntoEVMAccount(): Promise<void> {
  const signerEVM = createEVMOwnerFromMnemonic(ARBITRUM_MNEMONIC, evmProvider);

  const pkDecoded = base58.decode(SOLANA_PRIVATE_KEY);
  const funderSolana = createSolanaFunderFromPrivateKey(
    pkDecoded,
    solanaConnection
  );
  // const funderSolana = createSolanaFunderFromMnemonic(
  //   SOLANA_MNEMONIC,
  //   connection
  // );

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signerEVM);

  console.log(`Depositing ${AMOUNT_SOL} ${TOKEN_SOL}`);

  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN_SOL,
    chainName: "solana",
    amount: AMOUNT_SOL,
    funder: funderSolana,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);

  // get balance
  const balance = await accountSdk.getBalance();

  console.log(`Withdrawing ${AMOUNT_SOL} ${TOKEN_SOL}`);
  const withdrawal = (await accountSdk.withdraw({
    instrumentId: TOKEN_SOL,
    amount: AMOUNT_SOL,
    destinationAddress: SOLANA_ADDRESS,
    destinationChainName: "solana",
    maxFees: "0.004", // Check the fees of the blockchain of choice
  })) as WormholeWithdrawResult;

  console.log(
    `Withdrawal Complete: ${await withdrawal.isTransferCompleted(
      solanaConnection
    )}`
  );
}

depositFromSolanaIntoEVMAccount().catch((error) =>
  console.log("Error in execution.", error)
);
