import { Arg, UGen, Generated } from './zen'
import { Context } from './context'

export const sampstoms = (input: Arg) => {
    return (context: Context) => {
        // samples to ms 44100 - > 1000
        let _input = context.gen(input);
        let [ms] = context.useVariables('ms');
        let code = `let ${ms} = 1000.0*${_input.variable}/${context.sampleRate};`;

        return context.emit(code, ms, _input);
    };
};

export const mstosamps = (input: Arg) => {
    return (context: Context) => {
        // ms to samps 1000 -> 44100 
        let _input = context.gen(input);
        let [samps] = context.useVariables('samps');
        let code = `let ${samps} = (${_input.variable}/1000)*${context.sampleRate};`;

        return context.emit(code, samps, _input);
    };
};

