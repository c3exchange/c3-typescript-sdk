import 'mocha'
import { readMaxWithdrawFeesTable } from '../src/utils/config'
import { expect } from 'chai'

describe('Max Withdraw fees', () => {
    it('should Default Read Max Withdraw fees from config', () => {
        const config = readMaxWithdrawFeesTable()
        expect(config).to.be.an('object')
        expect(config).to.have.property('USDC')
        expect(config.USDC).to.have.property('ethereum')
        expect(config['USDC']['ethereum']).to.eq('16')
        expect(config['USDC']['avalanche']).to.eq('1')
    })

    it('should update Max Withdraw fees from env variable', () => {
        process.env.MAX_WITHDRAW_FEES_TABLE = '{"USDC":{"ethereum":"10"}}'
        const config = readMaxWithdrawFeesTable('MAX_WITHDRAW_FEES_TABLE', true)
        expect(config).to.be.an('object')
        expect(config).to.have.property('USDC')
        expect(config.USDC).to.have.property('ethereum')
        expect(config['USDC']['ethereum']).to.eq('10')
        expect(config['USDC']['avalanche']).to.eq('1')
    })
})