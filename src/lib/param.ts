import { UGen, Arg } from './zen';
import { history, History } from './history'

export type ParamGen = UGen & {
    set?: (val: number) => void
};

export const param = (val: number): ParamGen => {
    let ssd: History = history(val);

    let p: ParamGen = ssd();
    p.set = (val: number) => {
        ssd.value!(val);
    };


    return p;
};

