import {Arg, genArg, UGen, Generated} from './zen';
import {Context} from './context';
import {add, sub, div, mult} from './math';

export const scale = (value: Arg, min1: Arg, max1: Arg, min2: Arg, max2: Arg): UGen => {
   return (context: Context): Generated => {
        let _value = genArg(value, context);
        let _min1 = genArg(min1, context);
        let _min2 = genArg(min2, context);
        let _max1 = genArg(max1, context);
        let _max2 = genArg(max2, context);
        let varIdx = context.idx++;
        let scaleName = `scaleVal${varIdx}`;
        let range1Name = `range1${varIdx}`;
        let range2Name = `range2${varIdx}`;
        let range1 = typeof min1 === "number" && typeof max1 === "number" ?
           max1 - min1 : `${_max1.variable} - ${_min1.variable}`;
        let range2 = typeof min2 === "number" && typeof max2 === "number" ?
           max2 - min2 : `${_max2.variable} - ${_min2.variable}`;

        let code = `
let ${range1Name} = ${range1};
let ${range2Name} = ${range2};
let ${scaleName} = (((${_value.variable} - ${_min1.variable}) * ${range2Name}) / ${range1Name}) + ${_min2.variable};

`;
        return context.emit(code, scaleName, _value, _min1, _max1, _min2, _max2);
    };
};
