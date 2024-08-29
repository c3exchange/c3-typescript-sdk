import { login, getC3SDK } from "../utils/utils";

async function AlgorandSignerlogin() {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, "algorand");
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

AlgorandSignerlogin().catch((error) =>
  console.log("Error in execution.", error)
);
