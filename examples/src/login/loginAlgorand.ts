import { login, getC3SDK } from "../utils/utils";

const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";

async function AlgorandSignerlogin() {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, Algorand_MNEMONIC, "algorand");
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

AlgorandSignerlogin().catch((error) =>
  console.log("Error in execution.", error)
);
