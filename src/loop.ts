import { Generated, Arg, UGen, genArg } from "./zen";
import { prettyPrint } from './worklet'
import { LoopContext, Context } from './context'

export interface Range {
    min: Arg;
    max: Arg;
}

/**
 * The most common gen loop pattern is looping through a body
 * and summing the result of each iteration.
 * 
 * Example "sum" loop:
 * let summedRandoms = sumLoop(range(0, 4), (i) => mult(random(), i))
 * The way loops works is it should sum the result of the body
 * 
 * Notes on gen's limitations: Gen has the limitation that when using
 * something like "accum" which stores state, it cant be used in a for-loop
 * or else it's memory will be over-written. 
 * 
 * Maybe theres a way to allocate memory dynamically for each iteration of the
 * loop (if we know the range before hand...)
 * 
 * If we create a new type of context that tells the accum that its in a loop
 * it will create
 */
export type LoopBody = (i: UGen) => UGen;

export const sumLoop = (range: Range, body: LoopBody): UGen => {
    return (context: Context): Generated => {
        let [i, sum] = context.useVariables("i", "sum");
        let loopContext = typeof range.min === "number" && typeof range.max === "number" ?
            new LoopContext(i, range, context) :
            context;

        let _min = context.gen(range.min);
        let _max = context.gen(range.max);
        let _variable = variable(i);

        let _body = body(_variable)(loopContext);
        let histories = Array.from(new Set(_body.histories));
        let out = `
let ${sum} = 0;
for (let ${i}=${_min.variable}; ${i} < ${_max.variable}; ${i}++ ) {
${histories.join("\n")}
${prettyPrint("    ", _body.code)}
    ${sum} += ${_body.variable};
}
`;

        return context.emit(out, sum);
    }
}

export const rawSumLoop = (range: Range, body: UGen, i: string): UGen => {
    return (context: Context): Generated => {
        let [sum] = context.useVariables("sum");
        let loopContext = typeof range.min === "number" && typeof range.max === "number" ?
            new LoopContext(i, range, context) :
            context;

        let _min = context.gen(range.min);
        let _max = context.gen(range.max);
        //let _variable = variable(i);

        let _body = body(loopContext);
        console.log('after calling the body loopContext.idx=', loopContext.idx);
        let histories = Array.from(new Set(_body.histories));
        let out = `
let ${sum} = 0;
for (let ${i}=${_min.variable}; ${i} < ${_max.variable}; ${i}++ ) {
${histories.join("\n")}
${prettyPrint("    ", _body.code)}
    ${sum} += ${_body.variable};
}
`;

        return context.emit(out, sum);
    }
}


export const variable = (value: string): UGen => {
    return (context: Context): Generated => {
        let [_var] = context.useVariables("loopIdx");
        let out = `let ${_var} = ${value}`;
        return context.emit(out, _var);
    }
}
