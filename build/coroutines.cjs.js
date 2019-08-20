'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * A container for running coroutines.
 *
 * @remarks this might be renamed "Timeline" in the future
 *
 */
class Coroutines {
    constructor(name = generateNewName()) {
        this.coroutines = [];
        this.name = name;
    }
    /**
     * Schedules a coroutine for evaluation.
     *
     * Future calls to [[tick]] will run `coro` up to its next `yield` until it is completed.
     *
     * As a convenience if `coro` is a generator function and not a generator, it will be evaluated to produce a generator.
     *
     * ```js
     * function* coroutineFunction() { ... }
     * let coro = new Coroutines()
     * coro.start(coroutineFunction()) // this works
     * coro.start(coroutineFunction)   // so does this
     * ```
     *
     * @param coro coroutine to start
     */
    start(coro) {
        let c = "next" in coro ? coro : coro();
        this.coroutines.push(c);
        return c;
    }
    /**
     * Stops a single coroutine
     *
     * @param coro coroutine to stop
     */
    stop(coro) {
        this.coroutines.splice(this.coroutines.indexOf(coro), 1);
    }
    /**
     * Discards all scheduled coroutines
     */
    stopAll() {
        this.coroutines = [];
    }
    /**
     * Runs all scheduled coroutines once.
     *
     * Each coroutine added with [[start]] will run up to its next `yield` statement. Finished coroutines are removed
     * from the collection.
     */
    tick() {
        let toRemove = [];
        for (const coro of this.coroutines) {
            let result = coro.next();
            if (result.done) {
                toRemove.push(coro);
            }
        }
        for (const x of toRemove) {
            this.coroutines.splice(this.coroutines.indexOf(x), 1);
        }
    }
}
/**
 * @hidden until typedoc can check "only exported" by default
 */
let generateNewName = () => Math.random().toString(36).replace("0.", "Coroutines.");
if (typeof window === "undefined") {
    global["performance"] = require("perf_hooks").performance;
}
/**
 * @hidden until typedoc can check "only exported" by default
 */
let _clock = () => performance.now() / 1000;
/**
 * Sets a new clock function.
 *
 * The clock function returns the elapsed application time in seconds. It is called by some coroutines to measure the
 * passage of time. defaults to `performance.now() / 1000`
 *
 * @param f New clock function
 */
function setClock(f) {
    _clock = f;
}
/**
 * Wait for a number of seconds.
 *
 * @category Coroutine
 *
 * @param seconds How many seconds to wait
 * @param clock A function that returns the elapsed application time in seconds, defaults to the function assigned by [[setClock]]
 * @see [[setClock]]
 */
function* wait(seconds, clock = _clock) {
    let startTime = clock();
    while (clock() - startTime < seconds) {
        yield;
    }
}
/**
 * Wait for a number of frames.
 *
 * @category Coroutine
 *
 * @param n How many frames to wait
 */
function* waitFrames(n) {
    while (n-- > 0) {
        yield;
    }
}
/**
 * Wait until a function `f` returns true.
 *
 * @category Coroutine
 *
 * @param f A function to execute every frame. When `f` returns truthy this coroutine completes.
 */
function* waitUntil(f) {
    while (!f()) {
        yield;
    }
}
/**
 * Wait while a function `f` returns true.
 *
 * @category Coroutine
 *
 * @param f A function to execute every frame. When `f` returns falsey this coroutine completes.
 */
function* waitWhile(f) {
    while (f()) {
        yield;
    }
}
/**
 * Animate a parameter.
 *
 * @category Coroutine
 *
 *
 * @param obj The object to mutate
 * @param prop The property on `obj` to mutate
 * @param to The final value of `obj.prop`
 * @param map A function to shape the animation curve. Given a value between 0 and 1 returns a value between 0 and 1. Defaults to the identity function (no shaping).
 * @param map.x A value between 0 and 1
 * @param clock The clock function used to measure time. Defaults to the function set by [[setClock]]
 * @param interpolate Interpolating function. Given values `a` and `b` returns their interpolated value at `t`, a number between 0 and 1. Defaults to linear interpolation.
 * @param interpolate.a The starting value
 * @param interpolate.b The final value
 * @param interpolate.t The interpolation value, a number between 0 and 1
 * @todo needs way to specify animation speed or time
 * @see [[setClock]]
 */
function* animate(obj, prop, to, { clock = _clock, map = (x) => x, interpolate = (a, b, t) => b * t + a * (1 - t) }) {
    let from = obj[prop];
    let t = 0;
    let lastTime = clock();
    while (t < 1) {
        let nowTime = clock();
        let delta = nowTime - lastTime;
        lastTime = nowTime;
        obj[prop] = interpolate(from, to, map(t));
        t += delta;
        yield;
    }
}
/**
 * @hidden
 */
let advance = (c) => c.next();
/**
 * @hidden
 */
let initialize = (c) => typeof c === "function" ? c() : c;
/**
 * @category Combinator
 * @param coros Coroutines
 */
function* waitLast(coros) {
    let results = coros.map(advance);
    while (results.filter(r => r.done).length !== coros.length) {
        yield;
        for (var i = 0; i < coros.length; i++) {
            let coro = coros[i];
            let res = results[i];
            if (!res.done) {
                results[i] = advance(coro);
            }
        }
    }
}
/**
 * @category Combinator
 * @param coros Coroutines
 */
function* waitFirst(coros) {
    let results = coros.map(advance);
    while (results.filter(r => r.done).length === 0) {
        yield;
        for (var i = 0; i < coros.length; i++) {
            let coro = coros[i];
            let res = results[i];
            if (!res.done) {
                results[i] = advance(coro);
            }
        }
    }
}
/**
 * @category Combinator
 * @param coros Coroutines
 */
function* sequence(coros) {
    if (coros.length == 0)
        return;
    for (let i = 0; i < coros.length; i++) {
        const gen = initialize(coros[i]);
        let res = gen.next();
        yield;
        while (!res.done) {
            res = gen.next();
            yield;
        }
    }
}

exports.Coroutines = Coroutines;
exports.animate = animate;
exports.sequence = sequence;
exports.setClock = setClock;
exports.wait = wait;
exports.waitFirst = waitFirst;
exports.waitFrames = waitFrames;
exports.waitLast = waitLast;
exports.waitUntil = waitUntil;
exports.waitWhile = waitWhile;
//# sourceMappingURL=coroutines.cjs.js.map
