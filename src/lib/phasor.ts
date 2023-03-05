import {AccumParams, accum} from './accum';
import {UGen, Arg, Generated, float, Context} from './zen'
import {div, mult} from './math'


const defaults: AccumParams = {
    min: -1,
    max: 1
};

export const phasor = (
    freq: Arg,
    reset: Arg = 0,
    params: AccumParams = defaults
): UGen => {
    return (context: Context): Generated => {
        let range = params.max - params.min;
        return accum(
            div(
                mult(freq, range),
                context.sampleRate),
            reset,
            params)(context);
    };
};
