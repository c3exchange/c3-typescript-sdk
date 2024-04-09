import "mocha"
import { expect } from "chai"
import C3Sdk from "../../../src"
import { AccountOperationType, CHAIN_ID_ALGORAND, CHAIN_ID_ETH, InstrumentAmount, OperationStatus, Signer, defaultOrderExpiration, encodeBase64, isValidAddress, userAddressToAccountId } from "@c3exchange/common"
import AccountClient from "../../../src/entities/account"
import { SerializableNewOrderDataRequestBody } from "../../../src/internal/account_endpoints"
import { ALGORAND_ACCOUNT, ALGORAND_ACCOUNT_ID, ALGORAND_MNEMONIC, ALGO_BTC_MARKET, BTC_USDC_MARKET, ETHEREUM_ACCOUNT, ETHEREUM_ACCOUNT_ID } from "../helpers/mock.resources"
import { cleanMockedServer, generateMockedLogin, mockCommonEndpoints, mockedServer } from "../helpers/mock.responses"
import * as mockdate from "mockdate"
import crypto from "crypto"

// Account tests
describe("Account tests", () => {
    const sdk = new C3Sdk.C3SDK();
    const marketId = BTC_USDC_MARKET.id
    let account: AccountClient;
    const accountId = ETHEREUM_ACCOUNT_ID

    // FIXME: This should me mocked properly
    const operationParams = { lease: (new Uint8Array(32)).fill(32), lastValid: 1 }

    before(async () => {
        cleanMockedServer()
        mockCommonEndpoints()
        const { signer } = generateMockedLogin(CHAIN_ID_ETH)
        account = await sdk.login(signer);
        // @ts-expect-error
        account.getOperationParams = async () => operationParams
        // @ts-expect-error
        account.waitForConfirmation = () => Promise.resolve()
    })

    it ("Should login with delegation", async () => {
        const createdOn = 1919191919
        const operateOn = ALGORAND_ACCOUNT.addr
        const operateOnAccountId = ALGORAND_ACCOUNT_ID
        const delegatedAccount = await sdk.login(account.messageSigner, account.getSession(), false, operateOn)
        mockedServer.get(`/v1/accounts/${operateOnAccountId}`)
        .reply(200, { id: accountId, owner: operateOn, wallet: { address: operateOn, chainId: CHAIN_ID_ALGORAND }, createdOn })
        expect(account).itself.to.respondTo("getInfo")
        const accountInfo = await delegatedAccount.getInfo()
        expect(accountInfo.id).to.exist
        expect(accountInfo.wallet.chainId).to.exist
        expect(accountInfo.createdOn).to.be.equal(createdOn)
    })

    it ("Should login with ephemeral key", async () => {
        const encryptionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64")
        const signer = new Signer().addFromMnemonic(ALGORAND_MNEMONIC)
        mockedServer.get("/v1/login/start").query({ address: signer.address, chainId: signer.chainId }).reply(200, { nonce: "Hello world!" })
        const completeLogin = await sdk._loginWithEphemeral(signer)
        const token = "1234566789"
        const signature = "ycDORu5gdMQOIPAvEBlZ2i/nT7k5saos1zk+XJjfInI5SZsFt9WkyDvKQgS/vj2AivckFRW+2MZ03bdPi1K7Bg=="
        mockedServer.post("/v1/login/complete", (body) => (body.signature === signature &&
            isValidAddress(body.address) && typeof body.ephemeralData === "object" && body.ephemeralData !== null &&
            typeof body.ephemeralData.signature === "string" && typeof body.ephemeralData.expiresOn === "number"
        )).reply(200, { token, userId: ALGORAND_ACCOUNT_ID, accountId: ALGORAND_ACCOUNT_ID, firstLogin: true, encryptionKey });
        const accountWithEphemeral = await completeLogin()
        expect(accountWithEphemeral).to.be.instanceOf(AccountClient)
        expect(accountWithEphemeral.getSession().encryptedEphimeralKey).not.to.be.undefined

        // Login normally
        mockedServer.get("/v1/login/status").matchHeader("authorization",  `Bearer ${token}`).reply(200, { ephimeralEncryptionKey: encryptionKey })
        const storedAccount = await sdk.login(signer, accountWithEphemeral.getSession())
        expect(storedAccount).to.be.instanceOf(AccountClient)
        expect(storedAccount.getSession()).to.be.deep.equal(accountWithEphemeral.getSession())
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
            allOrdersUntil: 0,
            signature: "INjLigrHvaau7A7OXWcv+S85iAWLiYTRdVboPPOO38l+CPy4b5ljASAt+0K0LfBlFfrdyQdWPhx8Ru7EuzHAcxw=",
        }).reply(200, [])
        expect(account).itself.to.respondTo("cancelAllOrders")
        const results = await account.cancelAllOrders()
        expect(results).not.to.be.undefined
        expect(results).to.be.an("array")
    })

    it ("Should cancel All orders for a Creator", async () => {
        mockdate.set(0)
        mockedServer.delete((uri) => uri.endsWith(`/v1/accounts/${accountId}/orders`)).query({
            creator: ETHEREUM_ACCOUNT.address,
            allOrdersUntil: 0,
            signature: "INjLigrHvaau7A7OXWcv+S85iAWLiYTRdVboPPOO38l+CPy4b5ljASAt+0K0LfBlFfrdyQdWPhx8Ru7EuzHAcxw=",
        }).reply(200, [])
        expect(account).itself.to.respondTo("cancelAllOrders")
        const results = await account.cancelAllOrders(ETHEREUM_ACCOUNT.address)
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

    it ("Should create and order with a valid expiresOn value with ephemeral", async () => {
        mockdate.set(0)
        const encryptionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64")
        const ownerMessageSigner = new Signer().createAccount()
        const ownerAccountId = userAddressToAccountId(ownerMessageSigner.address)
        mockedServer.get("/v1/login/start").query({ address: ownerMessageSigner.address, chainId: ownerMessageSigner.chainId }).reply(200, { nonce: "Hello world!" })
        const completeLogin = await sdk._loginWithEphemeral(ownerMessageSigner)
        const token = "jabncqwejasd"
        mockedServer.post("/v1/login/complete", (body) => body.address === ownerMessageSigner.address).reply(200, { token, userId: ownerAccountId, accountId: ownerAccountId, firstLogin: true, encryptionKey });
        const accountWithEphemeral = await completeLogin()
        const session = accountWithEphemeral.getSession()
        mockedServer.post(`/v1/accounts/${session.accountId}/markets/${BTC_USDC_MARKET.id}/orders`, (body: SerializableNewOrderDataRequestBody) =>
            // This is because the ephemeralKey expiration is greater than the order expiration
            body.settlementTicket.expiresOn === defaultOrderExpiration()
        ).reply(200, { id: "22312312312jasdasdashd2131231asdadaskuu" })
        await accountWithEphemeral.createOrder({
            marketId: BTC_USDC_MARKET.id,
            side: "buy",
            type: "limit",
            price: "51500",
            amount: "0.1",
        })
        mockedServer.get("/v1/login/status").matchHeader("authorization", `Bearer ${token}`).reply(200, { ephimeralEncryptionKey: encryptionKey })
        const newExpiresOn = 1000
        const accountWithEphemeral2 = await sdk.login(ownerMessageSigner, { ...session, ephemeralExpiration: newExpiresOn })
        mockedServer.post(`/v1/accounts/${session.accountId}/markets/${ALGO_BTC_MARKET.id}/orders`, (body: SerializableNewOrderDataRequestBody) =>
            // This is because the ephemeralKey expiration is lower than the ordgreaterer expiration
            body.settlementTicket.expiresOn === newExpiresOn
        ).reply(200, { id: "0x124" })
        await accountWithEphemeral2.createOrder({
            marketId: ALGO_BTC_MARKET.id,
            side: "buy",
            type: "limit",
            price: "50500",
            amount: "0.1",
        })
    })
})
