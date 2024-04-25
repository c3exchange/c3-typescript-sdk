import { ChainId, ChainName, CHAIN_ID_SOLANA, addPriorityFees, SolanaSignTxCallback, SolanaRedeemProgress } from "../.."
import { Commitment, Connection, Keypair, PublicKey, PublicKeyInitData, Transaction as SolanaTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { coalesceChainId } from "@certusone/wormhole-sdk/lib/cjs/utils/consts";
import { createNonce } from "@certusone/wormhole-sdk/lib/cjs/utils/createNonce";
import {
    createApproveAuthoritySignerInstruction,
    createTransferNativeWithPayloadInstruction,
    createTransferNativeInstruction,
    createTransferWrappedWithPayloadInstruction,
    createTransferWrappedInstruction,
    createCompleteTransferNativeInstruction,
    createCompleteTransferWrappedInstruction
} from "@certusone/wormhole-sdk/lib/cjs/solana/tokenBridge";
import { ACCOUNT_SIZE, NATIVE_MINT, TOKEN_PROGRAM_ID, createCloseAccountInstruction, createInitializeAccountInstruction, getMinimumBalanceForRentExemptAccount } from "@solana/spl-token";
import { parseTokenTransferVaa } from "@certusone/wormhole-sdk/lib/cjs/vaa/tokenBridge";
import { createPostSignedVaaTransactions } from "@certusone/wormhole-sdk/lib/cjs/solana/sendAndConfirmPostVaa";
import { sendAndConfirmTransactionsWithRetry, modifySignTransaction } from "@certusone/wormhole-sdk/lib/cjs/solana/utils";
import { derivePostedVaaKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { keccak256, parseVaa } from "@certusone/wormhole-sdk";
import base58 from "bs58";


const DEPOSIT_SOLANA_MULTIPLIER = 1.05
const DEFAULT_SOLANA_REDEEM_MULTIPLIER = 1
const DEFAULT_SIGVERIFY_COMPUTE_LIMIT = 70_000
const DEFAULT_POST_VAA_COMPUTE_LIMIT = 130_000
const DEFAULT_REDEEM_TRANSFER_COMPUTE_LIMIT = 160_000

/**
 * Wormhole team doesn't want to fix solana transfer and reedem functions, so we need to create our own functions to support adding priority fees.
 */

export async function custom_transferFromSolana(connection: Connection,
    bridgeAddress: PublicKeyInitData,
    tokenBridgeAddress: PublicKeyInitData,
    payerAddress: PublicKeyInitData,
    fromAddress: PublicKeyInitData,
    mintAddress: PublicKeyInitData,
    amount: bigint,
    targetAddress: Uint8Array | Buffer,
    targetChain: ChainId | ChainName,
    originAddress?: Uint8Array | Buffer,
    originChain?: ChainId | ChainName,
    fromOwnerAddress?: PublicKeyInitData,
    relayerFee = BigInt(0),
    payload: Uint8Array | Buffer | null = null,
    commitment: Commitment = "finalized"
) {
    const originChainId = originChain
        ? coalesceChainId(originChain)
        : undefined;
    if (fromOwnerAddress === undefined) {
        fromOwnerAddress = payerAddress;
    }
    const nonce = createNonce().readUInt32LE(0);
    const approvalIx = createApproveAuthoritySignerInstruction(tokenBridgeAddress, fromAddress, fromOwnerAddress, amount);
    const message = Keypair.generate();
    const isSolanaNative = originChainId === undefined || originChainId === CHAIN_ID_SOLANA;
    if (!isSolanaNative && !originAddress) {
        return Promise.reject("originAddress is required when specifying originChain");
    }
    const tokenBridgeTransferIx = isSolanaNative
        ? payload !== null
            ? createTransferNativeWithPayloadInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, fromAddress, mintAddress, nonce, amount, targetAddress, coalesceChainId(targetChain), payload)
            : createTransferNativeInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, fromAddress, mintAddress, nonce, amount, relayerFee, targetAddress, coalesceChainId(targetChain))
        : payload !== null
            ? createTransferWrappedWithPayloadInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, fromAddress, fromOwnerAddress, originChainId, originAddress!, nonce, amount, targetAddress, coalesceChainId(targetChain), payload)
            : createTransferWrappedInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, fromAddress, fromOwnerAddress, originChainId, originAddress!, nonce, amount, relayerFee, targetAddress, coalesceChainId(targetChain));
    const transaction = new SolanaTransaction().add(approvalIx, tokenBridgeTransferIx);
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(payerAddress);
    await addPriorityFees(connection, transaction, DEPOSIT_SOLANA_MULTIPLIER);
    transaction.partialSign(message);
    return transaction;
}

