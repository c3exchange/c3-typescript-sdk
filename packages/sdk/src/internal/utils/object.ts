export function removeUndefinedProperties (obj: Record<string, any>): Record<string, any> {
    const copy = { ...obj }
    Object.keys(copy).forEach((key) => {
        if (copy[key] === undefined || copy[key] === null) {
            delete copy[key]
        }
    })

    return copy
}