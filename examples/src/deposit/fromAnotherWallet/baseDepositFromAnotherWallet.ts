import { ChainName } from "@certusone/wormhole-sdk";
import { login, getC3SDK, getFunder } from "../../utils/utils";

// Mnemonic of the account to deposit into
// can be from any wallet of the chains Algorand, Solana or any EVM
const ACCOUNT_WALLET_MNEMONIC = "YOUR MNEMONIC HERE";
const ACCOUNT_CHAIN_NAME = "CHAIN NAME HERE";

// Mnemonic of the funder
// can be from any wallet of the chains Algorand, Solana or any EVM
const FUNDER_MNEMONIC = "MNEMONIC HERE";
const FUNDER_CHAIN_NAME: ChainName = "ethereum"; // "CHAIN NAME HERE";

const TOKEN = "TOKEN SYMBOL HERE"; // depending on the chain, example: "USDC", "SOL", "ALGO"
const AMOUNT = "1";

async function depositFromAnotherWallet(): Promise<void> {
  const c3sdk = getC3SDK();

  // Login to the Solana account
  console.log("Authenticating account");
  const accountSdk = await login(
    c3sdk,
    ACCOUNT_WALLET_MNEMONIC,
    ACCOUNT_CHAIN_NAME
  );

  // Get the funder for Arbitrum
  const funder = getFunder(FUNDER_CHAIN_NAME, FUNDER_MNEMONIC);

  console.log(
    `Depositing ${AMOUNT} ${TOKEN} from ${FUNDER_CHAIN_NAME} into ${ACCOUNT_CHAIN_NAME} Account`
  );
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    chainName: FUNDER_CHAIN_NAME,
    funder: funder,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);
}

depositFromAnotherWallet().catch((error) =>
  console.log("Error in execution.", error)
);
