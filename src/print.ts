import { Arg, UGen, Generated } from './zen';
import { memo } from './memo';
import { Context } from './context'

export const print = (...inputs: Arg[]): UGen => {
    return (context: Context): Generated => {
        let generated = inputs.map(x => context.gen(x));
        let code = `
if (/*${generated[0]!.variable!} > 0 &&*/  this.counter++ < 5000 && this.counter % 2 >= 0) {
console.log(${generated.map(x => x.variable).join(',')
            });
}
        `;

        return context.emit(code, generated[0].variable!, ...generated);
    };
};
