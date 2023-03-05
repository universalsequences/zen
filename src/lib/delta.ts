import {float, Arg, genArg, Generated, UGen} from './zen';
import {Context} from './context';
import {emitHistory, history} from './history';
import {sub, abs} from './math';

export const delta = (input: UGen): UGen => {
    let h = history(input);
    return sub(input, h);
};

export const lt = (a: Arg, b: Arg): UGen => {
    return (context: Context): Generated => {
        let varIdx = context.idx++;
        let _a = genArg(a, context);
        let _b = genArg(b, context);
        let ltVar = `ltVal${varIdx}`;
        let code = `
let ${ltVar} = ${_a.variable} < ${_b.variable};
`;
        return context.emit(code, ltVar, _a, _b);
    }
};

// TODO: implement the gen book version that is more thorough
export const rampToTrig = (ramp: UGen): UGen => {
    return lt(float(0.6), abs(delta(ramp)));
};
