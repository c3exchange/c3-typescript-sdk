import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "algorand";
const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "ALGO";
const AMOUNT = "1.00";

async function depositAlgorand(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Algorand_MNEMONIC, CHAIN_NAME);

  console.log(`Depositing ${AMOUNT} ${TOKEN}`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositAlgorand().catch((error) => console.log("Error in execution.", error));
