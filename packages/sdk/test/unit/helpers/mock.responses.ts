import nock from "nock"
import { AccountId, Base64, CHAIN_ID_ALGORAND, CHAIN_ID_ETH, EVMSigner, MessageSigner, Signer, SupportedChainId, UserAddress } from "@c3exchange/common"
import { getTestBaseUrl} from "../setup";
import { ALGORAND_ACCOUNT, ALGORAND_ACCOUNT_ID, ALGORAND_MNEMONIC, ETHEREUM_ACCOUNT, ETHEREUM_ACCOUNT_ID, instruments, marketInfos } from "./mock.resources";
import { toMarketInfoResponse } from "./mock.methods";

const baseUrl = getTestBaseUrl()
const mockedServer = nock(baseUrl)

function mockCommonEndpoints() {
    // Instruments and Markets are persisted because they are used in multiple tests and they are not modified
    mockedServer.get("/v1/instruments").reply(200, instruments).persist()
    mockedServer.get("/v1/markets").reply(200, marketInfos.map(toMarketInfoResponse)).persist()
}

function cleanMockedServer() {
    nock.cleanAll()
}

function generateMockedLogin (chainId: SupportedChainId) {
    let address: UserAddress, signature: Base64, accountId: AccountId, signer: MessageSigner
    const token = 'jwt token'
    const nonce = 'ckZv+nU2/gfUs944SEjDbo6xl33wt33jah1lshabpAQ='
    switch(chainId) {
        case CHAIN_ID_ALGORAND: {
            address = ALGORAND_ACCOUNT.addr
            signature = "/T+qlcg0QbRvOhPL8Ag/AnstQ6uEm0dsDFBwJdYirla+r+cYtE8f+Tz1BmXTuy9DBnk2X2tPYjXwlruNYKQtAw=="
            accountId = ALGORAND_ACCOUNT_ID
            signer = new Signer().addFromMnemonic(ALGORAND_MNEMONIC)
            break;
        }
        default: {
            address = ETHEREUM_ACCOUNT.address
            signature = "mFE472gbrzM/OsPnuxxQO6g8Brqa05qlROyxC5vX9GURZpEQExRQOnU6K3+aAQo41nxK7myCjI5agDHj/91NiRs="
            accountId = ETHEREUM_ACCOUNT_ID
            signer = new EVMSigner(ETHEREUM_ACCOUNT.address, CHAIN_ID_ETH, ETHEREUM_ACCOUNT)
            break;
        }
    }
    mockedServer.get("/v1/login/start").query({ address, chainId }).reply(200, { nonce });
    mockedServer.post("/v1/login/complete", { address, chainId, signature })
        .reply(200, { token, userId: accountId, accountId, firstLogin: false });

    return {
        nonce, signature,
        token, accountId,
        signer, 
    }
}

export {
    mockedServer,
    mockCommonEndpoints,
    cleanMockedServer,
    generateMockedLogin,
}
