import { IClock, UnixClock } from "./time"

export class ExpirableCache<T> {
    private data: T[] = []
    private lastUpdate: number = 0
    private isExpirable: boolean = false
    private clock: IClock

    constructor(
        private dataProvider: () => Promise<T>, 
        private expirationTimeInMillis: number = 0,
        clock?: IClock) {
        this.isExpirable = expirationTimeInMillis > 0
        this.clock = clock ?? new UnixClock()
    }

    public forceExpiration(): void {
        this.lastUpdate = 0
    }

    public async get(): Promise<T> {
        const now = this.clock.nowMilis()
        const isExpired = this.lastUpdate === 0 || (this.isExpirable && (now - this.lastUpdate) > this.expirationTimeInMillis)
        if (isExpired) {
            this.data[0] = await this.dataProvider()
            this.lastUpdate = now
        }
        return this.data[0]
    }

    _lastUpdate(): number {
        return this.lastUpdate
    }
}

export class LRUCache<K, V> {
    private data: Map<string, ExpirableCache<V>> = new Map()

    constructor(
        private dataProvider: (key: K) => () => Promise<V>, 
        private toString: (key: K) => string = JSON.stringify,
        private maxItems: number = 100, 
        private expirationTimeInMillis: number = 0,
        private clock?: IClock) { }

    public async get(key: K): Promise<V> {
        const strKey = this.toString(key)
        let cache = this.data.get(strKey)
        if (cache === undefined) {
            cache = new ExpirableCache(this.dataProvider(key), this.expirationTimeInMillis, this.clock)            
            if (this.data.size >= this.maxItems) {
                // Remove the oldest entry based on _lastUpdate
                const entries = Array.from(this.data.entries())
                const oldestEntryIndex = entries.reduce((result, currentValue, currentIndex) => result < 0 || currentValue[1]._lastUpdate < entries[result][1]._lastUpdate ? currentIndex : result, -1)
                const keyToRemove = entries[oldestEntryIndex][0]
                this.data.delete(keyToRemove)
            }
            this.data.set(strKey, cache)
        }
        return cache.get()
    }

    public get size(): number {
        return this.data.size
    }
}
