import { CHAIN_ID_SOLANA, ChainName, InstrumentChain, SolanaChainName, UserAddress, WormholeService } from ".."
import { SystemProgram, PublicKey, Connection, ComputeBudgetProgram, Transaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAccount } from "@solana/spl-token"

// The default microLamports per compute unit if the prioritization fees are not available or zero
const MIN_DEFAULT_PRIORITY_FEE = 5000

export async function getAndValidateSolanaTokenAddress(
    destinationChainName: ChainName,
    destinationAddress: UserAddress,
    instrumentChain: InstrumentChain,
    solanaConnection: Connection,
    wormholeService: WormholeService,
): Promise<{ ownerAddress: string, tokenAccountAddress: string }> {
    let ownerAddress: UserAddress
    let tokenAccountAddress: UserAddress = destinationAddress
    if (destinationChainName !== SolanaChainName)
        throw new Error("Invalid destination chainName, must be solana")
    if (instrumentChain.chainId !== CHAIN_ID_SOLANA)
        throw new Error("Invalid instrument chainId, must be solana")

    const accountInfo = await solanaConnection.getAccountInfo(new PublicKey(destinationAddress), "confirmed")
    if (!accountInfo)
        throw new Error("Invalid destination address")
    if (
        accountInfo.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58() ||
        accountInfo.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
    ) {
        // `destinationAddress` is a token account
        const accountMintInfo = await getAccount(solanaConnection, new PublicKey(destinationAddress), "confirmed")
        if (accountMintInfo.mint.toBase58() !== instrumentChain.tokenAddress)
            throw new Error("Invalid token account")
        tokenAccountAddress = destinationAddress
        ownerAddress = accountMintInfo.owner.toBase58()
    } else if (accountInfo.owner.toBase58() === SystemProgram.programId.toBase58()) {
        // `destinationAddress` is a solana address
        ownerAddress = destinationAddress
        const fetchedTokenAccountAddress = wormholeService.getSolanaAssociatedTokenAddressRaw(instrumentChain.tokenAddress, destinationAddress)
        if (!fetchedTokenAccountAddress || fetchedTokenAccountAddress.toBytes().length === 0)
            throw new Error("Could not derive token account address")
        tokenAccountAddress = fetchedTokenAccountAddress.toBase58()
    } else {
        throw new Error("Invalid solana address")
    }

    return { tokenAccountAddress, ownerAddress }
}

export async function getSolanaFees (connection: Connection, lockedWritableAccounts: PublicKey[] = [], multiplier: number): Promise<number> {
    const fees = await connection.getRecentPrioritizationFees({ lockedWritableAccounts })
    const filteredFees = fees.filter(fee => fee.prioritizationFee > 0).map(fee => fee.prioritizationFee).sort((a, b) => a - b)
    if (multiplier <= 0 || multiplier >= 4) {
        throw new Error(`Invalid multiplier: ${multiplier}, must be between 0 and 4`)
    }
    if (multiplier > 1.5) {
        console.warn(`Multiplier: ${multiplier} is too high`)
    }
    return Math.floor( (filteredFees[filteredFees.length - 1] || MIN_DEFAULT_PRIORITY_FEE) * multiplier)
}

export async function addPriorityFees (connection: Connection, tx: Transaction, multiplier: number, maxPriorityFeeCap?: number, minPriorityFee?: number, computeLimit: number = 200_000): Promise<void> {

    const lockedWritableAccounts = Array.from(new Set((tx.instructions
        .flatMap((ix) => ix.keys)
        .map((k) => (k.isWritable ? k.pubkey.toBase58() : null))
        .filter((k) => k !== null) as string[])))
    /**
     * WORKAROUND:
     * We want to make sure that connection has the latest version of the class
     */
    const newConnection = new Connection(connection.rpcEndpoint, connection.commitment)
    let fee = await getSolanaFees(newConnection, lockedWritableAccounts.map(address => new PublicKey(address)), multiplier)
    if (maxPriorityFeeCap && fee > maxPriorityFeeCap) {
        console.warn(`Using max priority fee cap: ${maxPriorityFeeCap} instead of set fee: ${fee}`)
        fee = maxPriorityFeeCap
    }
    if (minPriorityFee && fee < minPriorityFee) {
        console.warn(`Using min priority fee: ${minPriorityFee} instead of set fee: ${fee}`)
        fee = minPriorityFee
    }
    const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee });
    const COMPUTE_LIMIT_IX = ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit });
    tx.add(COMPUTE_LIMIT_IX, PRIORITY_FEE_IX)
}
