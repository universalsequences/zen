import {emit, UGen, Arg, genArg, Context, Generated, emitCode, float} from './zen';
import {emitHistory} from './history'

const op = (operator: string, name: string) => {
    return (... ins: Arg[]): UGen =>{
        return (context: Context): Generated => {
            let varIdx = context.idx++;
            let _ins = ins.map(f => genArg(f, context));
            let opVar = `${name}Val${varIdx}`;
            let code = `let ${opVar} = ${_ins.map(x => x.variable).join(" " + operator + " ")};`
            return emit(code, opVar, ..._ins);
        }
    };
};

const func = (func: string, name: string) => {
    return (... ins: Arg[]): UGen =>{
        return (context: Context): Generated => {
            let varIdx = context.idx++;
            let _ins = ins.map(f => genArg(f, context));
            let opVar = `${name}Val${varIdx}`;
            let code = `let ${opVar} = ${func}(${_ins.map(x => x.variable).join(",")});`
            return emit(code, opVar, ..._ins);
        }
    };
};

export const add = op("+", "add");
export const sub = op("-", "sub");
export const mult = op("*", "mult");
export const div  = op("/", "div");
export const abs = func("Math.abs", "abs");

export const mix = (a: Arg, b: Arg, amount: Arg): UGen => {
    return add(mult(a, amount),
               mult(b, sub(float(1), amount)));
};

export const wrap = (input: Arg, min: Arg, max: Arg): UGen => {
    return (context: Context): Generated => {
        let _input = genArg(input, context);
        let _min = genArg(min, context);
        let _max = genArg(max, context);
        let diff = `${_max.variable} - ${_min.variable}`;
        let idx = context.idx++;
        let wrapName = `wrapVal${idx}`;

        let code = `
var ${wrapName} = ${_input.variable};
if( ${wrapName} < ${_min.variable}) ${wrapName} += ${diff};
else if( ${wrapName} > ${_max.variable} ) ${wrapName} -= ${diff};
`
        return emit(code, wrapName, _input, _min, _max);
    }
};
