import algosdk from "algosdk"
import * as Z from "zod"
import {
    ALL_MARKETS_ID,
    AccountId,
    MarketId,
    InstrumentId,
    GranularityResolution,
    Base64,
    Integer,
    OperationStatus,
    AccountOperationType,
    NewOrderDataRequest,
} from "../interfaces"
import { isChainId, ChainId, ChainName, isChainName } from "../wormhole"
import { isValidAddress } from "../chains"
import BigNumber from "bignumber.js"
import { isValidAccountId } from "../utils"

// characters allowed in string: A-Z, a-z, 0-9, space, \r, \n,
const safeStringSchema = Z.string().regex(/^[^()><\-+?]+$/,"String contains invalid characters")
const base64Schema = Z.string().regex(/[A-Za-z0-9+/]={0,2}/)

function parseString (value: any, defaultValue?: string): string
function parseString (value: any, defaultValue: string, optional?: boolean): string
function parseString (value: any, defaultValue?: string, optional?: boolean): string | undefined
    function parseString (value: any, defaultValue?: string, optional?: boolean): string | undefined {
    return (optional ? safeStringSchema.optional() : safeStringSchema).parse(value ?? defaultValue)
}

function parseStringArray (value: any, defaultValue?: string[]): string[]
function parseStringArray (value: any, defaultValue: string[], optional?: boolean): string[]
function parseStringArray (value: any, defaultValue?: string[], optional?: boolean): string[] | undefined
function parseStringArray (value: any, defaultValue?: string[], optional?: boolean): string[] | undefined {
    const zStringArray = Z.array(safeStringSchema)
    return (optional ? zStringArray.optional() : zStringArray).parse(value ?? defaultValue)
}

function parseOrderIdArray (value: any, defaultValue?: string[], optional?: boolean): string[] | undefined {
    const zStringArray = Z.array(base64Schema)
    return (optional ? zStringArray.optional() : zStringArray).parse(value ?? defaultValue)
}


const contractAmountSchema = Z.bigint().nonnegative().or(Z.string().transform((x) => parseBigInt(x)))
const positiveIntegerSchema = Z.number().int().nonnegative().or(Z.string().transform((x) => parseInt(x)).refine((n) => Number.isInteger(n) && n >= 0))
function parsePositiveInteger (value: any, defaultValue?: Integer): Integer
function parsePositiveInteger (value: any, defaultValue: Integer, optional?: boolean): Integer
function parsePositiveInteger (value: any, defaultValue?: Integer, optional?: boolean): Integer|undefined
function parsePositiveInteger (value: any, defaultValue?: Integer, optional?: boolean): Integer|undefined {
    const valueToParse = value ?? defaultValue
    return (optional ? positiveIntegerSchema.optional(): positiveIntegerSchema).parse(valueToParse)
}


function parseBase64 (value: any, defaultValue?: Base64): Base64 {
    return base64Schema.parse(value ?? defaultValue)
}

function parseBoolean (value: any, defaultValue?: boolean): boolean
function parseBoolean (value: any, defaultValue?: boolean, optional?: true): boolean|undefined
function parseBoolean (value: any, defaultValue?: boolean, optional?: true): boolean|undefined {
    const zBoolean = Z.boolean().or(Z.string().refine((b) => b === "true" || b === "false").transform((x) =>
        (typeof x === "string") ? (x === "true" ? true : x === "false" ? false : undefined) : undefined
    ))
    return (optional ? zBoolean.optional(): zBoolean).parse(value ?? defaultValue)
}

function parseBigInt (value: any, defaultValue?: bigint): bigint {
    return Z.bigint().or(Z.string().transform((x) => BigInt(x))).refine((x) => x >= 0).parse(value ?? defaultValue)
}

const parseAccountIdSchema = Z.string().refine(isValidAccountId)
function parseAccountId (value: any, defaultValue?: AccountId): AccountId {
    return parseAccountIdSchema.parse(value ?? defaultValue)
}


const isValidMarketId = (marketId: string): boolean => {
    return marketId === ALL_MARKETS_ID || marketId.split("-").length === 2
}

function parseMarketId (value: any, defaultValue?: MarketId): MarketId {
    return Z.string().refine(isValidMarketId).parse(value ?? defaultValue)
}

function parseInstrumentId (value: any, defaultValue?: InstrumentId): InstrumentId {
    return Z.string().parse(value ?? defaultValue)
}

const parseInstrumentIdArraySchema = Z.array(Z.string())
function parseInstrumentIdArray (value: any, optional?: boolean): InstrumentId[]|undefined {
    return (optional ? parseInstrumentIdArraySchema.optional() : parseInstrumentIdArraySchema).parse(value)
}

const parsePriceStringSchema = Z.string().regex(/\d+(\.\d+)?/).refine((x) => new BigNumber(x).isPositive())
function parsePriceString (value: any, defaultValue?: string): string
function parsePriceString (value: any, defaultValue: string, optional?: boolean): string
function parsePriceString (value: any, defaultValue?: string, optional?: boolean): string|undefined
function parsePriceString (value: any, defaultValue?: string, optional?: boolean): string|undefined {
    const valueToParse = value ?? defaultValue
    const regexParser = parsePriceStringSchema
    return (optional ? regexParser.optional() : regexParser).parse(valueToParse)
}

