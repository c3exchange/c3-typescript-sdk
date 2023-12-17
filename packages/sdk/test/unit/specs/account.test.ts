import "mocha"
import { expect } from "chai"
import C3Sdk from "../../../src"
import { AccountOperationType, CHAIN_ID_ETH, InstrumentAmount, OperationStatus, encodeBase64, parseTimestamp } from "@c3exchange/common"
import AccountClient from "../../../src/entities/account"
import { ALGORAND_ACCOUNT, ALGORAND_ACCOUNT_ID, BTC_USDC_MARKET, ETHEREUM_ACCOUNT, ETHEREUM_ACCOUNT_ID } from "../helpers/mock.resources"
import { generateMockedLogin, mockedServer } from "../helpers/mock.responses"
import * as mockdate from "mockdate"

// Account tests
describe("Account tests", () => {
    const sdk = new C3Sdk.C3SDK();
    const marketId = BTC_USDC_MARKET.id
    let account: AccountClient;
    const accountId = ETHEREUM_ACCOUNT_ID

    // FIXME: This should me mocked properly
    const operationParams = { lease: (new Uint8Array(32)).fill(32), lastValid: 1 }

    before(async () => {
        const { signer } = generateMockedLogin(CHAIN_ID_ETH)
        account = await sdk.login(signer);
        // @ts-expect-error
        account.getOperationParams = async () => operationParams
        // @ts-expect-error
        account.waitForConfirmation = () => Promise.resolve()
    })

    it("Should get account info", async () => {
        const address = ETHEREUM_ACCOUNT.address
        mockedServer.get(`/v1/accounts/${accountId}`)
            .reply(200, { id: accountId, owner: address, wallet: { address, chainId: CHAIN_ID_ETH }, createdOn: 0 })
        expect(account).itself.to.respondTo("getInfo")
        const accountInfo = await account.getInfo()
        expect(accountInfo.id).to.exist
        expect(accountInfo.wallet.chainId).to.exist
    })

    it("Should get account market limits", async () => {
        mockedServer.get(
            (uri) => uri.endsWith("/limits") && uri.startsWith(`/v1/accounts/${accountId}/markets/`))
            .reply(200, {
                maxBuyOrderSize: "0",
                maxSellOrderSize: "0",
                buyAvailableCash: "0",
                sellAvailableCash: "0",
                buyPoolBalance: "0",
                sellPoolBalance: "0",
            }
        )
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
        const accountOperationPath = `/v1/accounts/${accountId}/operations`
        mockedServer.get(accountOperationPath).reply(200, [])
        mockedServer.get(accountOperationPath).query({ "types[]": "deposit" }).reply(200, [])
        mockedServer.get(accountOperationPath).query({ "types[]": ["deposit", "withdraw"], "statuses[]": "pending" }).reply(200, [])
        mockedServer.get(accountOperationPath).query({ idBefore: 0, pageSize: 100 }).reply(200, [{
            id: 0,
            type: "deposit",
            status: "pending",
            amount: "100",
            instrumentId: "BTC",
            groupId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }])

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
        mockedServer.get(
            (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${accountId}/markets/`))
            .reply(200, [])
        mockedServer.get(
            (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${accountId}/markets/`))
            .query({ isOpen: true })
            .reply(200, [])
        mockedServer.get(
            (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${accountId}/markets/`))
            .query({ isOpen: false, creator: ALGORAND_ACCOUNT.addr })
            .reply(200, [])
        mockedServer.get(
            (uri) => uri.endsWith("/orders") && uri.startsWith(`/v1/accounts/${accountId}/markets/`))
            .query({ pageSize: 100, offset: 100 })
            .reply(200, [])

        expect(account).itself.to.respondTo("getOrders")
        const accountOrders = await account.getOrders(marketId)
        expect(accountOrders).to.be.an("array")
        const openOrders = await account.getOrders(marketId, { isOpen: true })
        expect(openOrders).to.be.an("array")
        const creatorOrders = await account.getOrders(marketId, { isOpen: false, creator: ALGORAND_ACCOUNT.addr })
        expect(creatorOrders).to.be.an("array")
        const paginatedOrders = await account.getOrders(marketId, { pageSize: 100, offset: 100 })
        expect(paginatedOrders).to.be.an("array")
    })

    it ("Should cancel All orders", async () => {
        mockdate.set(0)
        mockedServer.delete((uri) => uri.endsWith(`/v1/accounts/${accountId}/orders`)).query({
            creator: ETHEREUM_ACCOUNT.address,
            allOrdersUntil: 0,
            signature: "INjLigrHvaau7A7OXWcv+S85iAWLiYTRdVboPPOO38l+CPy4b5ljASAt+0K0LfBlFfrdyQdWPhx8Ru7EuzHAcxw=",
        }).reply(200, [])
        expect(account).itself.to.respondTo("cancelAllOrders")
        const results = await account.cancelAllOrders()
        expect(results).not.to.be.undefined
        expect(results).to.be.an("array")
    })


    it ("Should get account balance", async () => {
        mockedServer.get(`/v1/accounts/${accountId}/balance`)
        .reply(200, {
            instrumentsInfo: [],
            portfolioOverview: {
                value: "0",
                availableMargin: "0",
                buyingPower: "0",
                health: "0",
                leverage: "0",
                initialMarginCalculation: {
                    isInitialMargin: true,
                    support: "0",
                    requirement: "0",
                    assetInfo: []
                }
            },
        })
        expect(account).itself.to.respondTo("getBalance")
        const offChainBalance = await account.getBalance()
        expect(offChainBalance).not.to.be.undefined
        expect(offChainBalance.instrumentsInfo).to.be.an("array")
        expect(offChainBalance.portfolioOverview).to.be.an("object")
    })

    it ("Should withdraw funds", async () => {
        const destinationAddress = ETHEREUM_ACCOUNT.address
        const destinationChainName = "ethereum"
        mockedServer.post(`/v1/accounts/${accountId}/withdraw`, {
            amount: "100",
            instrumentId: "BTC",
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            maxBorrow: "0",
            maxFees: "0",
            signature: "Tzpoe3HaCYnixCmLep5KRl4cHzyDEA32HFSpw31VixdNfgmse690+lQ5/S58qBUnT5rn9WeUeXlX07onfZ/9yBs=",
            destination: { address: destinationAddress, chain: destinationChainName }
        }).reply(200, { amount: "100", instrumentId: "BTC", extraInfo: { sendTransferTxId: "0x123" } })
        expect(account).itself.to.respondTo("withdraw")
        const response = await account.withdraw({
            amount: "100",
            instrumentId: "BTC",
            maxFees: "0",
            maxBorrow: "0",
            destinationAddress,
            destinationChainName,
        })
        expect(response.amount.toDecimal()).to.be.equal("100")
        expect(response.instrumentId).to.be.equal("BTC")
    })

    it ("Should lend funds", async () => {
        const instrumentId = "BTC"
        const decimalAmount = "100"
        const txId = "0x123"
        mockedServer.post(`/v1/accounts/${accountId}/credit/${instrumentId}/lend`, {
            amount: decimalAmount,
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            signature: "DDyQC+iXKjbA7Cz23nSJYFcbLJ5g+zQuScKebe671Yxn4MLSuDdYA4iXY6WQfjZnnlCSBziHTBjBl2SLBYtDhBw=",
        }).reply(200, { id: txId })
        expect(account).itself.to.respondTo("lend")
        const response = await account.lend(instrumentId, decimalAmount)
        expect(response).to.be.equal(txId)
    })

    it ("Should borrow funds", async () => {
        const instrumentId = "BTC"
        const decimalAmount = "100"
        const txId = "0x123"
        mockedServer.post(`/v1/accounts/${accountId}/credit/${instrumentId}/borrow`, {
            amount: decimalAmount,
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            signature: "PoYmFGwgLuGTcg/pDRlT3CDgIXp/WXiIE8wuLcJwK6oYdeT5eJ8shOBrGcfF3Wy1uRq2wjXh1o6Wa32eXP5EJxs=",
        }).reply(200, { id: txId })
        expect(account).itself.to.respondTo("borrow")
        const response = await account.borrow(instrumentId, decimalAmount)
        expect(response).to.be.equal(txId)
    })

    it ("Should redeem funds", async () => {
        const instrumentId = "BTC"
        const decimalAmount = "100"
        const txId = "0x123"
        mockedServer.post(`/v1/accounts/${accountId}/credit/${instrumentId}/redeem`, {
            amount: decimalAmount,
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            signature: "PoYmFGwgLuGTcg/pDRlT3CDgIXp/WXiIE8wuLcJwK6oYdeT5eJ8shOBrGcfF3Wy1uRq2wjXh1o6Wa32eXP5EJxs=",
        }).reply(200, { id: txId })
        expect(account).itself.to.respondTo("redeem")
        const response = await account.redeem(instrumentId, decimalAmount)
        expect(response).to.be.equal(txId)
    })

    it ("Should repay funds", async () => {
        const instrumentId = "BTC"
        const decimalAmount = "100"
        const txId = "0x123"
        mockedServer.post(`/v1/accounts/${accountId}/credit/${instrumentId}/repay`, {
            amount: decimalAmount,
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            signature: "DDyQC+iXKjbA7Cz23nSJYFcbLJ5g+zQuScKebe671Yxn4MLSuDdYA4iXY6WQfjZnnlCSBziHTBjBl2SLBYtDhBw=",
        }).reply(200, { id: txId })
        expect(account).itself.to.respondTo("repay")
        const response = await account.repay(instrumentId, decimalAmount)
        expect(response).to.be.equal(txId)
    })

    it ("Should liquidate a user", async () => {
        const accountToLiquidate = ALGORAND_ACCOUNT_ID
        mockedServer.post(`/v1/accounts/${accountId}/liquidate`, {
            assetBasket: [], liabilityBasket: [],
            lease: encodeBase64(operationParams.lease),
            lastValid: operationParams.lastValid,
            target: accountToLiquidate,
            signature: "KTKQdZrfPeLTxaEvoiQsLeXS2MS7zcxVRcu2AddEngAazHQwDAp8uyjUXAJrAYVtNHE+yI08zYAkXfhw5gfy+Rw=",
        }).reply(200, { id: "0x123" })
        const result = await account.liquidate(accountToLiquidate, [], [])
        expect(result).to.be.a("string")
    })

    it ("Should delegate a user", async () => {
        const name = "Test account"
        const expiresOn = 60
        mockdate.set(0)
        mockedServer.post(`/v1/accounts/${accountId}/delegations`, {
            accountId: accountId,
            delegatedTo: ALGORAND_ACCOUNT_ID,
            name, expiresOn, nonce: 0,
            signature: "axDXhoL1IAteDdr25xRn3k2RUy/HgcycdtXt4OaZF2dR/JHIXNowql0zSqq/9LzaRIeUsT7shaUTCx8PCXemshw="
        }).reply(200, { id: "0x123" })
        expect(account).itself.to.respondTo("addNewDelegation")
        const result = await account.addNewDelegation(ALGORAND_ACCOUNT.addr, name, expiresOn)
        expect(result.id).to.be.a("string")
    })

    it ("Should revoke a user", async () => {
        const delegateId = "123"
        mockedServer.delete(`/v1/accounts/${accountId}/delegations`).query({
            id: delegateId,
        }).reply(200, { id: delegateId })
        expect(account).itself.to.respondTo("revokeDelegation")
        const result = await account.revokeDelegation(delegateId)
        expect(result.id).to.be.equal(delegateId)
    })

    it ("Should get delegated users", async () => {
        mockedServer.get(`/v1/accounts/${accountId}/delegations`).reply(200, [{
            id: "123",
            name: "Test account",
            delegatedTo: ALGORAND_ACCOUNT_ID,
            expiresOn: 60,
            createdOn: 0,
            lastUsedOn: 30,
        }])
        const delegations = await account.getDelegations()
        expect(delegations).to.be.an("array")
        expect(delegations.length).to.be.equal(1)
    })

    it("Should logout an account", async () => {
        mockedServer.post("/v1/logout").reply(200, { success: true })
        const res = await account.logout();
        expect(res).to.be.deep.eq({ success: true });
    })
})