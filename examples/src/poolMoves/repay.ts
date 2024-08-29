import { OrderParams } from "@c3exchange/sdk";
import { login, getC3SDK } from "../utils/utils";

const CHAIN_NAME = "CHAIN NAME HERE";
const MNEMONIC = "YOUR MNEMONIC HERE";

const TOKEN = "ALGO";
const REPAY_AMOUNT = "1.00";
const DEPOSIT_AMOUNT = "10.00";

const MARKET = "ALGO-USDC";
const ORDER_TYPE = "limit";
const ORDER_SIDE = "buy";
const ORDER_PRICE = "0.1866";
const ORDER_AMOUNT = "100";
const ORDER_MAX_REPAY = "25";

// Repay operations
async function repayAssets(): Promise<void> {
  const c3sdk = getC3SDK();

  console.log("Authenticating account");
  const accountSdk = await login(c3sdk, MNEMONIC, CHAIN_NAME);

  // Repay directly
  console.log(`Repaying ${REPAY_AMOUNT} ${TOKEN}`);
  const repayOperationId = await accountSdk.repay(TOKEN, REPAY_AMOUNT);
  console.log(`Repay Complete: ${repayOperationId}`, "\n");

  // Repay within Deposit
  console.log(
    `Repaying ${REPAY_AMOUNT} ${TOKEN} while Depositing ${DEPOSIT_AMOUNT} ${TOKEN}`
  );
  const deposit = await accountSdk.deposit({
    amount: DEPOSIT_AMOUNT,
    instrumentId: TOKEN,
    repayAmount: REPAY_AMOUNT,
  });
  console.log(
    `Deposit with Repay Complete: ${await deposit.isTransferCompleted()}`
  );

  // Repay within Order
  console.log(`Repaying max ${ORDER_MAX_REPAY} ${TOKEN} within an Order`);
  const orderWithRepay: OrderParams = {
    marketId: MARKET,
    type: ORDER_TYPE,
    side: ORDER_SIDE,
    amount: ORDER_AMOUNT,
    price: ORDER_PRICE,
    maxRepay: ORDER_MAX_REPAY,
  };
  const orderWithRepayResult = await accountSdk.createOrder(orderWithRepay);
  console.log(`Submitted order: ${orderWithRepayResult.id}`);
}

repayAssets().catch((error) => console.log("Error in execution.", error));
