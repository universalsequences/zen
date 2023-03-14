import {Context} from './context'
import {UGen, Arg, genArg, Generated} from './zen';

export const s = (...inputs: UGen []): UGen => {
    return (context: Context): Generated => {
        let code = "";
        let lastVariable = "";
        let i=0;
        let histories: string [] = [];
        for (let input of inputs) {
            let _out = input(context);
            code += ' ' + _out.code;
            lastVariable = _out.variable!;
            context.emittedVariables[lastVariable] = true;
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
            variable: lastVariable,
            histories
        }; 
    }
}