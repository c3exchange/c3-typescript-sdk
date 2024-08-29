import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

async function revokeDelegation(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  const delegations = await accountSdk.getDelegations();

  await accountSdk.revokeDelegation(delegations[0].id);
}

revokeDelegation().catch((error) => console.log("Error in execution.", error));
