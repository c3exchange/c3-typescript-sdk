import { C3SDK, OrderParams, createAlgorandOwnerFromMnemonic } from "@c3exchange/sdk";

const Algorand_MNEMONIC = "mnemonic here"


const MARKET = "  BTC-USDC";
const ORDER_TYPE = "limit";
const ORDER_SIDE = "sell";
const ORDER_PRICE = "45000.01";
const ORDER_AMOUNT = "0.1";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});

async function createOrders(): Promise<void> {
  const signer = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

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

  //console.log('Submitting batched orders')

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
  // const ordersResult = await accountSdk.createOrders(firsOrder)
}

createOrders().catch((error) => console.log("Error in execution.", error));
