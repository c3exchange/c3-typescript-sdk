import { Signer } from "@c3exchange/common";
import { C3SDK, OrderParams } from "@c3exchange/sdk";

const c3sdk = new C3SDK({
    c3_api: {
      server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
      wormhole_network: "TESTNET",
    },
    algorand_node: {
      server: "https://node.testnet.algoexplorerapi.io", // "https://node.algoexplorerapi.io" Mainnet node
    },
});

const Algorand_MNEMONIC = "mnemonic here"
const DELEGATED_ACCOUNT = "address here"

async function delegateAccount (): Promise<string> {
    const signerClass = new Signer();
    const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);

    const accountSdk = await c3sdk.login(signer);

    const delegation = await accountSdk.addNewDelegation(
        DELEGATED_ACCOUNT,
        "MySisterAccount",
        Math.trunc(Date.now() / 1000) + 60 * 60 * 24 // 1 day
    )

    console.log(delegation.id)

    return delegation.id
}

async function revokeDelegation (): Promise<void> {
    const signerClass = new Signer();
    const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);

    const accountSdk = await c3sdk.login(signer);

    const delegations = await accountSdk.getDelegations()

    await accountSdk.revokeDelegation(delegations[0].id)
}

async function loginAndOperateWithDelegatedAccount () {
    const signerClass = new Signer();
    const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC);
    const delegatedAccount = await c3sdk.login(signer, undefined, undefined, DELEGATED_ACCOUNT);

    /**
     * You can reuse your previous session by passing the session to avoid call login http request again:
     * const delegatedAccount = await c3sdk.login(signer, accountSdk.getSession(), undefined, DELEGATED_ACCOUNT);
     */

    const order: OrderParams = {
        type: "limit",
        side: "buy",
        marketId: "AVAX-USDC",
        amount: "2",
        price: "25.5",
    };

    // Create an order
    const orderResult = await delegatedAccount.createOrder(order);
    console.log(`Submitted order: ${orderResult.id}`);
    
    // Lend USDC
    await delegatedAccount.lend("USDC", "2000")

    // Cancel an order
    await delegatedAccount.cancelOrder(orderResult.id)
}