export async function custom_transferNativeSol(
    connection: Connection,
    bridgeAddress: PublicKeyInitData,
    tokenBridgeAddress: PublicKeyInitData,
    payerAddress: PublicKeyInitData,
    amount: bigint,
    targetAddress: Uint8Array | Buffer,
    targetChain: ChainId | ChainName,
    relayerFee = BigInt(0),
    payload: Uint8Array | Buffer | null = null,
    commitment: Commitment = "finalized"
) {
    const rentBalance = await getMinimumBalanceForRentExemptAccount(connection, commitment);
    const payerPublicKey = new PublicKey(payerAddress);
    const ancillaryKeypair = Keypair.generate();
    //This will create a temporary account where the wSOL will be created.
    const createAncillaryAccountIx = SystemProgram.createAccount({
        fromPubkey: payerPublicKey,
        newAccountPubkey: ancillaryKeypair.publicKey,
        lamports: rentBalance,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
    });
    //Send in the amount of SOL which we want converted to wSOL
    const initialBalanceTransferIx = SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        lamports: amount,
        toPubkey: ancillaryKeypair.publicKey,
    });
    //Initialize the account as a WSOL account, with the original payerAddress as owner
    const initAccountIx = createInitializeAccountInstruction(ancillaryKeypair.publicKey, NATIVE_MINT, payerPublicKey);
    //Normal approve & transfer instructions, except that the wSOL is sent from the ancillary account.
    const approvalIx = createApproveAuthoritySignerInstruction(tokenBridgeAddress, ancillaryKeypair.publicKey, payerPublicKey, amount);
    const message = Keypair.generate();
    const nonce = createNonce().readUInt32LE(0);
    const tokenBridgeTransferIx = payload !== null
        ? createTransferNativeWithPayloadInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, ancillaryKeypair.publicKey, NATIVE_MINT, nonce, amount, Buffer.from(targetAddress), coalesceChainId(targetChain), payload)
        : createTransferNativeInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, message.publicKey, ancillaryKeypair.publicKey, NATIVE_MINT, nonce, amount, relayerFee, Buffer.from(targetAddress), coalesceChainId(targetChain));
    //Close the ancillary account for cleanup. Payer address receives any remaining funds
    const closeAccountIx = createCloseAccountInstruction(ancillaryKeypair.publicKey, //account to close
        payerPublicKey, //Remaining funds destination
        payerPublicKey //authority
    );
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    const transaction = new SolanaTransaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerPublicKey;
    transaction.add(createAncillaryAccountIx, initialBalanceTransferIx, initAccountIx, approvalIx, tokenBridgeTransferIx, closeAccountIx);
    await addPriorityFees(connection, transaction, DEPOSIT_SOLANA_MULTIPLIER);
    transaction.partialSign(message, ancillaryKeypair);
    return transaction;
}

export async function custom_redeemOnSolana(
    connection: Connection,
    bridgeAddress: PublicKeyInitData,
    tokenBridgeAddress: PublicKeyInitData,
    payerAddress: PublicKeyInitData,
    signedVaa: Uint8Array | Buffer,
    feeRecipientAddress?: PublicKeyInitData,
    commitment: Commitment = "finalized",
    multiplier: number = DEFAULT_SOLANA_REDEEM_MULTIPLIER,
    maxPriorityFeeCap?: number,
    minPriorityFee?: number
) {
    const parsed = parseTokenTransferVaa(signedVaa);
    const createCompleteTransferInstruction = parsed.tokenChain == CHAIN_ID_SOLANA
        ? createCompleteTransferNativeInstruction
        : createCompleteTransferWrappedInstruction;
    const transaction = new SolanaTransaction().add(createCompleteTransferInstruction(tokenBridgeAddress, bridgeAddress, payerAddress, parsed, feeRecipientAddress));
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(payerAddress);
    await addPriorityFees(connection, transaction, multiplier, maxPriorityFeeCap, minPriorityFee, DEFAULT_REDEEM_TRANSFER_COMPUTE_LIMIT);
    return transaction;
}

