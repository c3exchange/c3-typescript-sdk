import { WormholeWithdrawResult } from "@c3exchange/sdk";
import { login, getC3SDK, getProviderOrConnection } from "../utils/utils";
import { JsonRpcProvider } from "@ethersproject/providers";

const Solana_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "USDC";
const AMOUNT = "1000";

// one of: "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const EVM_CHAIN_NAME = "arbitrum";
const EVM_ADDRESS = "DESTINATION ADDRESS HERE";

async function withdrawToEVMFromSolanaAccount(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the Solana account
  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Solana_MNEMONIC, "solana");

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = (await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: EVM_ADDRESS,
    destinationChainName: EVM_CHAIN_NAME,
    maxFees: "1.5", // Check the fees of the blockchain of choice
  })) as WormholeWithdrawResult;

  // Get the provider for Arbitrum
  const evmProvider = getProviderOrConnection("arbitrum");

  console.log(
    `Withdrawal Complete: ${await withdrawal.isTransferCompleted(
      evmProvider as JsonRpcProvider
    )}`
  );
}

withdrawToEVMFromSolanaAccount().catch((error) =>
  console.log("Error in execution.", error)
);
