import {Memory, Block} from './memory-helper'
import {Generated} from './zen';
import {emitHistory} from './history'

export interface IContext {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
}

const HEAP_SIZE = 44100*10;

type EmittedVariables = {
    [key: string]: boolean;
};

export class Context {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
    emittedVariables: EmittedVariables;

    constructor() {
        // TODO: should be able to grow the heap
        this.memory = new Memory(HEAP_SIZE),
        this.idx = 0;
        this.histories = 0;
        this.numberOfInputs = 1;
        this.sampleRate = 44100;
        this.emittedVariables = {};
    }

    isVariableEmitted(name: string): boolean {
        return this.emittedVariables[name] === true;
    }

    emit(code: string, variable: string, ... args : Generated[]): Generated {
        return {
            code: emitCode(this, code, ... args),
            variable,
            history: emitHistory(...args),
        };
    };

    input(inputNumber: number): string {
        if (inputNumber > this.numberOfInputs) {
            this.numberOfInputs = inputNumber;
        }
        return 'in' + inputNumber;
    }
}



export const emitCode = (context: Context, code: string, ... gens: Generated[]): string => {
    let vout = "";
    for (let gen of gens) {
        if (containsVariable(gen)) {
            if (!context.isVariableEmitted(gen.variable!)) {
                vout += gen.code;
                context.emittedVariables[gen.variable!] = true;
            }
        }
    }
    return vout + '\n' + code;
}

// a variable is variable referencing the code. so if they are
// the same, then this is not a vari
const containsVariable = (gen: Generated): boolean => {
    return gen.code !== gen.variable;
}

