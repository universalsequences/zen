import { UGen, Arg, Generated, float } from './zen'
import { phasor } from './phasor';
import { memo } from './memo';
import { Context } from './context';
import { add, wrap } from './math';

const SINE_TABLE_SIZE = 1024;
const SINE_TABLE = "this.sineTable";

export const cycle = (
    freq: Arg,
    phase: Arg = 0
): UGen => {
    return memo((context: Context): Generated => {
        let _freq = context.gen(freq);
        let _phase = context.gen(phase);
        let cyclePhase = wrap(
            add(
                phasor(freq),
                phase),
            0, 1)(context);

        let [
            floatIndex,
            frac,
            lerp,
            index,
            nextIndex] = context.useVariables(
                "floatIndex", "frac", "lerp", "index", "nextIndex");

        let out = `
${cyclePhase.code}
let ${floatIndex} = ${cyclePhase.variable} * ${SINE_TABLE_SIZE};
let ${frac} = ${floatIndex} - Math.floor(${floatIndex});
let ${index} = Math.floor(${floatIndex});
let ${nextIndex} = ${index} + 1;
if (${nextIndex} >= ${SINE_TABLE_SIZE}) {
  ${nextIndex} = 0;
}
let ${lerp} = (1.0-${frac})*${SINE_TABLE}[${index}] + ${frac}*${SINE_TABLE}[${nextIndex}];
`;
        return context.emit(out, lerp, _freq, _phase);
    });
};
