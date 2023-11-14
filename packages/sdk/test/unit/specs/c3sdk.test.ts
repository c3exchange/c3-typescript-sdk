import "mocha"
import { expect } from "chai"
import "../helpers/mock.responses"
import Market from "../../../src/entities/markets"
import { defaultConfig } from "../../../src/config"
import AccountClient from "../../../src/entities/account"
import { C3SDK, C3SDKConfig } from "../../../src"
import { AlgorandSigner, CHAIN_ID_ALGORAND } from "@c3exchange/common"

describe ("C3Sdk tests", () => {
    const address = "XROK3OJI5BFYZ4LI3EJJLZNXR5G5BXDRM2455KEZ4ZUTBAOHGFFPMVXFJE";
    const chainId = CHAIN_ID_ALGORAND;

    it("Should instantiate the class without arguments", () => {
        const sdk = new C3SDK()
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
        const sdk = new C3SDK(config)
        // @ts-expect-error
        expect(sdk.config).to.be.deep.equal(config)
    })
    it("Should have markets attribute", () => {
        const sdk = new C3SDK()
        expect(sdk).itself.to.respondTo("getMarkets")
        expect(sdk.getMarkets()).to.be.instanceOf(Market)
    })
    it("Should call getInstruments method", async () => {
        const sdk = new C3SDK()
        expect(sdk).itself.to.respondTo("getInstruments")
        await sdk.getInstruments()
    })
    it("Should login with address and chainId and get an AccountClient interface", async () => {
        const sdk = new C3SDK()
        const algorandSigner = new AlgorandSigner(
            address, (txs) => Promise.resolve([new Uint8Array()]),
            () => Promise.resolve(new Uint8Array(Buffer.from("'ckZv+nU2/gfUs944SEjDbo6xl33wt33jah1lshabpAQ='", 'ascii')))
        )
        const accountClient = await sdk.login(algorandSigner);
        expect(accountClient).to.be.instanceOf(AccountClient);
        expect(accountClient).to.have.ownProperty("session");
    })

    it("Should fail to login with wrong address and chainId", async () => {
        try {
            const sdk = new C3SDK()
            const algorandSigner = new AlgorandSigner(
                address, (txs) => Promise.resolve([new Uint8Array()]),
                () => Promise.reject(new Error("Wrong signature"))
            )
            await sdk.login(algorandSigner);
            expect.fail("Should fail to login with wrong address and chainId");
        } catch (e) {
            expect(e).to.be.instanceOf(Error);
        }
    })
})