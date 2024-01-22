import { Signer } from "@c3exchange/common";
import { C3SDK } from "@c3exchange/sdk";

const Algorand_MNEMONIC = "mnemonic here";

const TOKEN = "ALGO";
const AMOUNT = "1.00";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://algolite.test.c3.io", // "https://algolite.c3.io" Mainnet node
  },
});

async function accountDeposit(): Promise<void> {
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

  console.log(`Withdrawing ${AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: AMOUNT,
    destinationAddress: signer.address,
    destinationChainName: "algorand",
    maxFees: "0.001", // Check the fees of the blockchain of choice
  });

  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

accountDeposit().catch((error) => console.log("Error in execution.", error));
