import {
  C3SDK,
  OrderParams,
  createAlgorandOwnerFromMnemonic,
} from "@c3exchange/sdk";

const Algorand_MNEMONIC = "mnemonic here";

const TOKEN = "ALGO";

const LEND_AMOUNT = "1.00";
const REPAY_AMOUNT = "1.00";
const DEPOSIT_AMOUNT = "10.00";
const WITHDRAW_AMOUNT = "10.00";

const WITHDRAW_MAX_BORROW = "1.00";

const MARKET = "ALGO-USDC";
const ORDER_TYPE = "limit";
const ORDER_SIDE = "buy";
const ORDER_PRICE = "0.1866";
const ORDER_AMOUNT = "100";
const ORDER_MAX_BORROW = "25";
const ORDER_MAX_REPAY = "25";

const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // "https://api.c3.io" Mainnet api
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://testnet-api.algonode.cloud", // "https://mainnet-api.algonode.cloud" Mainnet node
  },
});

// Lend and Redeem operations
async function lendAndRedeemAssets(): Promise<void> {
  const signer = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  console.log(`Lending ${LEND_AMOUNT} ${TOKEN}`);
  const lendOperationId = await accountSdk.lend(TOKEN, LEND_AMOUNT);
  console.log(`Lend Complete: ${lendOperationId}`);

  console.log(`Redeeming ${LEND_AMOUNT} ${TOKEN}`);
  const redeemOperationId = await accountSdk.redeem(TOKEN, LEND_AMOUNT);
  console.log(`Redeem Complete: ${redeemOperationId}`);
}

lendAndRedeemAssets().catch((error) => console.log("Error in execution.", error));

// Borrow and Repay operations
async function borrowAndRepayAssets(): Promise<void> {
  const signer = createAlgorandOwnerFromMnemonic(Algorand_MNEMONIC);

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

  // Borrow inside Withdraw
  console.log(`Borrowing maximum ${WITHDRAW_MAX_BORROW} ${TOKEN} while Withdrawing ${WITHDRAW_AMOUNT} ${TOKEN}`);
  const withdrawal = await accountSdk.withdraw({
    instrumentId: TOKEN,
    amount: WITHDRAW_AMOUNT,
    destinationAddress: accountSdk.getUserAddress(),
    destinationChainName: "algorand",
    maxFees: "0.001", // Check the fees of the blockchain of choice
    maxBorrow: WITHDRAW_MAX_BORROW,
  });
  console.log(`Withdrawal Complete: ${await withdrawal.isTransferCompleted()}`);

  // Borrow inside Order
  console.log(`Borrowing maximum ${ORDER_MAX_BORROW} ${TOKEN} in an Order`);
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

  // Repay directly
  console.log(`Repaying ${REPAY_AMOUNT} ${TOKEN}`);
  const repayOperationId = await accountSdk.repay(TOKEN, REPAY_AMOUNT);
  console.log(`Repay Complete: ${repayOperationId}`, "\n");

  // Repay inside Deposit
  console.log(`Repaying ${REPAY_AMOUNT} ${TOKEN} while Depositing ${DEPOSIT_AMOUNT} ${TOKEN}`);
  const deposit = await accountSdk.deposit({
    instrumentId: TOKEN,
    amount: DEPOSIT_AMOUNT,
    funder: signer,
    repayAmount: REPAY_AMOUNT,
  });
  console.log(`Deposit with Repay Complete: ${await deposit.isTransferCompleted()}`);

  // Repay inside Order
  console.log(`Repaying max ${ORDER_MAX_REPAY} ${TOKEN} in an Order`);
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

borrowAndRepayAssets().catch((error) => console.log("Error in execution.", error));
