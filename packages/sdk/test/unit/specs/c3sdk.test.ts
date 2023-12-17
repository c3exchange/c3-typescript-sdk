import "mocha"
import { expect } from "chai"
import { generateMockedLogin, mockedServer } from "../helpers/mock.responses"
import Market from "../../../src/entities/markets"
import { defaultConfig } from "../../../src/config"
import AccountClient from "../../../src/entities/account"
import { C3SDK, C3SDKConfig } from "../../../src"
import { ALGO_INSTRUMENT, AlgorandSigner, CHAIN_ID_ALGORAND, CHAIN_ID_ETH, InstrumentAmount, Signer, encodeBase64 } from "@c3exchange/common"
import { ALGORAND_ACCOUNT, ALGORAND_ACCOUNT_ID } from "../helpers/mock.resources"
import algosdk from "algosdk"

describe ("C3Sdk tests", () => {
    const sdk = new C3SDK()
    it("Should instantiate the class without arguments", () => {
        // @ts-expect-error
        expect(sdk.config).to.be.deep.equal(defaultConfig)
    })
    it("Should instantiate the class with config arguments", async () => {
        const config: C3SDKConfig = {
            algorand_node: {
                server: "http://localhost",
                port: 4001,
                token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            },
            c3_api: {
                server: "http://localhost:3000",
                wormhole_network: "DEVNET"
            }
        }
        const newSdk = new C3SDK(config)
        // @ts-expect-error
        expect(newSdk.config).to.be.deep.equal(config)
    })
    it("Should have markets attribute", () => {
        expect(sdk).itself.to.respondTo("getMarkets")
        expect(sdk.getMarkets()).to.be.instanceOf(Market)
    })
    it("Should call getInstruments method", async () => {
        expect(sdk).itself.to.respondTo("getInstruments")
        const instruments = await sdk.getInstruments()
        expect(instruments).to.be.an("array")
        for (const instrument of instruments) {
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("id")
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("asaId")
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("asaName")
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("asaUnitName")
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("asaDecimals")
            expect(instrument, `Instrument: ${instrument.id}`).to.have.ownProperty("chains")
            expect(instrument.chains, `Instrument: ${instrument.id}`).to.be.an("array")
        }
    })
    it("Should login with Algorand address and get an AccountClient interface", async () => {
        const { signer } = generateMockedLogin(CHAIN_ID_ALGORAND)
        const accountClient = await sdk.login(signer);
        expect(accountClient).to.be.instanceOf(AccountClient);
        expect(accountClient).to.have.ownProperty("session");
    })

    it("Should login with EVM address and get an AccountClient interface", async () => {
        const { signer } = generateMockedLogin(CHAIN_ID_ETH)
        const accountClient = await sdk.login(signer);
        expect(accountClient).to.be.instanceOf(AccountClient);
        expect(accountClient).to.have.ownProperty("session");
    })

    it("Should fail to login with wrong address and chainId", async () => {
        try {
            const algorandSigner = new AlgorandSigner(
                ALGORAND_ACCOUNT.addr, (txs) => Promise.resolve([new Uint8Array()]),
                () => Promise.reject(new Error("Wrong signature"))
            )
            await sdk.login(algorandSigner);
            expect.fail("Should fail to login with wrong address and chainId");
        } catch (e) {
            expect(e).to.be.instanceOf(Error);
        }
    })

    it ("Should sign nonce", async () => {
        const nonce = "Hello world"
        const signer = new Signer().addFromSecretKey(ALGORAND_ACCOUNT.sk)
        // @ts-expect-error
        const signature = await sdk.signNonce(nonce, signer)
        const expectedSignature = encodeBase64(algosdk.signBytes(Buffer.from(nonce, "ascii"), ALGORAND_ACCOUNT.sk))
        expect(signature).to.be.equal(expectedSignature)
    })

    it ("Should submit wormholeVAA", async () => {
        const accountId = ALGORAND_ACCOUNT_ID
        const amountToDeposit = InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "100")
        const amountToRepay = InstrumentAmount.fromDecimal(ALGO_INSTRUMENT, "10")
        const wormholeVAA = "AQAAAAABAJxaWP3F73N6qyN7Zmimk0MjAL8FQf/gaZnpJ66ecpqKNcfsn2C2b/GwwbzBUKhAU4EI\
        ZHjWcPa6tDpBc7tKhgYAZNVMjMx3AQAABgAAAAAAAAAAAAAAAGHkTlBspWWebAu6m2eFhvotcpdWAAAAAAAAHLwBAwAAAAAAAAAAAAAAAAAAAA\
        AAAAAAAAAAAAAAAAAGskJOAAAAAAAAAAAAAAAA5lTbnfR9/pUYdaVyI2/tWSzsKisABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQNpdo\
        AAgAAAAAAAAAAAAAAADeAeCIRyxRChGJgO2/saF/FuLX93dvcm1ob2xlRGVwb3NpdAAAAAAAAAAAAAAAAN4B4IhHLFEKEYmA7b+xoX8W4tf3AA\
        AAAAayQk4="
        mockedServer.post(`/v1/accounts/${accountId}/deposit`, {
            amount: amountToDeposit.toDecimal(),
            instrumentId: ALGO_INSTRUMENT.id,
            wormholeVAA,
            repayAmount: amountToRepay.toDecimal(),
        }).reply(200, { id: "CAFCAFCAFCAFCAFCAFCAFCAFCAF" })
        const response = await sdk.submitWormholeVAA(accountId, amountToDeposit, wormholeVAA, amountToRepay)
        expect(response.id).to.be.a("string")
    })
})