import { BigNumber, Contract, ContractInterface, ContractTransaction, Overrides, Signer, providers } from "ethers"
import { UserAddress } from "../interfaces"

const ERC20_INTERFACE: ContractInterface = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]

interface ERC20Contract extends Contract {
    allowance: (owner: string, spender: string, overrides?: Overrides) => Promise<BigNumber>
    approve: (spender: string, value: BigNumber, overrides?: Overrides) => Promise<ContractTransaction>
    balanceOf: (owner: string) => Promise<BigNumber>
    decimals: () => Promise<number>
    transfer: (to: string, value: BigNumber, overrides?: Overrides) => Promise<ContractTransaction>
}

class ERC20Readonly {
    protected decimals: number|undefined = undefined
    protected contract: ERC20Contract
    constructor(public tokenAddress: string, public provider: providers.Provider | Signer) {
        this.contract = new Contract(tokenAddress, ERC20_INTERFACE, provider) as ERC20Contract
    }

    public async getAddressTokenBalance (userAddress: UserAddress): Promise<BigNumber> {
        return this.contract.balanceOf(userAddress)
    }

    public async getTokenAddressDecimal (): Promise<number> {
        if (!this.decimals) {
            this.decimals = (await this.contract.decimals())
        }
        return this.decimals
    }

    public async getAllowedAmountToSpendFromOwner (tokenOwner: UserAddress, spenderAddress: UserAddress): Promise<BigNumber> {
        return this.contract.allowance(tokenOwner, spenderAddress)
    }
}

class ERC20 extends ERC20Readonly {

    constructor (tokenAddress: string, private signer: Signer) {
        super(tokenAddress, signer)
    }

    public async getAllowedAmountToSpend (destAddress: string): Promise<BigNumber> {
        return this.getAllowedAmountToSpendFromOwner(await this.signer.getAddress(), destAddress)
    }

    public async approveAmountToSpend (destAddress: string, amount: BigNumber): Promise<void> {
        const txInfo: ContractTransaction = await this.contract.approve(destAddress, amount, {
            gasLimit: 250000
        })
        // Wait for tx to be commited
        const txn = await this.signer.provider?.waitForTransaction(txInfo.hash, 1)
        if (txn && txn.status === 0) {
            throw new Error("Transaction Approval failed")
        }
    }

    public async getBalance (): Promise<BigNumber> {
        return this.getAddressTokenBalance(await this.signer.getAddress())
    }

    public async transferTokens(destAddress: string, amount: BigNumber, overrides?: Overrides ): Promise<ContractTransaction> {

        const txInfo: ContractTransaction = await this.contract.transfer(destAddress, amount, overrides)

        // This is not needed, we dont want the user to wait 30 seconds for the transaction to be mined
        // const txn = await this.signer.provider?.waitForTransaction(txInfo.hash, 1)
        // if (txn && txn.status === 0) {
        //     throw new Error("Transaction failed")
        // }
        return txInfo
    }
}

export {
    ERC20,
    ERC20Readonly,
    ERC20_INTERFACE,
}