const parseUserAddressSchema = Z.string().refine((x) => isValidAddress(x))
function parseUserAddress (value: any, defaultValue?: string): string
function parseUserAddress (value: any, defaultValue: string, optional?: boolean): string
function parseUserAddress (value: any, defaultValue?: string, optional?: boolean): string|undefined
function parseUserAddress (value: any, defaultValue?: string, optional?: boolean): string|undefined {
    const valueToParser = value ?? defaultValue
    const addressParser = parseUserAddressSchema
    return (optional ? addressParser.optional() : addressParser).parse(valueToParser)
}

function parseGranularityName (value: any, defaultValue?: GranularityResolution): GranularityResolution {
    return Z.nativeEnum(GranularityResolution).parse(value ?? defaultValue)
}

function parseChainId (value: any, defaultValue?: ChainId): ChainId
function parseChainId (value: any, defaultValue?: ChainId, optional?: boolean): ChainId | undefined
function parseChainId (value: any, defaultValue?: ChainId, optional?: boolean): ChainId | undefined {
    const chainIdParser = Z.number().int().positive().refine(isChainId)
    return (optional ? chainIdParser.optional() : chainIdParser).parse(value ?? defaultValue) as ChainId
}

function parseChainName (value: any, defaultValue?: ChainName): ChainName
function parseChainName (value: any, defaultValue?: ChainName, optional?: boolean): ChainName | undefined
function parseChainName (value: any, defaultValue?: ChainName, optional?: boolean): ChainName | undefined {
    const chainNameParser = Z.string().refine(isChainName)
    return (optional ? chainNameParser.optional() : chainNameParser).parse(value ?? defaultValue) as ChainName
}

const parseOperationStatusArraySchema = Z.array(Z.nativeEnum(OperationStatus))
function parseOperationStatusArray (value: any): OperationStatus[]
function parseOperationStatusArray (value: any, optional?: boolean): OperationStatus[]|undefined
function parseOperationStatusArray (value: any, optional?: boolean): OperationStatus[]|undefined {
    return (optional ? parseOperationStatusArraySchema.optional() : parseOperationStatusArraySchema).parse(value)
}

const parseAccountOperationTypeArraySchema = Z.array(Z.nativeEnum(AccountOperationType))
function parseAccountOperationTypeArray (value: any): AccountOperationType[]
function parseAccountOperationTypeArray (value: any, optional?: boolean): AccountOperationType[]|undefined
function parseAccountOperationTypeArray (value: any, optional?: boolean): AccountOperationType[]|undefined {
    return (optional ? parseAccountOperationTypeArraySchema.optional() : parseAccountOperationTypeArraySchema).parse(value)
}
const parseSignature = parseBase64
const parseTimestamp = parsePositiveInteger
const parseContractAmount = parseBigInt
const parseDelegationId = parseString

// Parse request
const newOrderDataSchema = Z.object({
    marketId: Z.string(),
    type: Z.enum(["market", "limit"]).refine((x) => x === "limit" || x === "market"),
    size: parsePriceStringSchema,
    price: parsePriceStringSchema.optional(),
    side: Z.enum(["buy", "sell"]).refine((x) => x === "buy" || x === "sell"),
    sentTime: positiveIntegerSchema,
    settlementTicket: Z.object({
        account: base64Schema,
        creator: parseUserAddressSchema,
        buySlotId: positiveIntegerSchema,
        buyAmount: contractAmountSchema,
        sellSlotId: positiveIntegerSchema,
        sellAmount: contractAmountSchema,
        maxSellAmountFromPool: contractAmountSchema,
        maxBuyAmountToPool: contractAmountSchema,
        expiresOn: positiveIntegerSchema,
        nonce: positiveIntegerSchema,
        signature: Z.string(),
    }),
    clientOrderId: Z.string().optional(),
})
const parseNewOrdersRequest = (newOrdersRequest: any, accountId: AccountId): NewOrderDataRequest[] => {
    const newOrderDataArraySchema = Z.array(newOrderDataSchema)
    const body = Array.isArray(newOrdersRequest) ? newOrderDataArraySchema.parse(newOrdersRequest) : [ newOrderDataSchema.parse(newOrdersRequest) ]
    return  body.map((body) => {
        return {
            account: accountId,
            ...body,
        }})
}

export { ZodError } from "zod"

export {
    parseString,
    parseStringArray,
    parseOrderIdArray,
    parsePositiveInteger,
    parseBase64,
    parseBigInt,
    parseSignature,
    parseBoolean,
    parseTimestamp,
    parseContractAmount,
    parseAccountId,
    parseMarketId,
    parseInstrumentId,
    parseInstrumentIdArray,
    parsePriceString,
    parseUserAddress,
    parseGranularityName,
    parseChainId,
    parseChainName,
    parseOperationStatusArray,
    parseAccountOperationTypeArray,
    parseNewOrdersRequest,
    parseDelegationId,
}
