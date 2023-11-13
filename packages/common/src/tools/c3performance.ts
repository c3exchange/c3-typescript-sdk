
const perfMap: Map<string, number> = new Map<string, number>();
let currentCounter = 0
let globalCounter = 0
let lastSettle = performance.now()

const MINIMUM_NOTIFY_TIME = 0
let startProfiling: number = 0
let lastProfiling: number = 0

export class C3Performance {
    startTime: any
    constructor(readonly key: string, readonly value1: string = '', readonly value2: string = ''){
        this.startTime = performance.now()
        // more than 60 seconds of inactivity -> restart start time

        // const startDate = new Date(Date.now())

        // const formattedDate = startDate.toString();
        // console.log(`Execution started on ${formattedDate}.${startDate.getMilliseconds()} ${this.key} ${this.value1} ${this.value2}`);
    }
    end(){
        const endTime = performance.now()
        const executionTime = endTime - this.startTime

        // const endDate = new Date(Date.now())

        // const formattedDate = endDate.toString();

        // console.log(`Execution Ended on ${formattedDate}.${endDate.getMilliseconds()}: [${endTime} Performance] ${this.key} executed in ${executionTime} ms ${this.value1} ${this.value2} `);
        C3Performance.add(this.key, executionTime)
        if (executionTime > MINIMUM_NOTIFY_TIME)
            console.log(`${executionTime.toLocaleString()}\t${this.key}\t${this.value1}\t${this.value2}\tPerformance`)
    }

    static add(key: string, time: number){
        if (perfMap.has(key)) {
            const currentValue = perfMap.get(key) ?? 0
            perfMap.set(key, currentValue + time)
          } else {
            perfMap.set(key, time)
          }
    }
    static dump(){
        console.log(`***** Performance Dump Counter * In: ${currentCounter} Total: ${globalCounter} Orders/sec ${globalCounter/(performance.now()-startProfiling)*1000} *****`)
        // const sortedEntries = Array.from(perfMap.entries()).sort((a, b) => {
        //     return b[1] - a[1]
        //   });

        // sortedEntries.forEach((entry) => {
        //     const key = entry[0]
        //     const value = entry[1]
        //     console.log(`${value.toLocaleString()}\t${key}`)
        // });
        // console.log(`***** End Performance Dump  In: ${currentCounter} Total: ${globalCounter} Orders/sec ${globalCounter/(performance.now()-startProfiling)*1000} *****`)
    }
    static incGlobal(): number{
        if(startProfiling === 0){
            lastProfiling = startProfiling = performance.now()
        }
        else if(performance.now() - lastProfiling > 60000) {
            console.log(`***** Performance Dump RESET *****`)
            lastProfiling = startProfiling = performance.now()
        }
        globalCounter++
        return globalCounter
    }
    static incCurrent():number {
        if(startProfiling === 0){
            lastProfiling = startProfiling = performance.now()
        }
        else if(performance.now() - lastProfiling > 60000) {
            console.log(`***** Performance Dump RESET *****`)
            lastProfiling = startProfiling = performance.now()
            globalCounter = 0
        }
        globalCounter++
        currentCounter++
        return currentCounter
    }
    static decCurrent():number {
        currentCounter--
        lastProfiling = performance.now()
        return currentCounter
    }
    static getCurrent():number {
        return currentCounter
    }

    static setLastSettle(timestamp: number){
        lastSettle = timestamp
    }
    static getLastSettle(): number{
        return lastSettle
    }
    static isLastSettleDue(maxTime: number): boolean {
        return (performance.now() - lastSettle) > maxTime
    }

}



//==================================================
//=== STOPWATCH ====================================
//==================================================
type StopwatchName = string
type StopwatchTaskName = string
type StopwatchOngoingTask = {name: StopwatchTaskName, start: number}
type StopwatchCompletedTask = StopwatchOngoingTask & {stop: number, span: number}

type StopwatchSumTask = {name: StopwatchTaskName, sumSpan: number}

type StopwatchFormatter = (name: StopwatchName, tasks: StopwatchCompletedTask[]) => string
type StopwatchSummaryFormatter = (name: StopwatchName, tasks: StopwatchSumTask[]) => string

type StopwatchCondition = (tasks: StopwatchCompletedTask[]) => boolean

export const anyBigger: (value: number) => StopwatchCondition = (value: number) => (tasks: StopwatchCompletedTask[]) => tasks.some(t => t.span >= value)

export class Stopwatch {
    private static summary: Map<StopwatchName, StopwatchSumTask[]> = new Map()

