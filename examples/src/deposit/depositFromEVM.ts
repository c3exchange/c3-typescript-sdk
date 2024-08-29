import { login, getC3SDK } from "../utils/utils";

// chainName has to be one of:
// "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const CHAIN_NAME = "ethereum";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "USDC";
const AMOUNT = "1000";

async function depositEVM(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, EVM_MNEMONIC, CHAIN_NAME);

  console.log(`Depositing ${AMOUNT} ${TOKEN}`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    chainName: CHAIN_NAME,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositEVM().catch((error) => console.log("Error in execution.", error));
