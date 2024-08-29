import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "arbitrum";

const TOKEN = "USDC";
const AMOUNT = "1000";

async function withdrawArbitrum(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, CHAIN_NAME);

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: CHAIN_NAME,
    maxFees: "1.5", // Check the fees of the blockchain of choice
  });

  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

withdrawArbitrum().catch((error) => console.log("Error in execution.", error));
