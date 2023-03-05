import {UGen, Generated} from './zen';
import {Context} from './context';

export const memo = (fn: UGen): UGen => {
    let memoized: Generated;

    return (context: Context): Generated => {
        if (memoized !== undefined) {
            return memoized;
        }
        memoized = fn(context);
        return memoized;
    };
};
