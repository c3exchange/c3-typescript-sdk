

import algosdk, { bigIntToBytes } from "algosdk";
import { _parseVAAAlgorand } from '@certusone/wormhole-sdk/lib/cjs/algorand'
import { AssetId, Instrument } from "../interfaces";
import { CHAIN_ID_ALGORAND, assertChain, isEVMChain, toChainName } from "./constants";
import { SUPPORTED_CHAIN_IDS, isChainIdSupported } from "../chains";
import { ChainId } from "./types";
import { ETHEREUM_ADDRESS_LENGTH, PUBLIC_KEY_LENGTH } from "../utils";
import { tryHexToNativeString, tryNativeToHexString, tryUint8ArrayToNative, uint8ArrayToHex } from "@certusone/wormhole-sdk";

export const validateVaa = (vaa: Uint8Array, instruments: Map<AssetId, Instrument>, appId: number) => {
    const PAYLOAD_DEPOSIT_HEADER = "wormholeDeposit"
    const acceptedPayloads: Set<string> = new Set<string>([PAYLOAD_DEPOSIT_HEADER])
    const parsedVaa = _parseVAAAlgorand(vaa)

    if (parsedVaa.Type !== 0x3) {
        throw new Error('VAA: Unsupported payload type')
    }

    if (parsedVaa.Payload === undefined) {
        throw new Error('VAA: Payload not present')
    }
    const payloadText = Buffer.from(parsedVaa.Payload).subarray(0, PAYLOAD_DEPOSIT_HEADER.length).toString('utf8')

    if (!acceptedPayloads.has(payloadText)) {
        throw new Error('VAA: Unexpected payload')
    }

    if (payloadText === "wormholeDeposit") {
        if (parsedVaa.ToAddress && (0 !== Buffer.compare(parsedVaa.ToAddress, Buffer.from(bigIntToBytes(appId, 32))))) {
            throw new Error('VAA: Unexpected target address')
        }

        assertChain(parsedVaa.ToChain ?? -1);
        const toChainId = parsedVaa.ToChain as ChainId;
        if (toChainId !== CHAIN_ID_ALGORAND) {
            if (!isEVMChain(toChainId)) {
                throw new Error(`VAA: Invalid destination chain ${toChainName(toChainId)}`)
            }
        }

        if (parsedVaa.FromChain && !isChainIdSupported(parsedVaa.FromChain)) {
            throw new Error('VAA: Invalid source chain')
        }

        if (!parsedVaa.FromAddress) {
            throw new Error("VAA: Source address not present")
        }

        if (!parsedVaa.Contract || !parsedVaa.Amount) {
            throw new Error("VAA: Required fields absent ")
        }

        const supportedChains = SUPPORTED_CHAIN_IDS.filter(chainId => chainId !== CHAIN_ID_ALGORAND).map(chainId => toChainName(chainId))

        const instrument = Array.from(instruments.values()).find(
            ({ chains: instrumentChain }) => instrumentChain && instrumentChain.length > 0
            && instrumentChain.find( 
                (chain) => chain.chainId === parsedVaa.FromChain && 
                           chain.tokenAddress?.toLocaleLowerCase() === tryHexToNativeString(parsedVaa.Contract!, parsedVaa.FromChain).toLocaleLowerCase()))

        if (!instrument) {
            throw new Error("Unknown Algorand-side instrument for such remote token")
        }

        const amountBuffer = Buffer.from(parsedVaa.Amount)

        if (amountBuffer.readBigUInt64BE(0) !== BigInt(0) ||
            amountBuffer.readBigUInt64BE(8) !== BigInt(0) ||
            amountBuffer.readBigUInt64BE(16) !== BigInt(0)) {
            console.warn(`Truncation Loss! VAA  amount field exceeds UInt64: ${amountBuffer.toString('hex')}`)
        }

        const startByte = PAYLOAD_DEPOSIT_HEADER.length + PUBLIC_KEY_LENGTH
        const repayAmountBuffer = Buffer.from(parsedVaa.Payload).subarray(startByte, startByte + algosdk.encodeUint64(BigInt(0)).length)

        return {
            parsedVaa,
            amountBuffer,
            instrument,
            from: tryUint8ArrayToNative(parsedVaa.FromAddress, parsedVaa.FromChain as ChainId),
            fromChainId: parsedVaa.chain as ChainId,
            repayAmountBuffer,
        }
    } else {
        throw new Error("Unimplemented operation")
    }
}