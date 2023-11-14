import "mocha"
import { expect } from "chai"
import "../helpers/mock.responses"
import C3Sdk from "../../../src"
import { AccountOperationType, AlgorandSigner, InstrumentAmount, OperationStatus } from "@c3exchange/common"
import AccountClient from "../../../src/entities/account"
import { BTC_USDC_MARKET, CREATOR_ADDRESS } from "../helpers/mock.resources"

// Account tests
describe("Account tests", () => {
    const address = "XROK3OJI5BFYZ4LI3EJJLZNXR5G5BXDRM2455KEZ4ZUTBAOHGFFPMVXFJE";
    const sdk = new C3Sdk.C3SDK();
    const marketId = BTC_USDC_MARKET.id
    let account: AccountClient;

    before(async () => {
        account = await sdk.login(new AlgorandSigner(
            address, () => Promise.resolve([new Uint8Array()]),
            () => Promise.resolve(new Uint8Array(Buffer.from("'ckZv+nU2/gfUs944SEjDbo6xl33wt33jah1lshabpAQ='", 'ascii')))
        ));
    })

    it("Should get account info", async () => {
        expect(account).itself.to.respondTo("getInfo")
        const accountInfo = await account.getInfo()
        expect(accountInfo.id).to.exist
        expect(accountInfo.wallet.chainId).to.exist
    })

    it("Should get account market limits", async () => {
        expect(account).itself.to.respondTo("getLimits")
        const accountLimits = await account.getLimits(marketId)
        expect(accountLimits.buyAvailableCash).to.be.instanceOf(InstrumentAmount)
        expect(accountLimits.buyPoolBalance).to.be.instanceOf(InstrumentAmount)
        expect(accountLimits.maxBuyOrderSize).to.be.instanceOf(InstrumentAmount)
        expect(accountLimits.sellAvailableCash).to.be.instanceOf(InstrumentAmount)
        expect(accountLimits.sellPoolBalance).to.be.instanceOf(InstrumentAmount)
        expect(accountLimits.maxSellOrderSize).to.be.instanceOf(InstrumentAmount)
    })

    it("Should get account operations", async () => {
        expect(account).itself.to.respondTo("getOperations")
        const responses = await Promise.all([
            account.getOperations(),
            account.getOperations({ types: [AccountOperationType.DEPOSIT] }),
            account.getOperations({ types: [AccountOperationType.DEPOSIT, AccountOperationType.WITHDRAW], statuses: [OperationStatus.PENDING] }),
        ])
        for (const response of responses) {
            expect(response).to.be.an("array")
        }
        const accountOperations = await account.getOperations({ idBefore: 0, pageSize: 100 })
        expect(accountOperations).to.be.an("array")
        expect(accountOperations[0]).not.to.be.undefined,
        expect(accountOperations[0].id).to.be.equal(0)
        expect(accountOperations[0].type).to.be.equal(AccountOperationType.DEPOSIT)
        expect(accountOperations[0].amount).to.be.instanceOf(InstrumentAmount)
        expect(accountOperations[0].amount.toDecimal()).to.be.equal("100")
        expect(accountOperations[0].amount.instrument.id).to.be.equal("BTC")
    })

    it("Should get account orders", async () => {
        expect(account).itself.to.respondTo("getOrders")
        const accountOrders = await account.getOrders(marketId)
        expect(accountOrders).to.be.an("array")
        const openOrders = await account.getOrders(marketId, { isOpen: true })
        expect(openOrders).to.be.an("array")
        const creatorOrders = await account.getOrders(marketId, { isOpen: false, creator: CREATOR_ADDRESS })
        expect(creatorOrders).to.be.an("array")
        const paginatedOrders = await account.getOrders(marketId, { pageSize: 100, offset: 100 })
        expect(paginatedOrders).to.be.an("array")
    })

    it ("Should cancel All orders", async () => {
        expect(account).itself.to.respondTo("cancelAllOrders")
        const results = await account.cancelAllOrders()
        expect(results).not.to.be.undefined
        expect(results).to.be.an("array")
    })

    it ("Should get account balance", async () => {
        expect(account).itself.to.respondTo("getBalance")
        const offChainBalance = await account.getBalance()
        expect(offChainBalance).not.to.be.undefined
        expect(offChainBalance.instrumentsInfo).to.be.an("array")
        expect(offChainBalance.portfolioOverview).to.be.an("object")
    })

    it("should logout an account", async () => {
        const res = await account.logout();
        expect(res).to.be.deep.eq({ success: true });
    })

})