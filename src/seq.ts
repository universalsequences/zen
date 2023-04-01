import { Context } from './context'
import { UGen, Arg, genArg, Generated } from './zen';
import { History } from './history';

export const s = (...inputs: Arg[]): UGen => {
    return (context: Context): Generated => {
        let code = "/** SEQ START **/";
        let lastVariable = "";
        let i = 0;
        let histories: string[] = [];
        let params: History[] = [];
        let outputs = 0;
        for (let input of inputs) {
            let a = new Date().getTime();
            if (typeof input !== "function") {
                continue;
            }
            let _out = (input as UGen)(context);
            params = [...params, ..._out.params];
            code += ' ' + _out.code + ';';
            lastVariable = _out.variable!;
            context.emittedVariables[lastVariable] = true;
            i++;
            if (_out.histories) {
                histories = [
                    ...histories,
                    ..._out.histories
                ];
            }
            let b = new Date().getTime();
            if (_out.outputs! > outputs) {
                outputs = _out.outputs!;
            }
        }

        code += "/** SEQ END **/";
        return {
            outputs,
            params,
            code,
            variable: lastVariable,
            histories
        };
    }
}
