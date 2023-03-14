import {UGen, Arg, genArg, Generated, float} from './zen';
import {add, mult, wrap} from './math';
import {Context} from './context';

export const zswitch = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    return (context: Context): Generated => {
        let _cond = context.gen(cond);
        let _then = context.gen(thenExpr);
        let _else = context.gen(elseExpr);
        let [varName] = context.useVariables("switch");
        let out = `let ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.variable}`;
        return context.emit(out, varName, _cond, _then, _else);
    };
};
