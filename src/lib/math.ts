import {UGen, Arg, genArg, Generated, float} from './zen';
import {memo} from './memo';
import {Context} from './context';

export const op = (operator: string, name: string, evaluator?: (x:number, y: number) => number, first?: number) => {
    return (... ins: Arg[]): UGen =>{
        return memo((context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(name + "Val"); 
            let code = `let ${opVar} = ${_ins.map(x => x.variable).join(" " + operator + " ")};`
            if (ins.every(x => typeof x === "number") && evaluator !== undefined) {
                let total = ins.map(x => x as number).reduce(evaluator, 
                    first===undefined ? ins[0] as number : first);
                code = `let ${opVar} = ${total}`;
                return context.emit(code, opVar);
            }
            return context.emit(code, opVar, ..._ins);
        });
    };
};

export const func = (func: string, name: string, jsFunc?: (... x: number []) => number) => {
    return (... ins: Arg[]): UGen =>{
        return (context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(`${name}Val`); 
            let code = ins.length > 0 && ins.every(x => typeof x === "number") ? 
            `let ${opVar} = ${jsFunc!(...ins as number[])}` : `let ${opVar} = ${func}(${_ins.map(x => x.variable).join(",")});`;
            return context.emit(code, opVar, ..._ins);
        }
    };
};

export const add = op("+", "add", (a, b) => a+b, 0);
export const shiftLeft = op("<<", "shiftLeft", (a, b) => a<<b, 0);
export const shiftRight = op(">>", "shiftRight", (a, b) => a>>b, 0);
export const sub = op("-", "sub", (a, b) => a-b);
export const mult = op("*", "mult", (a, b) => a*b, 1);
export const div  = op("/", "div", (a, b) => a/b);
export const abs = func("Math.abs", "abs", Math.abs);
export const floor = func("Math.floor", "floor", Math.floor);
export const ceil = func("Math.ceil", "ceil", Math.ceil);
export const sin = func("Math.sin", "sin", Math.sin);
export const cos = func("Math.cos", "cos", Math.cos);
export const pow = func("Math.pow", "pow", Math.pow);
export const sqrt = func("Math.sqrt", "sqrt", Math.sqrt);
export const min = func("Math.min", "min", Math.min);
export const max = func("Math.max", "max", Math.max);
export const lt = op("<", "lt");
export const lte = op("<=", "lte");
export const gt = op(">", "gt");
export const gte = op(">=", "gte");
export const and = op("&&", "and");
export const or = op("||", "or");
export const eq = op("==", "eq");
export const neq = op("!=", "neq");


export const sign = (val: Arg): UGen => {
    return sub(
        lt(0, val),
        lt(val, 0));
};

export const mix = (a: Arg, b: Arg, amount: Arg): UGen => {
    return add(mult(b, amount),
               mult(a, sub(float(1), amount)));
};

export const wrap = (input: Arg, min: Arg, max: Arg): UGen => {
    return (context: Context): Generated => {
        let _input = context.gen(input);
        let _min = context.gen(min);
        let _max = context.gen(max);
        let diff = `${_max.variable} - ${_min.variable}`;
        let [wrapName] = context.useVariables("wrapVal"); 

        let code = `
var ${wrapName} = ${_input.variable};
if( ${wrapName} < ${_min.variable}) ${wrapName} += ${diff};
else if(${wrapName} > ${_max.variable}) ${wrapName} -= ${diff};
`
        return context.emit(code, wrapName, _input, _min, _max);
    }
};
