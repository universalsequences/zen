import {float, emitCode, Generated, UGen, Context} from './zen';
import {emitHistory, history} from './history';
import {sub, abs} from './math';

export const delta = (input: UGen): UGen => {
    let h = history(input);
    return sub(input, h);
};

export const lt = (a: UGen, b: UGen): UGen => {
    return (context: Context): Generated => {
        let varIdx = context.idx++;
        let _a = a(context);
        let _b = b(context);
        let ltVar = `ltVal${varIdx}`;
        let code = `
let ${ltVar} = ${_a.variable} < ${_b.variable};
`;
        return {
            code: emitCode(code, _a, _b),
            variable: ltVar,
            history: emitHistory(_a, _b),
        };
    }
};

export const rampToTrig = (ramp: UGen): UGen => {
    return lt(float(0.6), abs(delta(ramp)));
};
