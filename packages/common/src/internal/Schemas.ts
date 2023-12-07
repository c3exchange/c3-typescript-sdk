import { isValidAddress } from 'algosdk'
import { ethers } from 'ethers'
import * as Z from 'zod'
import { isValidAccountId } from "../utils"
import { isChainName, ChainName } from "../wormhole/index"


// Base types
export const base64Schema = Z.string().regex(/[A-Za-z0-9+/]={0,2}/)
export const positiveIntSchema = Z.number().int().nonnegative().or(Z.string().transform((x) => parseInt(x)))
export const signatureSchema = base64Schema

// Export types
export const accountAddressSchema = Z.string().refine(isValidAccountId)
export const addressSchema = Z.string().refine((x) => isValidAddress(x) || ethers.utils.isAddress(x))

export const slotIdSchema = positiveIntSchema.refine((x) => x <= 255)
export const assetIdSchema = positiveIntSchema
export const appIdSchema = positiveIntSchema
export const timestampSchema = positiveIntSchema
export const booleanSchema = Z.boolean()

export const transactionIdSchema = Z.string()

export const granularityNameSchema = Z.string()

export const marketIdSchema = Z.string()

export const contractAmountSchema = Z.bigint().or(Z.string().transform((x) => BigInt(x))).refine((x) => x >= 0 && x <= BigInt("0xFFFFFFFFFFFFFFFF"))

export const decimalAmountSchema = Z.string().regex(/^\d+(\.\d+)?$/)

export const wormholeChainNameSchema = Z.custom<ChainName>().refine(isChainName);

export const wormholeEntityIdSchema = Z.object({
	chain: wormholeChainNameSchema,
	tokenAddress: addressSchema
})

export const assetSchema = Z.object({
  id: assetIdSchema,
  name: Z.string(),
  unitName: Z.string(),
  decimals: Z.number().int(),
  url: Z.string(),
  origins: Z.array(wormholeEntityIdSchema),
})

export const priceStringSchema = Z.string().regex(/\d+(\.\d+)?/)

export const pairIdSchema = positiveIntSchema

export const healthRequestSchema = Z.object({
	user: addressSchema,
	initial: Z.boolean(),
})

export const cancelDataSchema = Z.object({
	owner: positiveIntSchema,
	orderId: base64Schema,
	sellSlotId: assetIdSchema,
	sellAmount: contractAmountSchema,
	cancelOn: timestampSchema,
	// TODO: Rename this field to promisedLoan? Or add max_repay?
	maxBorrow: contractAmountSchema,
})

export const signedCancelSchema = Z.object({
	data: cancelDataSchema,
	serverSignature: signatureSchema,
})


// Type definitions
export type AccountAddress = Z.TypeOf<typeof accountAddressSchema>
export type WormholeEntityId = Z.TypeOf<typeof wormholeEntityIdSchema>
export type UnixTimestampInMiliSeconds = Z.TypeOf<typeof timestampSchema>
export type Asset = Z.TypeOf<typeof assetSchema>
export type HealthRequest = Z.TypeOf<typeof healthRequestSchema>
export type CancelData = Z.TypeOf<typeof cancelDataSchema>
export type SignedCancel = Z.TypeOf<typeof signedCancelSchema>
