import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";

const TOKEN = "ALGO";
const LEND_AMOUNT = "1.00";

// Lend operations
async function lendAssets(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, CHAIN_NAME);

  console.log(`Lending ${LEND_AMOUNT} ${TOKEN}`);
  const lendOperationId = await accountSdk.lend(TOKEN, LEND_AMOUNT);
  console.log(`Lend Complete: ${lendOperationId}`);
}

lendAssets().catch((error) => console.log("Error in execution.", error));
