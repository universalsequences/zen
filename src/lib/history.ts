import { MemoryBlock } from './block';
import { UGen, Generated } from './zen';
import { Context, emitCode } from './context';

/** Use:
    declare a history at start:
    let history1 = history();
    
    now use it (ex: lowpass filter):
    history1(mix(synth(), history1(), .999))
 */

// an extremely weird type: a function that happens to
// also have a field that allows for setting the value
// of the heap referenced in the history in run time
export type History = ((x?: UGen) => UGen) & {
    value?: (v: number) => void
}

export const history = (val?: number): History => {
    let block: MemoryBlock;
    let historyVar: string;
    let context: Context;

    let _history: History = (input?: UGen): UGen => {
        return (_context: Context): Generated => {
            context = _context;
            let _input = input ? input(context) : undefined;
            if (block === undefined) {
                block = context.alloc(1);
                historyVar = context.useVariables("historyVal")[0];
            }

            let historyDef = `
let ${historyVar} = memory[${block.idx}];
`;

            let code = '';
            let _variable: string = historyVar;
            if (_input) {
                let [newVariable] = context.useVariables("histVal");
                code = `
memory[${block.idx}] = ${_input.variable};
let ${newVariable} = ${historyVar};
`;
                _variable = newVariable;
                let newCode = emitCode(context, code, _variable, _input);
                code = newCode;
            }

            let histories = _input ? emitHistory(_input) : [];

            if (val !== undefined) {
                block.initData = new Float32Array([val]);
            }
            return {
                code,
                variable: _variable,
                histories: [historyDef, ...histories]
            };
        };
    };


    /**  TODO: make this a field setter instead (like hist.value = 4 instead of
     *   hist.value(4))
     */

    /** note: allow to set history directly, via message passing */
    _history.value = (val: number) => {
        if (context === undefined) {
            return;
        }

        context.postMessage({
            type: "memory-set",
            body: {
                idx: block.idx,
                value: val
            }
        });
    };

    return _history;
}

/** used to collect all the histories for a functions arguments */
export const emitHistory = (...gen: Generated[]): string[] => {
    return gen.flatMap(x => x.histories);
};


