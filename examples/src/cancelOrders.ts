import { C3SDK, createAlgorandOwnerFromMnemonic } from "@c3exchange/sdk";

const Algorand_MNEMONIC = "mnemonic here";
const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});

async function cancelOrders(): Promise<void> {
  const signer = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  const MARKET = "BTC-USDC";
  const ORDER_ID = "ORDER ID HERE";

  await accountSdk.cancelOrder(ORDER_ID);

  await accountSdk.cancelAllOrdersByMarket(MARKET);

  await accountSdk.cancelAllOrders();
}

cancelOrders().catch((error) => console.log("Error in execution.", error));
