import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "ALGO";
const REDEEM_AMOUNT = "1.00";

// Redeem operations
async function redeemAssets(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  console.log(`Redeeming ${REDEEM_AMOUNT} ${TOKEN}`);
  const redeemOperationId = await accountSdk.redeem(TOKEN, REDEEM_AMOUNT);
  console.log(`Redeem Complete: ${redeemOperationId}`);
}

redeemAssets().catch((error) => console.log("Error in execution.", error));
