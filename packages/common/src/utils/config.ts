
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