    private static active: boolean = true
    private static DEFAULT_FORMATTER: StopwatchFormatter = (name, tasks) => `${name}: [${tasks.map(t => `${t.name}: ${t.span.toLocaleString('en-US')}`).join(', ')}] -> ${tasks.reduce((sum, t) => sum+t.span, 0).toLocaleString('en-US')}`
    private static SUM_FORMATTER: StopwatchSummaryFormatter = (name, tasks) => `${name}: [${tasks.map(t => `${t.name}: ${t.sumSpan.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2})}`).join(', ')}] -> ${tasks.reduce((sum, t) => sum+t.sumSpan, 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2})}`
    private static defaultFormatter: StopwatchFormatter = this.DEFAULT_FORMATTER

    public static on() {Stopwatch.active=true}
    public static off() {Stopwatch.active=false}
    public static isActive() {return Stopwatch.active}
    public static setDefaultFormatter(formatter?: StopwatchFormatter) {
        this.defaultFormatter = formatter ?? this.DEFAULT_FORMATTER
    }
    public static dumpSummary(formatter?: StopwatchSummaryFormatter): string {
        if (!Stopwatch.isActive()) return ""
        const resolvedFormatter = formatter || Stopwatch.SUM_FORMATTER
        return Array.from(Stopwatch.summary.entries()).map(([stopwatchName, sumTasks]) => resolvedFormatter(stopwatchName, sumTasks)).join('\n')
    }
    private static _addToSummary(stopwatchName: StopwatchName, completedTask: StopwatchCompletedTask) {
        const stopwatchSumTasks: StopwatchSumTask[] = Stopwatch.summary.get(stopwatchName) || []
        const sumTaskIndex = stopwatchSumTasks.findIndex(sumTask => sumTask.name === completedTask.name)
        if (sumTaskIndex >= 0) {
            stopwatchSumTasks[sumTaskIndex].sumSpan += completedTask.span
        } else {
            stopwatchSumTasks.push({name: completedTask.name, sumSpan: completedTask.span})
            if (stopwatchSumTasks.length === 1) {
                // This is the first task added for this Stopwatch, we must add the newly created array to Stopwatch.summary
                Stopwatch.summary.set(stopwatchName, stopwatchSumTasks)
            }
        }
    }
    private static getAndRestartSummary(): Map<StopwatchName, StopwatchSumTask[]> {
        const currentSummary = Stopwatch.summary
        Stopwatch.summary = new Map()
        return currentSummary
    }

    public static new(name: StopwatchName, startTask?: StopwatchTaskName): Stopwatch {
        const sw = new Stopwatch(name)
        if (startTask) {
            sw.start(startTask)
        }
        return sw
    }

    private currentTasks: Stack<StopwatchOngoingTask> = new Stack()
    private completedTasks: StopwatchCompletedTask[] = []

    private constructor(readonly name: StopwatchName) { }

    public clean(): Stopwatch {
        this.currentTasks.clean()
        this.completedTasks.length = 0
        return this
    }

    public start(taskName: string): Stopwatch {
        if (!Stopwatch.isActive()) return this
        return this._start(taskName)
    }

    public stop(): Stopwatch {
        if (!Stopwatch.isActive()) return this
        return this._stop()
    }

    public next(newTaskName: string): Stopwatch {
        if (!Stopwatch.isActive()) return this
        const now = performance.now()
        this._stop(now)
        return this._start(newTaskName, now)
    }

    dump(formatter?: StopwatchFormatter): string {
        if (!Stopwatch.isActive()) return ""
        this._stop()
        formatter = formatter ?? Stopwatch.defaultFormatter
        return formatter(this.name, this.completedTasks)
    }

    dumpIf(condition: StopwatchCondition, formatter?: StopwatchFormatter) {
        if (!Stopwatch.isActive()) return
        if (condition(this.completedTasks)) {
            this.dump(formatter)
        }
    }

    private _start(name: string, start?: number): Stopwatch {
        start = start || performance.now()
        this.currentTasks.push({name, start})
        return this
    }

    private _stop(stop?: number): Stopwatch {
        stop = stop || performance.now()
        const task = this.currentTasks.pop()
        if (task) {
            const completedTask: StopwatchCompletedTask = {...task, stop, span: stop-task.start}
            this.completedTasks.push(completedTask)
            Stopwatch._addToSummary(this.name, completedTask)
        }
        return this
    }

}

class Stack<T> {
    private items: T[] = []
    push(item: T): number {
        return this.items.push(item)
    }
    pop(): T | undefined {
        return this.items.shift()
    }
    clean() {
        this.items.length=0
    }
}
//==================================================
