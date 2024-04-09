
export class Result<T,E = Error> {
    protected constructor(public success: boolean, public data?: T, public error?: E) {}

    public get failed(): boolean {return !this.success}
    static ok<T,E>(value?: T): Result<T,E>{
        return new Result<T,E>( true, value, undefined)
    }

    static fail<T,E>(error?: E, value?: T ): Result<T,E>{
        return new Result<T,E>( false, value, error)
    }

}