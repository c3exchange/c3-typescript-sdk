import { OrderParams } from "@c3exchange/sdk";
import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";

const TOKEN = "ALGO";
const WITHDRAW_AMOUNT = "10.00";
const WITHDRAW_MAX_BORROW = "1.00";
const WITHDRAW_CHAIN_NAME = "algorand";

const MARKET = "ALGO-USDC";
const ORDER_TYPE = "limit";
const ORDER_SIDE = "buy";
const ORDER_PRICE = "0.1866";
const ORDER_AMOUNT = "100";
const ORDER_MAX_BORROW = "25";

// Borrow operations
async function borrowAssets(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, CHAIN_NAME);

  // Borrow within Withdraw
  console.log(
    `Borrowing maximum ${WITHDRAW_MAX_BORROW} ${TOKEN} while Withdrawing ${WITHDRAW_AMOUNT} ${TOKEN}`
  );
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: WITHDRAW_AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: WITHDRAW_CHAIN_NAME,
    maxFees: "0.001", // Check the fees of the blockchain of choice
    maxBorrow: WITHDRAW_MAX_BORROW,
  });
  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);

  // Borrow within Order
  console.log(`Borrowing maximum ${ORDER_MAX_BORROW} ${TOKEN} within an Order`);
  const orderWithBorrow: OrderParams = {
    marketId: MARKET,
    type: ORDER_TYPE,
    side: ORDER_SIDE,
    amount: ORDER_AMOUNT,
    price: ORDER_PRICE,
    maxBorrow: ORDER_MAX_BORROW,
  };
  const orderWithBorrowResult = await accountSdk.createOrder(orderWithBorrow);
  console.log(`Submitted order: ${orderWithBorrowResult.id}`);
}

borrowAssets().catch((error) => console.log("Error in execution.", error));
