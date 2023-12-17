import { Signer, CHAIN_ID_ETH, CHAIN_ID_AVAX } from "@c3exchange/common";
import { C3SDK, EVMSigner } from "@c3exchange/sdk";
import { Wallet, providers } from "ethers";


const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://node.testnet.algoexplorerapi.io", // "https://node.algoexplorerapi.io" Mainnet node
  },
});


async function evmAccountDeposit(): Promise<void> {
  const TOKEN = "AVAX";
  const AMOUNT = "1.00";
  const evmWallet = new Wallet("private key");

  // RPC URL for the Avalanche Fuji Testnet
  const fujiRPC = 'https://api.avax-test.network/ext/bc/C/rpc';

  const signer = new EVMSigner(evmWallet.address, CHAIN_ID_AVAX, evmWallet.connect(new providers.JsonRpcProvider(fujiRPC)))

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  console.log(`Depositing ${AMOUNT} ${TOKEN}`);

  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    funder: signer,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);

  // get balance
  const balance = await accountSdk.getBalance();

}

async function algorandAccountDeposit(): Promise<void> {
  const Algorand_MNEMONIC = "mnemonic here";
  const TOKEN = "ALGO";
  const AMOUNT = "1.00";

  const signerClass = new Signer();
  const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  console.log(`Depositing ${AMOUNT} ${TOKEN}`);

  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: AMOUNT,
    funder: signer,
  });

  console.log(`Deposit Complete: ${await deposit.isTransferCompleted()}`);

  // get balance
  const balance = await accountSdk.getBalance();

}

evmAccountDeposit().catch((error) => console.log("Error in execution.", error));
