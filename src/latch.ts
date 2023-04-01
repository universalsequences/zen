import { Arg, Generated, UGen } from './zen';
import { Context } from './context';
import { MemoryBlock } from './block'
import { memo } from './memo';

export const latch = (value: Arg, hold: Arg = 0): UGen => {
    return memo((context: Context): Generated => {
        let block: MemoryBlock = context.alloc(1);
        let [latchVal] = context.useVariables("latchVal");
        let _value = context.gen(value);
        let _hold = context.gen(hold);

        let code = `
let ${latchVal} = memory[${block.idx}];
if (${_hold.variable} > 0) {
  memory[${block.idx}] = ${_value.variable};
  ${latchVal} = memory[${block.idx}];
}
`;
        return context.emit(code, latchVal, _value, _hold);
    });
};
