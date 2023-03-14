import {Context} from './context';

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
};

export type UGen = (context: Context) => Generated;

export type ZenGraph = Generated & {
    context: Context;
    histories: string [];
}

export type Arg = UGen | number;

export const float= (x: number): UGen => {
    return () => {
        return {
            code: x.toString(),
            variable: x.toString(),
            histories: []
        };
    };
};

export const input= (inputNumber: number = 0): UGen => {
    return (context: Context) => {
        let name = context.input(inputNumber);
        return {
            code: name,
            variable: name,
            histories: []
        };
    };
};


export const zen = (...inputs: UGen[]): ZenGraph => {
    let context: Context = new Context();
    let code = "";
    let lastVariable = "";
    let i=0;
    let histories: string [] = [];
    for (let input of inputs) {
        let _out = input(context);
        code += ' ' + _out.code;
        lastVariable = _out.variable!;
        i++;
        if (_out.histories) {
            histories = [
                ... histories,
                ... _out.histories
            ];
        }
    }
    return {
        code,
        context,
        variable: lastVariable,
        histories
    };
}

export const genArg = (input: Arg, context: Context): Generated  => {
    if (typeof input === "number") {
        return float(input)(context);
    }
    return input(context);
};


