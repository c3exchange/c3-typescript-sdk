import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const DELEGATED_ACCOUNT = "ADDRESS HERE";

async function delegateAccount(): Promise<string> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, CHAIN_NAME);

  const delegation = await accountSdk.addNewDelegation(
    DELEGATED_ACCOUNT,
    "MySisterAccount",
    Math.trunc(Date.now() / 1000) + 60 * 60 * 24 // 1 day
  );

  console.log(delegation.id);

  return delegation.id;
}

delegateAccount().catch((error) => console.log("Error in execution.", error));
