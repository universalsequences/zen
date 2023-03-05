import {Memory, Block} from './memory-helper'
import {emitHistory} from './history'

/**
 * Zen is a minimal implementation of a few simple gen~ (max/msp) 
 * operators
 * The goal is that by writing this simple library, and putting it 
 *  onchain, so complex musical onchain NFTs can be made.
 * 
 */

export interface Context {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
}

class ZenContext {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;

    constructor() {
        this.memory = new Memory(4096),
        this.idx = 0;
        this.histories = 0;
        this.numberOfInputs = 1;
        this.sampleRate = 44100;
    }

    input(inputNumber: number): string {
        if (inputNumber > this.numberOfInputs) {
            this.numberOfInputs = inputNumber;
        }
        return 'in' + inputNumber;
    }
}

export interface Generated {
    code: string; // the code generated
    variable?: string; // the variable name referenced 
    history?: History;
};

export type UGen = (context: Context) => Generated;

export const float= (x: number): UGen => {
    return () => {
        return {
            code: x.toString(),
            variable: x.toString()
        };
    };
};

export const input= (inputNumber: number = 0): UGen => {
    return (context: ZenContext) => {
        let name = context.input(inputNumber);
        return {
            code: name,
            variable: name
        };
    };
};

export type ZenGraph = Generated & {
    context: Context;
}

export const zen = (input: UGen): ZenGraph => {
    let context: Context = new ZenContext()
    return {
        ...input(context),
        context
    };
}

export type Arg = UGen | number;

export const genArg = (input: Arg, context: Context): Generated  => {
    if (typeof input === "number") {
        return float(input)(context);
    }
    return input(context);
};

export const emit = (code: string, variable: string, ... args : Generated[]): Generated => {
    return {
        code: emitCode(code, ... args),
        variable,
        history: emitHistory(...args),
    };
};

export const emitCode = (code: string, ... gens: Generated[]): string => {
    let vout = "";
    for (let gen of gens) {
        if (containsVariable(gen)) {
            vout += gen.code;
        }
    }
    return vout + '\n' + code;
}

// a variable is variable referencing the code. so if they are
// the same, then this is not a variable
const containsVariable = (gen: Generated): boolean => {
    return gen.code !== gen.variable;
}


