import { AssetId, InstrumentSlotId } from "../interfaces"

export  function groupByKey<T, S = string>(items: T[], keyGetter: (o:T) => S): Map<S, T[]>{
  const ordersByPair = new Map()
  for (const order of items) {
    const key = keyGetter(order)
    if(!ordersByPair.has(key)){
      ordersByPair.set(key,[order])
    }else {
      ordersByPair.get(key)?.push(order)
    }
  }
  return ordersByPair
}

export function getSlotId(assetIds: AssetId[], assetId: AssetId): InstrumentSlotId {
  const result = assetIds.findIndex(id => id === assetId)
  if (result === -1)
      throw new Error(`Couldn't find slot id for asset: ${assetId}`)
  return result
}
