import algosdk, { Transaction } from 'algosdk'
import { UserAddress } from '../interfaces'
import { SignCallback, TealSignCallback, AlgorandSigner } from './MessageSigner'

export class Signer {
    private signatures: Map<UserAddress, Uint8Array> = new Map()
    readonly callback: SignCallback
    readonly tealCallback: TealSignCallback

    constructor() {
        this.callback = this.sign.bind(this)
        this.tealCallback = this.tealSign.bind(this)
    }

    private getPrivateKey(addr: UserAddress): Uint8Array {
        const pk = this.signatures.get(addr)
        if (pk === undefined)
            throw new Error("Couldn't find account " + addr + " for signing")
        return pk
    }

    addFromMnemonic(mnemonic: string): AlgorandSigner {
        const account = algosdk.mnemonicToSecretKey(mnemonic)
        this.signatures.set(account.addr, account.sk)
        return new AlgorandSigner(account.addr, this.callback, this.tealCallback)
    }

    addFromSecretKey(secretKey: Uint8Array): AlgorandSigner {
        const mnemonic = algosdk.secretKeyToMnemonic(secretKey)
        return this.addFromMnemonic(mnemonic)
    }

    createAccount(): AlgorandSigner {
        const { sk: secretKey, addr: address } = algosdk.generateAccount();
        this.signatures.set(address, secretKey)
        return new AlgorandSigner(address, this.callback, this.tealCallback)
    }

    async sign(txs: Transaction[]): Promise<Uint8Array[]> {
        return Promise.all(txs.map(async tx => {
            const sender = algosdk.encodeAddress(tx.from.publicKey)
            return tx.signTxn(this.getPrivateKey(sender))
        }))
    }

    rawSign(txs: Transaction[]): Uint8Array[] {
        return txs.map(tx => {
            const sender = algosdk.encodeAddress(tx.from.publicKey)
            return tx.rawSignTxn(this.getPrivateKey(sender))
        })
    }

    async tealSign(data: Uint8Array, from: UserAddress): Promise<Uint8Array> {
        return algosdk.signBytes(data, this.getPrivateKey(from))
    }
}
