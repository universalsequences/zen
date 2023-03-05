import {UGen, Generated, Arg, Context} from './zen';
import {scale} from './scale';
import {lt} from './delta';
import {zswitch} from './switch';

export const triangle = (ramp: UGen, duty: Arg = 0.5): UGen => {
    return zswitch(
        lt(ramp, duty),
        scale(ramp, 0, duty, 0, 1),
        scale(ramp, duty, 1, 1, 0))
};
