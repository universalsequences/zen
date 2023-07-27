import { Context, Arg, Generated, UGen } from './index';
import { Target } from './targets';

/**
 * Its not e
 */
export const message = (name: string, subType: Arg, value: Arg) => {
    return (context: Context): Generated => {
        let _value = context.gen(value);
        let _subType = context.gen(subType);
        let [vari] = context.useVariables('message');
        // in a loop this will only catch one of the iterations (the last)
        // instead we need to have some sort of threshold
        // or store the messages somewhere
        let code = ``;
        if (context.target === Target.C) {
            code += `
new_message(@beginMessage${name}@endMessage, ${_subType.variable}, ${_value.variable});
`
        } else {
            code += `
if (this.messageCounter % 2000 === 0) {
this.port.postMessage({type: @beginMessage${name}@endMessage, subType: ${_subType.variable}, body: ${_value.variable}});
}
`;
        }
        code += `
${context.varKeyword} ${vari} = ${_value.variable};

`;

        return context.emit(code, vari, _subType, _value);
    };
};
