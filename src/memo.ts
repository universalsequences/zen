import { UGen, Generated } from './zen';
import { Context } from './context';

export const memo = (fn: UGen): UGen => {
    let memoized: Generated;
    let _context: Context;

    return (context: Context): Generated => {
        if (memoized !== undefined && context == _context) {
            if (context.isVariableEmitted(memoized.variable!)) {
                return {
                    ...memoized,
                    code: memoized.variable!
                };

            }
            return memoized;
        }
        _context = context;
        memoized = fn(context);
        return memoized;
    };
};
