import { C3SDK, createEVMOwnerFromMnemonic } from "@c3exchange/sdk";
import { ethers } from "ethers";

const TOKEN = "USDC";
const AMOUNT = "1000";

const c3sdk = new C3SDK({
    c3_api: {
        server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
        wormhole_network: "TESTNET",
    },
    algorand_node: {
        server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
    },
});

const MNEMONIC = "mnemonic here";
const providerUrl = "https://api.avax.network/ext/bc/C/rpc"
const evmProvider = new ethers.providers.JsonRpcProvider(providerUrl)

async function accountDeposit(): Promise<void> {

    const signer = createEVMOwnerFromMnemonic(MNEMONIC, evmProvider);

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
        destinationAddress: accountSdk.getUserAddress(),
        destinationChainName: "ethereum",
        maxFees: "16", // Check the fees of the blockchain of choice
    });

    console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);
}

accountDeposit().catch((error) => console.log("Error in execution.", error));
