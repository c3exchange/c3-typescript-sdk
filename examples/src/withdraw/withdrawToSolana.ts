import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "solana";
const Solana_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "SOL";
const AMOUNT = "1";

async function withdrawSolana(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Solana_MNEMONIC, CHAIN_NAME);

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: CHAIN_NAME,
    maxFees: "0.004", // Check the fees of the blockchain of choice
  });

  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

withdrawSolana().catch((error) => console.log("Error in execution.", error));
