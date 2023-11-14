import { defaultConfig } from "../../src/config"

const {
    TEST_BASE_URL,
} = process.env

export function getTestBaseUrl () {
   return TEST_BASE_URL ?? defaultConfig.c3_api.server
}

export const testAccountId = "2TYQKFT2KQTDIU4EUUUHPP7IBTGPVGL5JAHD2NNWOPPCXCDLFQYHJ"
export const testMarketId = "BTC-USDC";
