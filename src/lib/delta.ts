import {UGen} from './zen';
import {history} from './history';
import {lt} from './compare'
import {sign, div, sub, add, abs} from './math';

export const delta = (input: UGen): UGen => {
    let h = history();
    return sub(input, h(input));
};

export const change = (input: UGen): UGen => {
    let h = history();
    return sign(sub(input, h(input)));
};

export const rampToTrig = (ramp: UGen): UGen => {
    let history1 = history();

    return lt(
        0,
        change(
            lt(
                0.5,
                abs(div(
                    sub(ramp, history1(ramp)),
                    add(ramp, history1(ramp)))))));
};
