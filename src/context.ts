import { Memory } from './memory-helper'
import { Block, MemoryBlock, LoopMemoryBlock } from './block'
import { Arg, Generated, float } from './zen';
import { emitParams, emitHistory } from './history'
import { Range } from './loop';
import { channel } from 'diagnostics_channel';

export interface IContext {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
}

const HEAP_SIZE = 512 * 512 * 16;

type EmittedVariables = {
    [key: string]: boolean;
};

export type ContextMessageType = "memory-set" | "memory-get" | "schedule-set" | "init-memory";

export interface ContextMessage {
    type: ContextMessageType;
    body: any;
}

export class Context {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
    emittedVariables: EmittedVariables;
    worklets: AudioWorkletNode[];

    constructor() {
        // TODO: should be able to grow the heap
        this.memory = new Memory(this, HEAP_SIZE),
            this.idx = 0;
        this.histories = 0;
        this.numberOfInputs = 1;
        this.sampleRate = 44100;
        this.emittedVariables = {};
        this.worklets = [];
    }

    alloc(size: number): MemoryBlock {
        return this.memory.alloc(size);
    }

    addWorklet(workletNode: AudioWorkletNode) {
        this.worklets.push(workletNode);
    }

    postMessage(msg: ContextMessage) {
        this.worklets.forEach(
            worklet => worklet.port.postMessage(msg));
    }

    onMessage(msg: ContextMessage) {
        // look thru the blocks in use-- are any of them expecting
        // a message of this type?
        for (let block of this.memory.blocksInUse) {
            if (block.waitingForResponse === msg.type) {
                block.respond(msg.body);
            }
        }
    }

    isVariableEmitted(name: string): boolean {
        return this.emittedVariables[name] === true;
    }

    useVariables(...names: string[]): string[] {
        let idx = this.idx++;
        return names.map(name => `${name}${idx}`);
    }

    gen(input: Arg): Generated {
        if (input === undefined) {
            input = 0;
        }
        if (typeof input === "number") {
            return float(input)(this);
        }
        if (typeof input === "function") {
            return input(this);
        } else {
            return float(0)(this);
        }
    };

    emit(code: string, variable: string, ...args: Generated[]): Generated {
        let histories = emitHistory(...args);
        let params = emitParams(...args);
        let out: Generated = {
            code: emitCode(this, code, variable, ...args),
            variable,
            histories,
            params
        };
        let inputs = args
            .filter(x => x.inputs !== undefined)
            .map(x => x.inputs as number);
        if (inputs.length > 0) {
            out.inputs = Math.max(...inputs);
        }
        return out;
    };

    input(inputNumber: number): string {
        if (inputNumber > this.numberOfInputs) {
            this.numberOfInputs = inputNumber;
        }
        return 'in' + inputNumber;
    }
}

export class LoopContext extends Context {
    loopIdx: string;
    loopSize: number;
    context: Context | LoopContext;

    constructor(loopIdx: string, range: Range, context: Context | LoopContext) {
        super();
        console.log("loop context called with context.idx=", context.idx);
        this.context = context;
        this.loopIdx = loopIdx;
        this.loopSize = (range.max as number) - (range.min as number);
        this.memory = context.memory;
        this.idx = context.idx;
        this.histories = context.histories;
        this.numberOfInputs = context.numberOfInputs;
        this.sampleRate = context.sampleRate;
        this.emittedVariables = { ...context.emittedVariables };
        this.worklets = context.worklets;
    }

    useVariables(...names: string[]): string[] {
        let ret = super.useVariables(...names);
        this.context.useVariables(...names);
        return ret;
    }

    isVariableEmitted(name: string): boolean {
        // check any upstream blocks to see if we've already emmitted
        return this.emittedVariables[name] === true
            || super.isVariableEmitted(name);
    }

    alloc(size: number): MemoryBlock {
        let block: MemoryBlock = this.memory.alloc(size * this.loopSize);
        let context = this.context;
        let _block = new LoopMemoryBlock(
            this,
            block.idx as number,
            block.size,
            block.allocatedSize);
        return _block;
    }

}



export const emitCode = (context: Context, code: string, variable: string, ...gens: Generated[]): string => {
    let vout = "";
    if (code.trim().startsWith("let") && context.isVariableEmitted(variable)) {
        return variable;
    }
    context.emittedVariables[variable] = true;
    for (let gen of gens) {
        if (containsVariable(gen)) {
            vout += gen.code;
            context.emittedVariables[gen.variable!] = true;
        }
    }
    return vout + '\n' + code;
}

// a variable is variable referencing the code. so if they are
// the same, then this is not a vari
const containsVariable = (gen: Generated): boolean => {
    return gen.code !== gen.variable;
}

