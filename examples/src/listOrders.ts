import { Signer } from "@c3exchange/common";
import { C3SDK, OrderParams } from "@c3exchange/sdk";

const Algorand_MNEMONIC = "mnemonic here";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://node.testnet.algoexplorerapi.io", // "https://node.algoexplorerapi.io" Mainnet node
  },
});

async function listOrders(): Promise<void> {
  const signerClass = new Signer();
  const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  const allOrders = await accountSdk.getOrders();

  const openOrders = await accountSdk.getOrders(undefined, { isOpen: true });

  const ethOpenOrders = await accountSdk.getOrders("ETH-USDC", {
    isOpen: true,
  });
}

listOrders().catch((error) => console.log("Error in execution.", error));
