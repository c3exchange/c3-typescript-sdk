import { login, getC3SDK, getFunder } from "../../utils/utils";

// one of: "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const EVM_CHAIN_NAME = "arbitrum";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "SOL";
const AMOUNT = "1";

const FUNDER_SOLANA_MNEMONIC = "MNEMONIC HERE";

async function depositFromSolanaIntoEVMAccount(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the EVM account
  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, EVM_MNEMONIC, EVM_CHAIN_NAME);

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
