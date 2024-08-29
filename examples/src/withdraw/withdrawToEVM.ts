import { login, getC3SDK } from "../utils/utils";

// chainName has to be one of:
// "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const CHAIN_NAME = "ethereum";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "USDC";
const AMOUNT = "1000";

async function withdrawEVM(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, EVM_MNEMONIC, CHAIN_NAME);

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: CHAIN_NAME,
    maxFees: "16", // Check the fees of the blockchain of choice
  });

  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

withdrawEVM().catch((error) => console.log("Error in execution.", error));
