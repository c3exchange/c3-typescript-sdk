import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

const MARKET = "BTC-USDC";
const ORDER_ID = "ORDER ID HERE";

async function cancelOrders(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  console.log("Cancelling orders");
  await accountSdk.cancelOrder(ORDER_ID);

  await accountSdk.cancelAllOrdersByMarket(MARKET);

  await accountSdk.cancelAllOrders();
}

cancelOrders().catch((error) => console.log("Error in execution.", error));
