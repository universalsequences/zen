import {UGen, Arg, genArg, Generated, float} from './zen';
import {add, mult, wrap} from './math';
import {Context} from './context';

export const zswitch = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    return (context: Context): Generated => {
        let _cond = genArg(cond, context);
        let _then = genArg(thenExpr, context);
        let _else = genArg(elseExpr, context);
        let varIdx = context.idx++;
        let varName = `switch${varIdx}`;
        let out = `let ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.variable}`;
        return context.emit(out, varName, _cond, _then, _else);
    };
};
