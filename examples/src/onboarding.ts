import { Signer, CHAIN_ID_ETH, CHAIN_ID_AVAX } from "@c3exchange/common";
import { C3SDK, EVMSigner } from "@c3exchange/sdk";
import { Wallet } from "ethers";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://node.testnet.algoexplorerapi.io", // "https://node.algoexplorerapi.io" Mainnet node
  },
});

async function AlgorandSignerlogin() {
  const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";

  const signerClass = new Signer();
  const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

async function EVMSignerLogin() {
  const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

  // EVM WALLET LOGIN METHOD:
  const ethersAccount = Wallet.fromMnemonic(EVM_MNEMONIC);

  // choose which EVM chain to use (womrhole chain id)
  const signer = new EVMSigner(
    ethersAccount.address,
    CHAIN_ID_ETH,
    ethersAccount
  );

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

AlgorandSignerlogin().catch((error) =>
  console.log("Error in execution.", error)
);

// EVMSignerLogin().catch(error => console.log("Error in execution.", error))
