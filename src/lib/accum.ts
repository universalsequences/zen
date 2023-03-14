import {UGen, Arg, genArg,  Generated, } from './zen';
import {Context} from './context';
import {MemoryBlock} from './block';
import {memo} from './memo'

export interface AccumParams {
    min: number,
    max: number,
    exclusive?: boolean // whether we should allow the accumulator to get to max
}
export const accum = (incr: Arg, reset: Arg=0, params: AccumParams) => {
    return memo((context: Context) => {
        let block: MemoryBlock =  context.alloc(1);
        let [varName] = context.useVariables("accum");
        let _incr = genArg(incr, context);
        let _reset = genArg(reset, context);
        let resetCheck = typeof reset === "number" && reset === 0 ?
            "" :`if (${_reset.variable} > 0) ${varName} = ${params.min};`
        
        let comp = params.exclusive === true ? ">=" : ">";
        let code = `
let ${varName} = memory[${block.idx}];
${resetCheck}
memory[${block.idx}] = ${varName} + ${_incr.variable};
if (memory[${block.idx}] ${comp} ${params.max}) memory[${block.idx}] -= ${!params.exclusive ? params.max - params.min + 1 : params.max- params.min};
`;
        return context.emit(code, varName, _incr, _reset);
    });
};
