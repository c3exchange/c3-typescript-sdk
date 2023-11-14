import "mocha"
import { expect } from "chai"
import * as Parsers from "../src/tools/parser"
import { AccountOperationType, GranularityResolution, NewOrderDataRequest, OperationStatus, SUPPORTED_CHAIN_IDS } from "../src"

describe("Parser tests", () => {
    it("Should parse a string", () => {
        const parseString = Parsers.parseString
        const testString = "TEST"
        expect(parseString(testString), "with value").to.be.equal(testString)
        expect(() => parseString(5), "with number").to.throw()
        expect(parseString(undefined, testString), "with undefined").to.be.equal(testString)
        expect(parseString(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parseString(undefined, testString, true), "with undefined, optional and default value").to.be.equal(testString)
        expect(() => parseString("doSomeEvilStuff()"), "String contains invalid characters").to.throw()
        expect(() => parseString("doSomeEvilStuff ? a : b "), "String contains invalid characters").to.throw()

    })
    it("Should parse a string array", () => {
        const parseStringArray = Parsers.parseStringArray
        const testStringArray = ["TEST1", "TEST2"]
        expect(parseStringArray(testStringArray), "with value").to.be.deep.equal(testStringArray)
        expect(() => parseStringArray(5), "with number").to.throw()
        expect(parseStringArray(undefined, testStringArray), "with undefined").to.be.deep.equal(testStringArray)
        expect(parseStringArray(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parseStringArray(undefined, testStringArray, true), "with undefined, optional and default value").to.be.deep.equal(testStringArray)
    })
    it("Should parse a positive integer", () => {
        const parsePositiveInteger = Parsers.parsePositiveInteger
        const testNumber = 5
        expect(parsePositiveInteger(testNumber), "with value").to.be.equal(testNumber)
        expect(parsePositiveInteger(testNumber.toString()), "with string value").to.be.equal(testNumber)
        expect(() => parsePositiveInteger(-6), "with negative number").to.throw()
        expect(parsePositiveInteger(undefined, testNumber), "with undefined").to.be.equal(testNumber)
        expect(parsePositiveInteger(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parsePositiveInteger(undefined, testNumber, true), "with undefined, optional and default value").to.be.equal(testNumber)
        expect(() => parsePositiveInteger("TEST"), "with invalid string").to.throw()
    })
    it("Should parse a base64 string", () => {
        const parseBase64 = Parsers.parseBase64
        const testBase64String = Buffer.from("TEST", "ascii").toString("base64")
        expect(parseBase64(testBase64String), "with value").to.be.equal(testBase64String)
        // TODO: This should throw an error
        // expect(() => parseBase64("TEST"), "with invalid string").to.throw()
        expect(parseBase64(undefined, testBase64String), "with undefined").to.be.equal(testBase64String)
    })

    it("Should parse a order Id array", () => {
        const parseOrderIdArray = Parsers.parseOrderIdArray
        const testStringArray = ["TG/7xhAXbUko2LdWEg66Z6QDp0qGpA7WQx/3G4bx0DU=", "/wrt9z6YPyYprBcDP264M/jU6RE75HvQJr6o3vLo7HE="]
        expect(parseOrderIdArray(testStringArray), "with value").to.be.deep.equal(testStringArray)
        expect(() => parseOrderIdArray(5), "with number").to.throw()
        expect(parseOrderIdArray(undefined, testStringArray), "with undefined").to.be.deep.equal(testStringArray)
        expect(parseOrderIdArray(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parseOrderIdArray(undefined, testStringArray, true), "with undefined, optional and default value").to.be.deep.equal(testStringArray)
    })
    it("Should parse a boolean", () => {
        const parseBoolean = Parsers.parseBoolean
        const testBoolean = true
        expect(parseBoolean(testBoolean), "with value").to.be.equal(testBoolean)
        expect(parseBoolean("true"), "with string value").to.be.equal(true)
        expect(parseBoolean("false"), "with string value").to.be.equal(false)
        expect(() => parseBoolean("TEST"), "with invalid string").to.throw()
        expect(parseBoolean(undefined, testBoolean), "with undefined").to.be.equal(testBoolean)
        expect(parseBoolean(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parseBoolean(undefined, testBoolean, true), "with undefined, optional and default value").to.be.equal(testBoolean)
    })
    it("Should parse a bigint", () => {
        const parseBigInt = Parsers.parseBigInt
        const testBigInt = BigInt(5)
        expect(parseBigInt(testBigInt), "with value").to.be.equal(testBigInt)
        expect(parseBigInt(testBigInt.toString()), "with string value").to.be.equal(testBigInt)
        expect(() => parseBigInt("TEST"), "with invalid string").to.throw()
        expect(parseBigInt(undefined, testBigInt), "with undefined").to.be.equal(testBigInt)
    })
    it("Should parse an accountId", () => {
        const parseAccountId = Parsers.parseAccountId
        const testAccountId = "C3_L6VD42QWIR2ESDCZKY7B7TIYVSZNLKKLNHFODICR35B4YPOULFK6USCS"
        expect(parseAccountId(testAccountId), "with value").to.be.equal(testAccountId)
        expect(() => parseAccountId(5), "with number").to.throw()
        expect(() => parseAccountId("TEST"), "with string").to.throw()
        expect(parseAccountId(undefined, testAccountId), "with undefined").to.be.equal(testAccountId)
    })
    it("Should parse a marketId", () => {
        const parseMarketId = Parsers.parseMarketId
        const marketId = "ALGO-USDT"
        expect(parseMarketId(marketId), "with value").to.be.equal(marketId)
        expect(() => parseMarketId(5), "with number").to.throw()
        expect(() => parseMarketId("TEST"), "with string").to.throw()
        expect(parseMarketId(undefined, marketId), "with undefined").to.be.equal(marketId)
    })
    it("Should parse an instrumentId", () => {
        const parseInstrumentId = Parsers.parseInstrumentId
        const instrumentId = "ETH"
        expect(parseInstrumentId(instrumentId), "with value").to.be.equal(instrumentId)
        expect(() => parseInstrumentId(5), "with number").to.throw()
        expect(parseInstrumentId(undefined, instrumentId), "with undefined").to.be.equal(instrumentId)
    })
    it("Should parse a price", () => {
        const parsePrice = Parsers.parsePriceString
        const price = "6.54"
        expect(parsePrice(price), "with value").to.be.equal(price)
        expect(() => parsePrice("TEST"), "with invalid string").to.throw()
        expect(parsePrice(undefined, price), "with undefined").to.be.equal(price)
        expect(parsePrice(undefined, undefined, true), "with undefined and optional").to.be.undefined
        expect(parsePrice(undefined, price, true), "with undefined, optional and default value").to.be.equal(price)
    })
    it("Should parse a user address", () => {
        const parseUserAddress = Parsers.parseUserAddress
        const userAddresses = ["0xa61BB243CF00Cd407ffAE11FDc51f5976cd2382D", "46QNIYQEMLKNOBTQC56UEBBHFNH37EWLHGT2KGL3ZGB4SW77W6V7GBKPDY"]
        for (const userAddress of userAddresses) {
            expect(parseUserAddress(userAddress), userAddresses + " with value").to.be.equal(userAddress)
            expect(() => parseUserAddress(5), userAddresses + " with number").to.throw()
            expect(parseUserAddress(undefined, userAddress), userAddresses + " with undefined").to.be.equal(userAddress)
            expect(parseUserAddress(undefined, undefined, true), userAddresses + " with undefined and optional").to.be.undefined
            expect(parseUserAddress(undefined, userAddress, true), userAddresses + " with undefined, optional and default value").to.be.equal(userAddress)
            expect(() => parseUserAddress("TEST"), userAddresses + " with invalid string").to.throw()
        }
    })
    it("Should parse granularity name", () => {
        const parseGranularityName = Parsers.parseGranularityName
        const granularityNames: GranularityResolution[] = Object.values(GranularityResolution)
        for (const granularityName of  granularityNames) {
            expect(parseGranularityName(granularityName), granularityNames + " with value").to.be.equal(granularityName)
            expect(() => parseGranularityName(5), granularityNames + " with number").to.throw()
            expect(parseGranularityName(undefined, granularityName), granularityNames + " with undefined").to.be.equal(granularityName)
            expect(() => parseGranularityName("TEST"), granularityNames + " with invalid string").to.throw()
        }
    })
    it("Should parse a chain id", () => {
        const parseChainId = Parsers.parseChainId
        const chainIds = SUPPORTED_CHAIN_IDS
        for (const chainId of chainIds) {
            expect(parseChainId(chainId), chainIds + " with value").to.be.equal(chainId)
            expect(() => parseChainId(500000000), chainIds + " with number").to.throw()
            expect(() => parseChainId(BigInt(5)), chainIds + " with BIGnumber").to.throw()
            expect(parseChainId(undefined, chainId), chainIds + " with undefined").to.be.equal(chainId)
            expect(() => parseChainId("TEST"), chainIds + " with invalid string").to.throw()
        }
    })
    it("Should parse operation status schema", () => {
        const parseOperationStatusArray = Parsers.parseOperationStatusArray
        const operationStatuses = Object.values(OperationStatus)
        for (const operationStatus of operationStatuses) {
            expect(parseOperationStatusArray([operationStatus])).to.be.deep.equal([operationStatus])
            expect(() => parseOperationStatusArray(500000000), operationStatuses + " with number").to.throw()
            expect(() => parseOperationStatusArray(BigInt(5)), operationStatuses + " with BIGnumber").to.throw()
            expect(() => parseOperationStatusArray("TEST"), operationStatuses + " with invalid string").to.throw()
        }
        expect(parseOperationStatusArray([OperationStatus.PENDING, OperationStatus.SETTLED]), operationStatuses + " with value").to.be.deep.equal([OperationStatus.PENDING, OperationStatus.SETTLED])
    })
    it("Should parse account operation type schema", () => {
        const parseAccountOperationTypeArray = Parsers.parseAccountOperationTypeArray
        const accountOperationTypes = Object.values(AccountOperationType)
        for (const accountOperationType of accountOperationTypes) {
            expect(parseAccountOperationTypeArray([accountOperationType]), accountOperationTypes + " with value").to.be.deep.equal([accountOperationType])
            expect(() => parseAccountOperationTypeArray(500000000), accountOperationTypes + " with number").to.throw()
            expect(() => parseAccountOperationTypeArray(BigInt(5)), accountOperationTypes + " with BIGnumber").to.throw()
            expect(() => parseAccountOperationTypeArray("TEST"), accountOperationTypes + " with invalid string").to.throw()
        }
        expect(parseAccountOperationTypeArray([AccountOperationType.DEPOSIT, AccountOperationType.WITHDRAW]), accountOperationTypes + " with value").to.be.deep.equal([AccountOperationType.DEPOSIT, AccountOperationType.WITHDRAW])
    })
    it("Should parse a newOrderDataRequest", () => {
        const parseNewOrderRequest = Parsers.parseNewOrdersRequest
        const request: any = {
            type: "limit",
            side: "sell",
            size: "100",
            marketId: "BTC-USDT",
            sentTime: 1689091481753,
            clientOrderId: "1234-567-890",
            settlementTicket: {
                account: "34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4",
                creator: "MKRTMBATIWUFMGAILZFQUWKVON2DCBUUC26FLY34KY3HLE4HCPYSCZA42M",
                buySlotId: 1,
                buyAmount: BigInt("12").toString(),
                sellSlotId: 0,
                sellAmount: BigInt("500000").toString(),
                maxSellAmountFromPool: BigInt("0").toString(),
                maxBuyAmountToPool: BigInt("0").toString(),
                expiresOn: 1689177881,
                nonce: 1111111,
                signature: "mR5Z/8VyfCguKYReRQ3KIo4O5PMYFzrHMD+GrGi4f1etC0NHQEyd5rmW8VcyKzgQN6RVZBysk9Brj2iNxwqyDQ=="
            }
        }
        expect(() => parseNewOrderRequest(request,"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.not.throw()
        expect(() => parseNewOrderRequest(5,"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, type: "limit2"},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, side: "sell2"},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, side: "buy"},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.not.throw()
        expect(() => parseNewOrderRequest({ ...request, type: "market"},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.not.throw()
        expect(() => parseNewOrderRequest({ ...request, sentTime: -16890914817 },"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: undefined },"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, account: 5 }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, creator: 5 }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, buySlotId: "hhh" }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, buyAmount: "-5A" }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, sellSlotId: {} }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, sellAmount: -5 }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, maxSellAmountFromPool: "AA" }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
        expect(() => parseNewOrderRequest({ ...request, settlementTicket: { ...request.settlementTicket, maxBuyAmountToPool: "-5" }},"34KFG6YWFDFK7CXNKNZEKOJFFVB2KCWHHI5POJNDHHKEMMKDESFQPYH5W4")).to.throw()
    })
})