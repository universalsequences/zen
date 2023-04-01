import { Context } from './context';
import { ContextualBlock } from './history';
import { MemoryBlock } from './block';
import { UGen, Generated } from './zen';

export type Clicker = ((context: Context) => Generated) & {
    click?: (time?: number) => void
}

export const click = (): Clicker => {
    let block: MemoryBlock;
    let _context: Context;
    let clickVar: string;
    let contextBlocks: ContextualBlock[] = [];

    let clicker: Clicker = (context: Context): Generated => {
        let contextChanged = context !== _context;
        _context = context;
        if (block === undefined || contextChanged) {
            block = context.alloc(1);
            clickVar = context.useVariables("clickVal")[0];
            contextBlocks.push({ block, context });
        }

        // the memory gets set via messaging and once a 1 is received
        // immediately set it back to 0
        // aka: generate a 1 for exactly one SAMPLE!
        let code = `
let ${clickVar} = memory[${block.idx}];
if (${clickVar} > 0) {
   memory[${block.idx}] = 0;
}
`;
        return context.emit(code, clickVar);
    };

    clicker.click = (time?: number) => {
        if (!_context) {
            return;
        }
        for (let { context, block } of contextBlocks) {
            context.postMessage({
                type: time !== undefined ? "schedule-set" : "memory-set",
                body: {
                    idx: block.idx,
                    value: 1,
                    time
                }
            });
        }
    };
    return clicker;
};
