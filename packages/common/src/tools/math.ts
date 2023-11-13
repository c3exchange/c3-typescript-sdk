

export function BigMin(a: bigint, b: bigint): bigint { return a <= b ? a : b }
export function BigMax(a: bigint, b: bigint): bigint { return a >= b ? a : b }

export function bigintMin(a: bigint, b: bigint): bigint {
    return a < b ? a : b
}

export function bigintMax(a: bigint, b: bigint): bigint {
    return a > b ? a : b
}

export function bigintAbs(a: bigint): bigint {
    return a >= BigInt(0) ? a : -a
}