import { login, getC3SDK, getFunder } from "../utils/utils";

const TOKEN = "USDC";
const AMOUNT = "1000";

const FUNDER_ARBITRUM_MNEMONIC = "MNEMONIC HERE";

async function depositFromEVMIntoSolanaAccount(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the Solana account
  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, "solana");

  // Get the funder for Arbitrum
  const funderEVM = getFunder("arbitrum", FUNDER_ARBITRUM_MNEMONIC);

  console.log(`Depositing ${AMOUNT} ${TOKEN} from EVM into Solana Account`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    chainName: "arbitrum",
    funder: funderEVM,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositFromEVMIntoSolanaAccount().catch((error) =>
  console.log("Error in execution.", error)
);
