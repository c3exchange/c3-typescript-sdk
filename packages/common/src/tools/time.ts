import { UnixTimestamp, UnixTimestampInMiliseconds, UnixTimestampInSeconds } from "../interfaces"
import { RelativeTimestamp } from "../contracts/index"

export interface IClock {
    nowMilis(): UnixTimestampInMiliseconds
    nowSeconds(): UnixTimestampInSeconds
}

export interface IClockWithRelativeTime extends IClock{
    getRelativeTimestamp(currentTimestamp: UnixTimestampInSeconds): RelativeTimestamp
    getRelativeTimestamp(): RelativeTimestamp
}

export const MILISECONDS_IN_SECOND = 1000
export const SECONDS_IN_DAY = 60 * 60 * 24
export const SECONDS_IN_YEAR = SECONDS_IN_DAY * 365
export class UnixClock implements IClock {
    public nowMilis(): UnixTimestampInMiliseconds {
        return Date.now()
    }
    public nowSeconds(): UnixTimestampInSeconds {
        return Math.floor(this.nowMilis() / MILISECONDS_IN_SECOND)
    }
}

export class UnixClockWithRelativeTimestamp extends UnixClock implements IClockWithRelativeTime {
    constructor(private readonly _initTimestamp: UnixTimestamp) {
        super()
    }

    public getRelativeTimestamp(currentTimestamp: UnixTimestampInSeconds = this.nowSeconds()): RelativeTimestamp {
        return currentTimestamp - this._initTimestamp
    }
}

export class FixedClock extends UnixClockWithRelativeTimestamp {
    constructor(private timestamp: UnixTimestampInSeconds) {
        super(timestamp)
    }

    public nowMilis(): UnixTimestampInMiliseconds {
        return this.timestamp * MILISECONDS_IN_SECOND
    }

    public nowSeconds(): UnixTimestampInSeconds {
        return this.timestamp
    }

    public forwardTime(seconds: number) {
        this.timestamp += seconds
    }
}

export const createGTDExpiration = (clock: IClock = new UnixClock()): UnixTimestampInSeconds => {
    // 1 day
    return clock.nowSeconds() + SECONDS_IN_DAY
}

export const createGTCExpiration = (clock: IClock = new UnixClock()): UnixTimestampInSeconds => {
    // 1 year
    return clock.nowSeconds() + SECONDS_IN_YEAR
}
