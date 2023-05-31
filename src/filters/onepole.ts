import { mult, add, sub, div } from '../math';
import { t60, max, s, abs, mix, mstosamps, clamp, Arg, UGen, min, float, Context, Generated, history } from '../index';
import { samplerate } from './zdf';


export const onepole = (in1: Arg, cutoff: Arg): UGen => {
    const hist = history();

    const m = mix(in1, hist(), cutoff);
    return hist(m);
};

export const vactrol = (control: Arg, rise: Arg, fall: Arg): UGen => {
    let z60 = t60(max(1, mstosamps(mix(fall, rise, control))));
    return onepole(control, z60);
};

