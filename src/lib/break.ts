import { UGen, Generated } from './zen';
import { Context } from './context';

export const breakIf = (condition: UGen): UGen => {
    return (context: Context): Generated => {
        let cond = context.gen(condition);
        let code = `
if (${cond.variable}) {
  break;
}
`
        return context.emit(code, "", cond);
    };
};
