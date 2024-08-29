import { getC3SDK, login } from "../utils/utils";

async function SolanaSignerLogin() {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, "solana");
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

SolanaSignerLogin().catch((error) => console.log("Error in execution.", error));
