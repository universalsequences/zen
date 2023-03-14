import {data, peek, poke} from './data';
import {UGen, Generated, Arg, genArg} from './zen';
import {Context} from './context';
import {accum} from './accum';
import {lerpPeek} from './lerp'

const MAX_SIZE = 44100; // 4 sec max

export const delay = (input: UGen, delayTime: Arg): UGen => {
    let buf = data(MAX_SIZE, 1);

    return (context: Context): Generated => {
        let buffer = buf(context);
        console.log("delay buffer=", buffer, context)
        let _input = input(context);
        let _delayTime = context.gen(delayTime);
        let [delayName, indexName, delayIndexName] = context.useVariables(
          "delayVal", "index", "delayIndex");

        let _accum = accum(1, 0, {min: 0, max: MAX_SIZE, exclusive: true})(context);
        let index = `${buffer.idx} + (${_accum.variable})`
        let lerped = lerpPeek(context, buffer, delayIndexName);
        let out = `
${_accum.code}
let ${indexName} = ${index};
memory[${indexName}] = ${_input.variable};
let ${delayIndexName} = ${indexName} - ${_delayTime.variable};
if (${delayIndexName} < ${buffer.idx}) {
  ${delayIndexName} += ${MAX_SIZE};
}
${lerped.code}
let ${delayName} = ${lerped.variable};
`;

        return context.emit(out, delayName, _input, _delayTime);
    };
};
