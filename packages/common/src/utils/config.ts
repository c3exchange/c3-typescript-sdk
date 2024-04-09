import { ChainName } from "../index"

export type MaxWithdrawFeesTable = Record<string, Record<ChainName, string>>
export function readBoolFromEnv(name:string, defVal='false'){
    const strBool = process.env[name] ?? defVal;
    return  strBool.toLowerCase() === 'true';
}

export function readNumberFromEnv(name:string,def:number):number{
    const strInt = process.env[name] ?? def.toString();
    return Number.parseInt(strInt);
}

export function readStringFromEnv(name:string,def:string,required=false):string{
    if(required && !process.env[name]){
        throw new Error(`Missing env variable ${name}`)
    }
    const str = process.env[name] ?? def;

    return str;
}

export function readFromEnv(name: string, throwIfMissing=true):string{
    if(throwIfMissing && !process.env[name]){
        throw new Error(`Missing env variable ${name}`)
    }
    return  process.env[name] ?? ''
}

let maxWithdrawFeesTable:MaxWithdrawFeesTable|undefined = undefined
export function readMaxWithdrawFeesTable(envVariable: string = 'MAX_WITHDRAW_FEES_TABLE', forceUpdate= false): MaxWithdrawFeesTable {
    if(maxWithdrawFeesTable !== undefined && !forceUpdate)
        return maxWithdrawFeesTable

    maxWithdrawFeesTable = defaultMaxWithdrawFeesTable()
    const tableInString = process.env[envVariable]
    if (tableInString !== undefined) {
        try {
            const newTable = JSON.parse(tableInString) as MaxWithdrawFeesTable
            for(const instrument of Object.keys(newTable)){
                if(!maxWithdrawFeesTable[instrument]){
                    maxWithdrawFeesTable[instrument] = newTable[instrument]
                }else {
                    for(const chain of Object.keys(newTable[instrument])){
                        const chainName = chain as ChainName
                        if(chainName !== undefined){
                            maxWithdrawFeesTable[instrument][chainName] = newTable[instrument][chainName]
                        }
                    }
                }
            }
        } catch (err) {
            throw new Error(`Invalid max fee table string provided in ${envVariable} env variable. It should be a valid JSON string`)
        }
    }
    return maxWithdrawFeesTable
}

export function defaultMaxWithdrawFeesTable (): MaxWithdrawFeesTable {
    const defaultTableString = '{' +
    '"USDC":{"ethereum":"16","avalanche":"1","algorand":"0.01", "arbitrum":"1.5", "sepolia": "1"},' +
    '"USDCIRCLE":{"ethereum":"16","avalanche":"1","algorand":"0.01", "sepolia": "1"},' +
    '"WUSDC":{"ethereum":"16","avalanche":"1","algorand":"0.01", "sepolia": "1"},' +
    '"ETH":{"ethereum":"0.0075","algorand":"0.00001", "sepolia": "0.0075" },' +
    '"AVAX":{"avalanche":"0.05","algorand":"0.0005"},' +
    '"ALGO":{"algorand":"0.02"},' +
    '"BTC":{"ethereum":"0.0005","algorand":"0.00002","avalanche":"0.00055", "sepolia": "0.0005" },' +
    '"WBTC":{"ethereum":"0.0005","algorand":"0.00002","avalanche":"0.00055", "sepolia": "0.0005" },' +
    '"ARB": {"arbitrum": "0.75", "algorand": "0.025" },' +
    '"WBNB": {"bsc": "0.0067" , "algorand":"0.00008"},' +
    '"BNB":  {"bsc": "0.0067" ,"algorand":"0.00008"},' +
    '"WSOL": {"solana": "0.01" },' +
    '"SOL": {"solana": "0.004" },' +
    '"PYTH": {"solana": "0.9" }, ' +
    '"W": {"solana": "0.5" } ' +
    '}'
    return  JSON.parse(defaultTableString) as MaxWithdrawFeesTable
}