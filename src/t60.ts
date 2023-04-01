import { UGen, Generated, genArg, Arg } from './zen';
import { mult, mix } from './math';
import { history, History } from './history'
import { Context } from './context';
import { memo } from './memo';

export const t60 = (input: Arg): UGen => {
    return memo((context: Context): Generated => {
        let [variable] = context.useVariables("t60");
        let _input = genArg(input, context);
        let code = `
let ${variable} = Math.exp(-6.907755278921 / ${_input.variable});
`;
        return context.emit(
            code,
            variable,
            _input);
    });
};

export type TrigGen = UGen & {
    trigger?: () => void
};

export const decay = (decayTime: Arg = 44100): TrigGen => {
    let ssd: History = history();

    let trigDecay: TrigGen = ssd(mult(ssd(), t60(decayTime)));
    trigDecay.trigger = () => {
        ssd.value!(1);
    };

    return trigDecay;
};

export const decayTrig = (input: Arg, decayTime: Arg = 44100): TrigGen => {
    let ssd: History = history();

    let trigDecay: TrigGen = ssd(mix(input, ssd(), t60(decayTime)));

    return trigDecay;
};

