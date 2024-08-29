import { login, getC3SDK, getFunder } from "../utils/utils";

const TOKEN = "SOL";
const AMOUNT = "1";

const FUNDER_SOLANA_MNEMONIC = "MNEMONIC HERE";

async function depositFromSolanaIntoEVMAccount(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the EVM account
  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, "ethereum");

  // Get the funder for Solana
  const funderSolana = getFunder("solana", FUNDER_SOLANA_MNEMONIC);

  console.log(`Depositing ${AMOUNT} ${TOKEN} from Solana into EVM Account`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    chainName: "solana",
    funder: funderSolana,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositFromSolanaIntoEVMAccount().catch((error) =>
  console.log("Error in execution.", error)
);
