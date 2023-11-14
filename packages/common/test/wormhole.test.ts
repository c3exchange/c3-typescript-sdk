import "mocha"
import { expect } from "chai"
import { WormholeDictionary, getWormholeContractsByNetwork, validateEthereumVaa } from "../src/wormhole"
import { ALGO_INSTRUMENT, AssetId, Instrument, decodeBase64 } from "../src"
import algosdk from "algosdk"

describe("Wormhole helper tests", () => {
    it('Should Get Correct App Ids', function () {
        const settings = getWormholeContractsByNetwork('DEVNET')
        expect(settings.WormholeNetwork).to.be.equal('DEVNET')
        expect(settings.Contracts.algorand).not.to.be.undefined
        expect(settings.Contracts.algorand.core).not.to.be.undefined
        expect(settings.Contracts.algorand.token_bridge).not.to.be.undefined
        expect(settings.Contracts.ethereum).not.to.be.undefined
    })
    it('Algo Dictionary tests', () => {
        const dictionary = new WormholeDictionary(getWormholeContractsByNetwork('TESTNET'))
        expect(dictionary.getCoreAppId()).to.be.equal(Number.parseInt('86525623'));
        expect(dictionary.getTokenBridgeAppId()).to.be.equal(Number.parseInt('86525641'))
        expect(dictionary.isWormholeAppId(Number.parseInt(dictionary.getCoreAppId().toString()))).to.be.true
        expect(dictionary.isWormholeAppId(Number.parseInt(dictionary.getTokenBridgeAppId().toString()))).to.be.true
        expect(dictionary.isWormholeAppId(0)).to.be.false
    })
    it("Should validate ethereum wormholeVAA successfully", () => {
        const AVAX_INSTRUMENT: Instrument = {
            id: 'AVAX',
            asaId: 172685586,
            asaName: 'Avalanche (Wormhole)',
            asaUnitName: 'AVAX',
            asaDecimals: 8,
            chains: [{ chainId: 6, tokenAddress: "0xE654DB9dF47dfe951875a572236feD592CeC2a2b" }]
        }
        const wormholeVAA = decodeBase64("AQAAAAABAJxaWP3F73N6qyN7Zmimk0MjAL8FQf/gaZnpJ66ecpqKNcfsn2C2b/GwwbzBUKhAU4EI\
        ZHjWcPa6tDpBc7tKhgYAZNVMjMx3AQAABgAAAAAAAAAAAAAAAGHkTlBspWWebAu6m2eFhvotcpdWAAAAAAAAHLwBAwAAAAAAAAAAAAAAAAAAAA\
        AAAAAAAAAAAAAAAAAGskJOAAAAAAAAAAAAAAAA5lTbnfR9/pUYdaVyI2/tWSzsKisABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQNpdo\
        AAgAAAAAAAAAAAAAAADeAeCIRyxRChGJgO2/saF/FuLX93dvcm1ob2xlRGVwb3NpdAAAAAAAAAAAAAAAAN4B4IhHLFEKEYmA7b+xoX8W4tf3AA\
        AAAAayQk4=")
        const instruments = new Map<AssetId, Instrument>([[0, ALGO_INSTRUMENT], [172685586, AVAX_INSTRUMENT]])
        const {
            amountBuffer,
            repayAmountBuffer,
            from,
            fromChainId,
            instrument,
        } = validateEthereumVaa(wormholeVAA, instruments, 272013160)
        expect(from.toLowerCase()).to.be.equal("0xDe01e088472C510a118980edbFb1A17F16e2D7f7".toLowerCase())
        expect(fromChainId).to.be.equal(AVAX_INSTRUMENT.chains[0].chainId)
        expect(instrument).to.be.deep.equal(AVAX_INSTRUMENT)
        const amount = BigInt(112345678)
        expect(amount).to.be.equal(amountBuffer.readBigUInt64BE(24))
        expect(amount).to.be.equal(algosdk.decodeUint64(new Uint8Array(repayAmountBuffer), "bigint"))
    })
    it('Should validate ethereum wormholeVAA when two tokens have the same origin ERC20 address', () => {
        const wormholeVAA = decodeBase64('AQAAAAABAH6iRpeIYGFvfgNhSLGyw3T+3zyNf+ckXlI+ekXt9LQCbRsjoBcvUR+doV21B0P95ravBsBau9umuoMKm2+8zi4BZPYtUDQDAQAAAgAAAAAAAAAAAAAAAPiQmC+TEN9X0A9lnPT9h+Za3tjXAAAAAAACqZQBAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7msoAAAAAAAAAAAAAAAAAu98b+5NUusWMNKhaKUmCvK8+XJwAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARk3CrAAgAAAAAAAAAAAAAAADe5rGgEyn3NwIFR8MO01Io54oM8ndvcm1ob2xlRGVwb3NpdAAAAAAAAAAAAAAAAN7msaATKfc3AgVHww7TUijnigzyAAAAAAAAAAA=')
        const AVAX_INSTRUMENT: Instrument = {
            "id": "AVAX",
            "asaId": 287931061,
            "asaName": "AVAX",
            "asaUnitName": "AVAX",
            "asaDecimals": 8,
            "chains": [
                {
                    "chainId": 6,
                    "tokenAddress": "0xbBdF1bfb9354Bac58C34A85A294982BcaF3E5c9c"
                }
            ],
        }

        const USDC_INSTRUMENT: Instrument = {
            "id": "USDC",
            "asaId": 287847404,
            "asaName": "USDC",
            "asaUnitName": "USDC",
            "asaDecimals": 8,
            "chains": [
                {
                    "chainId": 2,
                    "tokenAddress": "0xbBdF1bfb9354Bac58C34A85A294982BcaF3E5c9c"
                }
            ],
        }

        const instruments = new Map<AssetId, Instrument>([[0, ALGO_INSTRUMENT], [287931061, AVAX_INSTRUMENT], [287847404, USDC_INSTRUMENT]])

        const {
            amountBuffer,
            repayAmountBuffer,
            from,
            fromChainId,
            instrument,
        } = validateEthereumVaa(wormholeVAA, instruments, 294875307)

        expect(from.toLowerCase()).to.be.equal("0xdee6b1a01329f737020547c30ed35228e78a0cf2".toLowerCase())
        expect(fromChainId).to.be.equal(USDC_INSTRUMENT.chains[0].chainId)
        expect(instrument).to.be.deep.equal(USDC_INSTRUMENT)
        const amount = BigInt(1000000000)
        expect(amount).to.be.equal(amountBuffer.readBigUInt64BE(24))
    })
})
