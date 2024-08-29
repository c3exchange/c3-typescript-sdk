import { login, getC3SDK } from "../utils/utils";

// chainName has to be one of:
// "ethereum","sepolia","avalanche","arbitrum","bsc","optimism","base","polygon"
const CHAIN_NAME = "CHAIN NAME HERE";
const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

async function EVMSignerLogin() {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, EVM_MNEMONIC, CHAIN_NAME);
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

EVMSignerLogin().catch((error) => console.log("Error in execution.", error));
