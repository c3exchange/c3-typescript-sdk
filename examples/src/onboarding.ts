import { C3SDK, createAlgorandOwnerFromMnemonic, createEVMOwnerFromMnemonic } from "@c3exchange/sdk";
import { ethers } from "ethers";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});
const providerUrl = "https://api.avax.network/ext/bc/C/rpc"
const evmProvider = new ethers.providers.JsonRpcProvider(providerUrl)

async function AlgorandSignerlogin() {
  const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";

  const signer = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

async function EVMSignerLogin() {
  const EVM_MNEMONIC = "YOUR MNEMONIC HERE";

  // choose which EVM chain to use (womrhole chain id)
  const signer = createEVMOwnerFromMnemonic(EVM_MNEMONIC, evmProvider)

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);
  console.log(accountSdk);
  console.log("Successfully authenticated account!");
}

AlgorandSignerlogin().catch((error) =>
  console.log("Error in execution.", error)
);

// EVMSignerLogin().catch(error => console.log("Error in execution.", error))
