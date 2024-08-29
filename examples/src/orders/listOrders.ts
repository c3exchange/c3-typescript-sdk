import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

const MARKET = "ETH-USDC";

async function listOrders(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  console.log("Getting orders");
  const allOrders = await accountSdk.getOrders();

  const openOrders = await accountSdk.getOrders(undefined, { isOpen: true });

  const ethOpenOrders = await accountSdk.getOrders(MARKET, {
    isOpen: true,
  });
}

listOrders().catch((error) => console.log("Error in execution.", error));
