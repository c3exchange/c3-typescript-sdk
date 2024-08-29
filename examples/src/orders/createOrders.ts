import { OrderParams } from "@c3exchange/sdk";
import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

const MARKET = "BTC-USDC";
const ORDER_TYPE = "limit";
const ORDER_SIDE = "sell";
const ORDER_PRICE = "60000";
const ORDER_AMOUNT = "0.1";

async function createOrders(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  console.log("Submitting 1 order");
  const firsOrder: OrderParams = {
    type: ORDER_TYPE,
    side: ORDER_SIDE,
    marketId: MARKET,
    amount: ORDER_AMOUNT,
    price: ORDER_PRICE,
    // maxBorrow: "2.5", // Optional, used for margin orders
    // maxRepay:"2.5", // Optional, used to pay back loans
    // expiresOn: // Optional, UnixTimestampInSeconds;
  };

  const orderResult = await accountSdk.createOrder(firsOrder);
  console.log(`Submitted order: ${orderResult.id}`);

  console.log("Submitting batched orders");
  const batchedOrders: OrderParams[] = [
    {
      type: ORDER_TYPE,
      side: ORDER_SIDE,
      marketId: MARKET,
      amount: ORDER_AMOUNT,
      price: (parseFloat(ORDER_PRICE) * 1.01).toString(),
    },
    {
      type: ORDER_TYPE,
      side: ORDER_SIDE,
      marketId: MARKET,
      amount: ORDER_AMOUNT,
      price: (parseFloat(ORDER_PRICE) * 1.02).toString(),
    },
    {
      type: ORDER_TYPE,
      side: ORDER_SIDE,
      marketId: MARKET,
      amount: ORDER_AMOUNT,
      price: (parseFloat(ORDER_PRICE) * 1.03).toString(),
    },
  ];
  // to-do // This feature will be available in the next SDK version.
  const ordersResult = await accountSdk.createOrders(MARKET, batchedOrders);
}

createOrders().catch((error) => console.log("Error in execution.", error));
