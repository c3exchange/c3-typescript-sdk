import "mocha"
import { expect } from "chai"
import { ExpirableCache, IClock, LRUCache, UnixClock, UnixTimestampInMiliseconds } from "../src"

describe("ExpirableCache tests", () => {

    function createTestExpirableCache(expirationTime: number) {
        const now = Date.now()
        const clock = new MockClock(now)
        const firstValue = 23
        const dataProvider = new MockDataProvider(firstValue, clock)
        const cache = new ExpirableCache(() => dataProvider.getData(), expirationTime, clock)
        return {now, clock, firstValue, dataProvider, cache}
    }

    it("Non expirable caches are immutable", async () => {
        const expirationTime = 0
        const {now, clock, firstValue, dataProvider, cache} = createTestExpirableCache(expirationTime)

        expect(await cache.get()).to.be.equal(firstValue)
        clock.setNow(now + 100)
        expect(dataProvider.calls.length).to.be.equal(1)

        expect(await cache.get()).to.be.equal(firstValue)
        expect(dataProvider.calls.length).to.be.equal(1)

        clock.setNow(now + 100000)
        expect(await cache.get()).to.be.equal(firstValue)
        expect(dataProvider.calls.length).to.be.equal(1)
    })

    it("Expirable caches are actually refreshed", async () => {
        const expirationTime = 1000
        const {now, clock, firstValue, dataProvider, cache} = createTestExpirableCache(expirationTime)

        expect(await cache.get()).to.be.equal(firstValue)
        clock.setNow(now + 100)
        expect(await cache.get()).to.be.equal(firstValue)
        expect(dataProvider.calls.length).to.be.equal(1)
        expect(dataProvider.calls[0]).to.be.equal(now)

        clock.setNow(now + 1 * (expirationTime + 1))
        expect(await cache.get()).to.be.equal(firstValue + 1)
        expect(await cache.get()).to.be.equal(firstValue + 1)
        expect(dataProvider.calls.length).to.be.equal(2)
        expect(dataProvider.calls[0]).to.be.equal(now)
        expect(dataProvider.calls[1]).to.be.equal(now + 1 * (expirationTime + 1))

        clock.setNow(now + 2 * (expirationTime + 1))
        expect(await cache.get()).to.be.equal(firstValue + 2)
        expect(await cache.get()).to.be.equal(firstValue + 2)
        expect(dataProvider.calls.length).to.be.equal(3)
        expect(dataProvider.calls[0]).to.be.equal(now)
        expect(dataProvider.calls[1]).to.be.equal(now + 1 * (expirationTime + 1))
        expect(dataProvider.calls[2]).to.be.equal(now + 2 * (expirationTime + 1))
    })

    it("Cache can be forced to be updated", async () => {
        const expirationTime = 1000
        const {now, clock, firstValue, dataProvider, cache} = createTestExpirableCache(expirationTime)

        expect(await cache.get()).to.be.equal(firstValue)
        clock.setNow(now + 100)
        expect(await cache.get()).to.be.equal(firstValue)
        expect(dataProvider.calls.length).to.be.equal(1)
        expect(dataProvider.calls[0]).to.be.equal(now)

        cache.forceExpiration()

        clock.setNow(now + 200)
        expect(await cache.get()).to.be.equal(firstValue + 1)
        expect(dataProvider.calls.length).to.be.equal(2)
        expect(dataProvider.calls[0]).to.be.equal(now)
        expect(dataProvider.calls[1]).to.be.equal(now + 200)
    })
})

describe("LRUCache tests", () => {

    it("Least Recently Used items must be removed first", async () => {
        const expirationTime = 0
        let now = Date.now()
        const clock = new MockClock(now)
        const maxItems = 2;
        const lruCache = new LRUCache<number, string>(
            (key) => async () => `${key} - ${clock.nowMilis()}`,
            (key) => "key_" + key,
            maxItems,
            expirationTime,
            clock
        )

        expect(lruCache.size).to.be.equal(0)
        expect(await lruCache.get(1)).to.be.equal(`1 - ${now}`)
        expect(lruCache.size).to.be.equal(1)
        clock.setNow(now + 1)
        expect(await lruCache.get(2)).to.be.equal(`2 - ${now + 1}`)
        expect(lruCache.size).to.be.equal(2)

        clock.setNow(now + 2)
        expect(await lruCache.get(1)).to.be.equal(`1 - ${now}`) // As expirationTime is 0, the value never changes 
        expect(lruCache.size).to.be.equal(2)

        clock.setNow(now + 3)
        expect(await lruCache.get(3)).to.be.equal(`3 - ${now + 3}`)
        expect(await lruCache.get(2)).to.be.equal(`2 - ${now + 1}`) // As expirationTime is 0, the value never changes 
        expect(lruCache.size).to.be.equal(2)
        
        clock.setNow(now + 4)
        expect(await lruCache.get(1)).to.be.equal(`1 - ${now + 4}`) // The value must change as the key was re added to the cache
        expect(lruCache.size).to.be.equal(2)
    })
    
})

describe("MockDataProvider tests", () => {

    it("Values are mocked properly", async () => {
        let now = Date.now()
        const clock = new MockClock(now)
        const dataProvider = new MockDataProvider(23, clock)
        expect(await dataProvider.getData()).to.be.equal(23)
        clock.setNow(now + 1)
        expect(await dataProvider.getData()).to.be.equal(24)
        clock.setNow(now + 2)
        expect(await dataProvider.getData()).to.be.equal(25)
        expect(dataProvider.calls).to.deep.equal([now, now+1, now+2])
    })
    
})

class MockClock extends UnixClock {
    constructor(private now: UnixTimestampInMiliseconds) { 
        super()
    }

    public setNow(newNow: UnixTimestampInMiliseconds) {
        this.now = newNow
    }

    public nowMilis(): UnixTimestampInMiliseconds {
        return this.now
    }
    
}

class MockDataProvider {
    private _calls: number[] = []
    private nextValue: number

    constructor(startValue: number, private clock: IClock) {
        this.nextValue = startValue
    }

    public async getData(): Promise<number> {
        this._calls.push(this.clock.nowMilis())
        return this.nextValue++
    }
    
    
    public get calls() : number[] {
        return this._calls.slice()
    }
        
}