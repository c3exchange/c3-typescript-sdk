import { login, getC3SDK } from "../../utils/utils";

const CHAIN_NAME = "arbitrum";
const Arbitrum_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "USDC";
const AMOUNT = "1000";

async function depositArbitrum(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Arbitrum_MNEMONIC, CHAIN_NAME);

  console.log(`Depositing ${AMOUNT} ${TOKEN}`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    chainName: CHAIN_NAME,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositArbitrum().catch((error) => console.log("Error in execution.", error));
