import { OrderParams, createAlgorandOwnerFromMnemonic } from "@c3exchange/sdk";
import { getC3SDK } from "../utils/utils";

const Algorand_MNEMONIC = "YOUR MNEMONIC HERE";
const DELEGATED_ACCOUNT = "ADDRESS HERE";

async function loginAndOperateWithDelegatedAccount() {
  const c3sdk = getC3SDK();

  const owner = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  const delegatedAccount = await c3sdk.login(
    owner,
    undefined,
    undefined,
    DELEGATED_ACCOUNT
  );

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
  await delegatedAccount.lend("USDC", "2000");

  // Cancel an order
  await delegatedAccount.cancelOrder(orderResult.id);
}

loginAndOperateWithDelegatedAccount().catch((error) =>
  console.log("Error in execution.", error)
);
