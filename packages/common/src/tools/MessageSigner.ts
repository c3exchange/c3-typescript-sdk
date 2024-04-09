import algosdk from "algosdk"
import { ethers } from "ethers"
import type { RawSignature, SignedMessage, UserAddress } from "../interfaces"
import { CHAIN_ID_ETH, CHAIN_ID_ALGORAND, ChainId, CHAIN_ID_SOLANA } from "../wormhole"
import { ALGORAND_ZERO_ADDRESS_STRING } from "../chains/algorand"
import type { SupportedChainId } from "../chains"
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"

type MessageSignCallback = (data: Uint8Array) => Promise<RawSignature>
type SignCallback = (txs: algosdk.Transaction[]) => Promise<Uint8Array[]>
type TealSignCallback = (data: Uint8Array, address: UserAddress, hash: string) => Promise<SignedMessage>

abstract class MessageSigner {
    public constructor(
        readonly address: UserAddress,
        readonly chainId: ChainId,
        readonly msgSignCallback: MessageSignCallback
    ) {
        // Make sure the callback is bound to this instance
        this.msgSignCallback = msgSignCallback.bind(this)
        this.signMessage = this.signMessage.bind(this)
    }

    public async signMessage(message: Uint8Array): Promise<Uint8Array> {
        return this.msgSignCallback(message)
    }

    public toString(): string {
        return `${this.chainId}/${this.address}`
    }
}

class AlgorandSigner extends MessageSigner {
    public constructor(
        address: UserAddress,
        private txSignCallback: SignCallback,
        tealSignCallback: TealSignCallback,
        public readonly isArc001: boolean = false,
    ) {
        const messageCallback = (data: Uint8Array) => tealSignCallback(data, address, ALGORAND_ZERO_ADDRESS_STRING)
        super(address, CHAIN_ID_ALGORAND, messageCallback)
    }

    public async signTransactions(txs: algosdk.Transaction[]): Promise<Uint8Array[]> {
        return this.txSignCallback(txs)
    }
}

class EVMSigner extends MessageSigner {
    public constructor(
        address: UserAddress,
        chainId: Exclude<SupportedChainId, typeof CHAIN_ID_ALGORAND>,
        private signer: ethers.Signer,
    ) {
        const messageCallback = async (data: Uint8Array) => {
            const signedBytes = await signer.signMessage(data)
            return new Uint8Array(Buffer.from(signedBytes.substring(2), "hex"))
        }

        super(address, chainId, messageCallback)
    }

    public getSigner(): ethers.Signer {
        return this.signer
    }
}

type SolanaTransaction = Transaction | VersionedTransaction
type SolanaSignTxCallback<T extends SolanaTransaction = SolanaTransaction> = (tx: T) => Promise<T>

class SolanaSigner extends MessageSigner {
    public constructor(
        address: UserAddress,
        readonly publickey: PublicKey,
        readonly signTransaction: SolanaSignTxCallback,
        signMessage: (messageToSign: Uint8Array) => Promise<RawSignature>,
        readonly connection?: Connection
    ) {
        super(address, CHAIN_ID_SOLANA, signMessage)
    }
}

export type {
    MessageSignCallback,
    SignCallback,
    TealSignCallback,
    SolanaSignTxCallback,
}

export {
    MessageSigner,
    AlgorandSigner,
    EVMSigner,
    SolanaSigner
}
