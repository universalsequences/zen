import { UGen, Arg, genArg, Generated, float } from './zen';
import { memo } from './memo';
import { Context } from './context';

export const op = (operator: string, name: string, evaluator?: (x: number, y: number) => number, first?: number) => {
    return (...ins: Arg[]): UGen => {
        return memo((context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(name + "Val");
            let code = `let ${opVar} = ${_ins.map(x => x.variable).join(" " + operator + " ")};`
            if (operator === '/') {
                // we need to be save
                code = `let ${opVar} = ${_ins[1].variable} === 0.0 ? 0.0 : ${_ins.map(x => x.variable).join(" " + operator + " ")};`
            }
            if (ins.every(x => typeof x === "number") && evaluator !== undefined) {
                let total = ins.map(x => x as number).reduce(evaluator,
                    first === undefined ? ins[0] as number : first);
                code = `let ${opVar} = ${total}`;
                return context.emit(code, opVar);
            }
            return context.emit(code, opVar, ..._ins);
        });
    };
};

const fixFloat = (x: Generated) => {
    return x;
};

export const func = (func: string, name: string, jsFunc?: (...x: number[]) => number) => {
    return (...ins: Arg[]): UGen => {
        return (context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(`${name}Val`);
            let code = ins.length > 0 && ins.every(x => typeof x === "number") ?
                `let ${opVar} = ${jsFunc!(...ins as number[])}` : `let ${opVar} = ${func}(${_ins.map(x => x.variable).join(",")});`;
            return context.emit(code, opVar, ..._ins);
        }
    };
};

export const add = op("+", "add", (a, b) => a + b, 0);
export const shiftLeft = op("<<", "shiftLeft", (a, b) => a << b, 0);
export const shiftRight = op(">>", "shiftRight", (a, b) => a >> b, 0);
export const sub = op("-", "sub", (a, b) => a - b);
export const xor = op("^", "xor", (a, b) => a ^ b);
export const mult = op("*", "mult", (a, b) => a * b, 1);
export const div = op("/", "div", (a, b) => a / b);
export const lt = op("<", "lt");
export const lte = op("<=", "lte");
export const gt = op(">", "gt");
export const gte = op(">=", "gte");
export const and = op("&&", "and");
export const or = op("||", "or");
export const eq = op("==", "eq");
export const neq = op("!=", "neq");
export const mod = op("%", "mod", (a, b) => a % b);
export const abs = func("Math.abs", "abs", Math.abs);
export const floor = func("Math.floor", "floor", Math.floor);
export const ceil = func("Math.ceil", "ceil", Math.ceil);
export const sin = func("Math.sin", "sin", Math.sin);
export const tan = func("Math.tan", "tan", Math.tan);
export const cos = func("Math.cos", "cos", Math.cos);
export const tanh = func("Math.tanh", "tanh", Math.tanh);
export const pow = func("Math.pow", "pow", Math.pow);
export const atan = func("Math.atan", "atan", Math.atan);
export const exp = func("Math.exp", "exp", Math.exp);
export const sqrt = func("Math.sqrt", "sqrt", Math.sqrt);
export const min = func("Math.min", "min", Math.min);
export const max = func("Math.max", "max", Math.max);



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
if( ${wrapName} < ${_min.variable}) ${wrapName} = ${_min.variable} + ((${wrapName} % ${diff}) + ${diff})%${diff};
else if(${wrapName} > ${_max.variable}) ${wrapName}=  ${_min.variable} + ((${wrapName} % ${diff}) + ${diff})%${diff};
`
        return context.emit(code, wrapName, _input, _min, _max);
    }
};

export const clamp = (input: Arg, min: Arg, max: Arg): UGen => {
    return (context: Context): Generated => {
        let _input = context.gen(input);
        let _min = context.gen(min);
        let _max = context.gen(max);
        let [clampName] = context.useVariables("clampVal");

        let code = `
var ${clampName} = ${_input.variable};
if( ${clampName} < ${_min.variable}) ${clampName} = ${_min.variable};
else if(${clampName} > ${_max.variable}) ${clampName} = ${_max.variable};
`
        return context.emit(code, clampName, _input, _min, _max);
    }
};

export const reciprical = (input: Arg): UGen => {
    return (context: Context): Generated => {
        let _input = context.gen(input);
        let [recipricalName] = context.useVariables("recipricalValue");

        let code = `
var ${recipricalName} = ${_input.variable} === 0 ? 0 : 1.0/${_input.variable};
`
        return context.emit(code, recipricalName, _input);
    }
};

export const not_sub = (input: Arg): UGen => {
    return (context: Context): Generated => {
        let _input = context.gen(input);
        let [notSub] = context.useVariables("notSubValue");

        let code = `
var ${notSub} = 1.0 - ${_input.variable};
`
        return context.emit(code, notSub, _input);
    }
};

export type RoundMode = "ceil" | "trunc" | "floor" | "nearest";

export const round = (numb: Arg, multi: Arg, mode: RoundMode): UGen => {
    return (context: Context) => {
        let num = context.gen(numb);
        let multiple = context.gen(multi);

        let [roundVal, div] = context.useVariables('roundVal', 'div');

        let out = `
let ${div} = ${num.variable} / ${multiple.variable};
`;
        let rounder = "";
        switch (mode) {
            case "ceil":
                rounder = "Math.ceil";
                break;
            case "trunc":
                rounder = "Math.trunc";
                break;
            case "floor":
                rounder = "Math.floor";
            case "nearest":
                rounder = "Math.round";
        }

        out += `
let ${roundVal} = ${multiple.variable} * ${rounder}(${div});
`;

        return context.emit(out, roundVal, num, multiple);
    };
};

export const exp2 = (num: Arg) =>
    pow(2, num);
