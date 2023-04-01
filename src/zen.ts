import { Context } from './context';
import { History } from './history';

/**
 * Zen is a minimal implementation of a few simple gen~ (max/msp) 
 * operators
 * The goal is that by writing this simple library, and putting it 
 *  onchain, so complex musical onchain NFTs can be made.
 * 
 */

export interface Generated {
    code: string; /*  the code generated */
    variable?: string; /* the variable name referenced */
    histories: string[];
    outputs?: number;
    inputs?: number;
    params: History[];
};

export type UGen = (context: Context) => Generated;

export type ZenGraph = Generated & {
    context: Context;
    histories: string[];
    numberOfInputs: number;
    numberOfOutputs: number;
}

export type Arg = UGen | number;

export const float = (x: number): UGen => {
    let floated = x.toString();
    if (x - Math.floor(x) === 0) {
        floated += ".0";
    }
    return () => {
        return {
            code: floated,
            variable: floated,
            histories: [],
            params: []
        };
    };
};

export const input = (inputNumber: number = 0): UGen => {
    return (context: Context) => {
        let name = context.input(inputNumber);
        return {
            code: name,
            variable: name,
            histories: [],
            inputs: inputNumber,
            params: []
        };
    };
};


// The way this works w/o outputs: each output will go in a different argument
export const zen = (...inputs: UGen[]): ZenGraph => {
    let context: Context = new Context();
    let code = "";
    let lastVariable = "";
    let numberOfOutputs = 1;
    let numberOfInputs = 1;
    let histories: string[] = [];
    let params: History[] = [];
    let i = 0;
    for (let input of inputs) {
        let _out = input(context);
        code += ' ' + _out.code;
        lastVariable = _out.variable!;
        params = [...params, ..._out.params];
        i++;
        if (_out.histories) {
            histories = [
                ...histories,
                ..._out.histories
            ];
        }
        if (_out.outputs !== undefined &&
            (_out.outputs! + 1) > numberOfOutputs) {
            numberOfOutputs = _out.outputs! + 1;
        }
        if (_out.inputs !== undefined && _out.inputs > numberOfInputs) {
            numberOfInputs = _out.inputs;
        }
    }
    if (numberOfOutputs === 1) {
        code += `
output0 = ${lastVariable};
`
    }

    return {
        code,
        context,
        variable: lastVariable,
        histories,
        numberOfInputs: numberOfInputs + 1,
        numberOfOutputs,
        params
    };
}

export const genArg = (input: Arg, context: Context): Generated => {
    if (typeof input === "number") {
        return float(input)(context);
    }
    return input(context);
};


