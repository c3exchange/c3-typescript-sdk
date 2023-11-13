

export class Result<T> {
    protected constructor(public success: boolean, public data?: T, public error?: Error) {}

    public get failed(): boolean {return !this.success}
    static ok<T>(value?: T): Result<T>{
        return new Result<T>( true, value, undefined)
    }

    static fail<T>(error?: Error, value?: T ): Result<T>{
        return new Result<T>( false, value, error)
    }

}