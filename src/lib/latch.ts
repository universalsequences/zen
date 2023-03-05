import {UGen, Arg, genArg, Generated, } from './zen';
import {Context} from './context';
import {Block} from './memory-helper';

export const latch = (value: Arg, hold: Arg=0) => {
    return (context: Context) => {
        let block: Block =  context.memory.alloc(1);
        let varIdx = context.idx++;
        let varName = `latch${varIdx}`;
        let _value = genArg(value, context);
        let _hold = genArg(hold, context);

        let code = `
let ${varName} = memory[${block.idx}];
if (${_hold.variable} > 0) {
  memory[${block.idx}] = ${_value.variable};
  ${varName} = memory[${block.idx}];
}
`;
        return context.emit(code, varName, _value, _hold);
    };
};
