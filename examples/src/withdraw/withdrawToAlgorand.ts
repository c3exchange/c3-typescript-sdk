import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "algorand";
const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "ALGO";
const AMOUNT = "1.00";

async function withdrawAlgorand(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Algorand_MNEMONIC, CHAIN_NAME);

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: CHAIN_NAME,
    maxFees: "0.001", // Check the fees of the blockchain of choice
  });

  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

withdrawAlgorand().catch((error) => console.log("Error in execution.", error));
