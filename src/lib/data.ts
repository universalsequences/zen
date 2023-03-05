import {UGen, Arg, genArg, Generated, float} from './zen';
import {Context} from './context';
import {add, mult, wrap} from './math';
import {Block} from './memory-helper'
import {lerpPeek} from './lerp';

export type MultiChannelBlock  = Block & {
    channels: number;
    length: number;
};

export type BlockGen = (c: Context) => MultiChannelBlock;

export const data = (
    size: number,
    channels: number)
: BlockGen => {
    let block: Block;
    return (context: Context): MultiChannelBlock => {
        if (block === undefined) {
            block = context.memory.alloc(size*channels);
        }
        return {
            ... block,
            channels,
            length: size
        };
    };
};

export const peek = (
    data: BlockGen,
    index: Arg,
    channel: Arg
): UGen => {
    return (context: Context): Generated => {
        let multichannelBlock: MultiChannelBlock = data(context);
        let idx = context.idx++;
        let peekName = `peekVal${idx}`;
        let _index = genArg(index, context);
        let _channel = genArg(channel, context);
        let perChannel = multichannelBlock.length;
        let peekIdx = add(mult(perChannel, channel), index)(context);
        let code = `
${peekIdx.code}
let ${peekName} = memory[${multichannelBlock.idx} + ${peekIdx.variable}];
`

        return context.emit(code, peekName, _index, _channel);
    };
};

export const poke = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
    value: Arg
): UGen => {
    return (context: Context): Generated => {
        let multichannelBlock: MultiChannelBlock = data(context);
        let idx: number = context.idx++;
        let _index: Generated = genArg(index, context);
        let _channel: Generated = genArg(channel, context);
        let _value: Generated = genArg(value, context);
        let perChannel: number = multichannelBlock.length;
        let pokeIdx: Generated = add(mult(perChannel, channel), index)(context);
        let code = `
${pokeIdx.code}
memory[${multichannelBlock.idx} + ${pokeIdx.variable}] = ${_value.variable};
`
        // this can be used as a value
        return context.emit(code, _value.variable!, _index, _channel, _value);
    };
};

