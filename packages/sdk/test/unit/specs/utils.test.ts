import "mocha"
import { expect } from "chai"
import { cryptoUtilsBuilder } from "../../../src/internal/utils/crypto"
import algosdk from "algosdk"
import { removeUndefinedProperties } from "../../../src/internal/utils/object"

describe("CryptoUtils tests", () => {
    const cryptoUtils = cryptoUtilsBuilder()
    const keyInHex = "d8b71f22aa6d2e605c945a3e61f0dee9749b52add70079c4ed65965cb3eaa460"
    const masterkey = new Uint8Array(Buffer.from(keyInHex, "hex"))
    it ("Should encrypt and decrypt a values", async () => {
        const valueToEncrypt = "Hello, World!"
        const encrypted = await cryptoUtils.encrypt(masterkey, new Uint8Array(Buffer.from(valueToEncrypt, "ascii")))
        const decrypted = await cryptoUtils.decrypt(masterkey, encrypted)
        const decryptedString = Buffer.from(decrypted).toString("ascii")
        expect(decryptedString).to.equal(valueToEncrypt)
    })
    it ("Should encrypt and decrypt a secret key", async () => {
        const account = algosdk.generateAccount()
        const encrypted = await cryptoUtils.encrypt(masterkey, account.sk)
        const decrypted = await cryptoUtils.decrypt(masterkey, encrypted)
        expect(account.sk).to.be.deep.equal(decrypted)
    })
    it("Should remove undefined properties", () => {
        const obj = { a: 1, b: undefined, c: 5, d: null }
        const result = removeUndefinedProperties(obj)
        expect(result).to.deep.equal({ a: 1, c: 5 })
    })
})