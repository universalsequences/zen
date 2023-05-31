import { UGen, Generated } from './zen';
import { LoopContext, Context } from './context';

export const memo = (fn: UGen): UGen => {
    let memoized: Generated;
    let _context: Context;

    return (context: Context): Generated => {
        // the context === _context thing fucks up the physical modeling...
        if (memoized !== undefined) {
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
