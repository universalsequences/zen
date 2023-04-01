import { Arg } from './zen';
import { Context } from './context';

export const interp = (time: Arg, ...points: Arg[]) => {
    return (context: Context) => {
        let t = context.gen(time);
        let pts = points.map(x => context.gen(x));

        let [interp, mt, mt2, mt3, t2, t3, c0, c1, c2, c3, c4, c5] =
            context.useVariables(
                "interp",
                "mt", "mt2", "mt3",
                "t", "t2", "t3",
                "c0", "c1", "c2", "c3", "c4", "c5");

        let out = "";
        if (pts.length === 2) {
            out = `
const ${mt} = 1 - ${t.variable};
const ${c1} = ${pts[0].variable} * ${mt};
const ${c2} = ${pts[1].variable} * ${t.variable};
let ${interp} = ${c1} + ${c2};
`;
        } else if (pts.length === 3) {
            out = `
const ${mt} = 1 - ${t.variable};
const ${c0} = ${pts[0].variable} * ${mt} * ${mt};
const ${c1} = 2 * ${pts[1].variable} * ${mt} * ${t.variable};
const ${c2} = ${pts[2].variable} * ${t.variable} * ${t.variable};

let ${interp} = ${c0} + ${c1} + ${c2};
`;
        } else if (pts.length === 4) {
            out = `
const ${mt} = 1 - ${t.variable};
const ${mt2} = ${mt} * ${mt};
const ${t2} = ${t.variable} * ${t.variable};
const ${c0} = ${pts[0].variable} * ${mt2} * ${mt};
const ${c1} = 3 * ${pts[1].variable} * ${mt2} * ${t.variable};
const ${c2} = 3 * ${pts[2].variable} * ${mt} * ${t2};
const ${c3} = ${pts[3].variable} * ${t2} * ${t.variable};

let ${interp} = ${c0} + ${c1} + ${c2} + ${c3};
`;
        } else if (pts.length === 6) {
            out = `
const ${mt} = 1 - ${t.variable};
const ${mt2} = ${mt} * ${mt};
const ${mt3} = ${mt2} * ${mt};
const ${t2} = ${t.variable} * ${t.variable};
const ${t3} = ${t2} * ${t.variable};
const ${c0} = ${pts[0].variable} * ${mt3} * ${mt2};
const ${c1} = 5 * ${pts[1].variable} * ${mt3} * ${t.variable};
const ${c2} = 10 * ${pts[2].variable} * ${mt2} * ${t2};
const ${c3} = 10 * ${pts[3].variable} * ${mt} * ${t3};
const ${c4} = 5 * ${pts[4].variable} * ${t3} * ${t2};
const ${c5} = ${pts[5].variable} * ${t3} * ${t3};

let ${interp} = ${c0} + ${c1} + ${c2} + ${c3} + ${c4} + ${c5};
`;
        }

        return context.emit(
            out, interp, t, ...pts);
    };
};
