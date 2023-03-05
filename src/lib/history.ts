import {Block} from './memory-helper'
import {UGen, Generated, Context, emitCode} from './zen';

/**
   in order for the entire thing to work we need a Context
   a context is an entire graph that is being built
   contains memory that is allocated and used to determine
   the variable names and memory indices
   
   inspo from react 
*/

/**
   Form factors:
   
   graph(
     mult(
       4, 
       accum(4, 3)));
 */

// form factor: all functions done via currying (the GOAT)
// returning a lazy function to be executed with the correct
// context 

// histories-- really any ugen-- have a n input and an output

// a ugen takes a context and returns a piece of compute data

export interface History {
    block: Block;
    name: any;
}


// example mult(4, history(mult(4, 5)))
export const history = (input?: UGen, historyName?: any): UGen => {
    return (context: Context): Generated => {
        let block: Block = context.memory.alloc(1);
        let varIdx = context.idx++;
        let historyVar = `history${varIdx}`;

        let _input = input ? input(context) : undefined;
        if (_input) {
            let _history = _input.history;
            if (_history !== undefined && _history.name == historyName) {
                context.memory.free(block);
                block = _history.block;
            }
        }

        let code = `
let ${historyVar} = memory[${block.idx}];
`;

        if (_input) {
            code += `
memory[${block.idx}] = ${_input.variable};
`;
        }
        
        return {
            code: _input ? emitCode(code, _input) : code,
            variable: historyVar,
            history: historyName ?  {
                name: historyName,
                block
            } : undefined
        };
    };
};

export const emitHistory = (... gen: Generated[]): History | undefined => {
    let histories = gen.map(x => x.history).filter(x => x);
    let h = histories.length === 0 ? undefined : histories[0];
    return h;
};