export async function custom_postVaaWithRetry(
    connection: Connection,
    signTransaction: SolanaSignTxCallback<Transaction>,
    payer: PublicKeyInitData,
    wormholeProgramId: PublicKeyInitData,
    vaa: Buffer,
    transactionProgress: SolanaRedeemProgress,
    maxRetries?: number,
    commitment?: Commitment,
    multiplier = DEFAULT_SOLANA_REDEEM_MULTIPLIER,
    maxPriorityFeeCap?: number,
    minPriorityFee?: number
): Promise<any[]>
{
    // If the VAA has already been posted, return early   so we know the only
    // thing to try is the final redeem tx.  

    const postedVaaAddress = derivePostedVaaKey(
        wormholeProgramId,
        parseVaa(vaa).hash,
    );

    if (await connection.getAccountInfo(postedVaaAddress)) {
        // There is a edge case when we retry the redeem tx, but the VAA has already been posted,
        // and the input transactionProgress is zero (because e.g the relayer startedup again)
        // In this case we know at least 1 verify sig and post VAA succeed, so set the successTxCount to 2 
        // and the totalTxCount to 3 (verifySigs + postVAA + redeem)

        if (transactionProgress.successTxCount === 0) {
            transactionProgress.successTxCount = 2
        }
        if (transactionProgress.totalTxCount === 0) {
            transactionProgress.totalTxCount = 3
        }
        console.warn('createWormholeTxForSolanaRedeem: This VAA has already been posted')
        return []
    }

    if (!transactionProgress.verifySigTxs || !transactionProgress.signers || !transactionProgress.postVaaTx || !transactionProgress.totalTxCount || !transactionProgress.successTxCount) {

        // First time, fill and add priority fees/compute budget

        const allTxs = await createPostSignedVaaTransactions(connection, wormholeProgramId, payer, vaa, commitment);
        const unsignedTransactions = allTxs.unsignedTransactions;
        transactionProgress.postVaaTx = allTxs.unsignedTransactions.pop()!;
        transactionProgress.signers = allTxs.signers;
        transactionProgress.verifySigTxs = unsignedTransactions;

        await addPriorityFees(connection, transactionProgress.postVaaTx, multiplier, maxPriorityFeeCap, minPriorityFee, DEFAULT_POST_VAA_COMPUTE_LIMIT)

        for (const tx of transactionProgress.verifySigTxs) {
            await addPriorityFees(connection, tx, multiplier, maxPriorityFeeCap, minPriorityFee, DEFAULT_SIGVERIFY_COMPUTE_LIMIT)
        }

        transactionProgress.successTxCount = 0
        transactionProgress.totalTxCount = transactionProgress.verifySigTxs.length + 2 // verifySigs + postVAA + redeem
    }

    const verifySignatures = async (transaction: Transaction) => {
        return await sendAndConfirmTransactionsWithRetry(
            connection,
            modifySignTransaction(signTransaction, ...transactionProgress.signers!),
            payer.toString(),
            [transaction],
            maxRetries,
            {
                skipPreflight: false,
                commitment
            },
        );
    }

    const responses = [];
    const verified = await Promise.allSettled(
        transactionProgress.verifySigTxs.map(async (transaction) => {
            await verifySignatures(transaction);
            return transaction
        })
    )

    const succeedTxs = verified.map((value, index) => {
        if (value.status === 'fulfilled') {
            const tx = value.value
            console.log(`Submitted transaction ${base58.encode(value.value.signature!)}`)
            transactionProgress.successTxCount!++;
            return tx
        } else {
            console.error(`Failed to verify signature for transaction ${index}: ${value.reason}`);
        }
    }).filter( (tx) : tx is SolanaTransaction => tx !== undefined)
    
    transactionProgress.verifySigTxs = transactionProgress.verifySigTxs.filter( tx => tx.signature && !succeedTxs.find(stx => stx.signature === tx.signature))

    if (transactionProgress.successTxCount < transactionProgress.totalTxCount - 2) {
        throw new Error(`Not enough signatures: ${transactionProgress.successTxCount} out of ${transactionProgress.totalTxCount - 2}.`);
    }
    responses.push(...verified);

    responses.push(
        await sendAndConfirmTransactionsWithRetry(
            connection,
            signTransaction,
            payer.toString(),
            [transactionProgress.postVaaTx],
            maxRetries,
            {
                skipPreflight: false,
                commitment,
            },
        ),
    );
    transactionProgress.successTxCount++ 

    return responses
}
