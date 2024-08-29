import { WormholeWithdrawResult } from "@c3exchange/sdk";
import { login, getC3SDK, getProviderOrConnection } from "../../utils/utils";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ChainName } from "@certusone/wormhole-sdk";

// Mnemonic of the account to deposit into
// can be from any wallet of the chains Algorand, Solana or any EVM
const ACCOUNT_WALLET_MNEMONIC = "YOUR MNEMONIC HERE";
const ACCOUNT_CHAIN_NAME = "CHAIN NAME HERE";

// Address of the receiver
// can be from any wallet of the chains Algorand, Solana or any EVM
const DESTINATION_ADDRESS = "DESTINATION ADDRESS HERE";
const DESTINATION_CHAIN_NAME: ChainName = "ethereum"; // "CHAIN NAME HERE";

const TOKEN = "TOKEN SYMBOL HERE"; // depending on the chain, example: "USDC", "SOL", "ALGO"
const AMOUNT = "1";

async function withdrawToAnotherWallet(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the Solana account
  console.log("Authenticating account");
  const accountSdk = await login(
    c3sdk,
    ACCOUNT_WALLET_MNEMONIC,
    ACCOUNT_CHAIN_NAME
  );

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: DESTINATION_ADDRESS,
    destinationChainName: DESTINATION_CHAIN_NAME,
    maxFees: "1", // Check the fees of the asset and blockchain of choice
  });

  if (DESTINATION_CHAIN_NAME === "algorand") {
    console.log(
      `Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`
    );
  } else {
    // Get the provider for Arbitrum
    const provider = getProviderOrConnection("arbitrum");
    console.log(
      `Withdrawal Complete: ${await (
        withdrawal as WormholeWithdrawResult
      ).isTransferCompleted(provider)}`
    );
  }
}

withdrawToAnotherWallet().catch((error) =>
  console.log("Error in execution.", error)
);
