import {UGen, Arg, genArg,  Generated, } from './zen';
import {Context} from './context';
import {Block} from './memory-helper';

export interface AccumParams {
    min: number,
    max: number
}
export const accum = (incr: Arg, reset: Arg=0, params: AccumParams) => {
    return (context: Context) => {
        let block: Block =  context.memory.alloc(1);
        let varIdx = context.idx++;
        let varName = `accum${varIdx}`;
        let _incr = genArg(incr, context);
        let _reset = genArg(reset, context);
        let resetCheck = typeof reset === "number" && reset === 0 ?
            "" :`if (${_reset.variable} > 0) ${varName} = ${params.min};`
        
        let code = `
let ${varName} = memory[${block.idx}];
${resetCheck}
memory[${block.idx}] = ${varName} + ${_incr.variable};
if (memory[${block.idx}] > ${params.max}) memory[${block.idx}] -= ${params.max- params.min};
`;
        return context.emit(code, varName, _incr, _reset);
    };
};
