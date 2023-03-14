import {UGen} from './zen';
import {cos, mult} from './math';
import {scale} from './scale';
import { B612 } from 'next/font/google';

export const sine = (ramp: UGen) => {
    return scale(
        cos(mult(Math.PI, ramp)),
        1, -1, 0, 1)
}
