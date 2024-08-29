import { WormholeWithdrawResult } from "@c3exchange/sdk";
import { login, getC3SDK, getProviderOrConnection } from "../utils/utils";
import { Connection } from "@solana/web3.js";

// one of: "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const EVM_CHAIN_NAME = "arbitrum";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "SOL";
const AMOUNT = "1";

const SOLANA_ADDRESS = "DESTINATION ADDRESS HERE";

async function withdrawToSolanaFromEVMAccount(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the EVM account
  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, EVM_MNEMONIC, EVM_CHAIN_NAME);

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = (await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: SOLANA_ADDRESS,
    destinationChainName: "solana",
    maxFees: "0.004", // Check the fees of the blockchain of choice
  })) as WormholeWithdrawResult;

  // Get the provider for Solana
  const solanaConnection = getProviderOrConnection("solana");

  console.log(
    `Withdrawal Complete: ${await withdrawal.isTransferCompleted(
      solanaConnection as Connection
    )}`
  );
}

withdrawToSolanaFromEVMAccount().catch((error) =>
  console.log("Error in execution.", error)
);
