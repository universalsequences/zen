import {UGen, Arg, genArg, Generated, float} from './zen';
import {Context, LoopContext} from './context';
import {add, mult, wrap} from './math';
import {LoopMemoryBlock, Block, MemoryBlock} from './block'
import {lerpPeek} from './lerp';
import { requestToBodyStream } from 'next/dist/server/body-streams';

/*
export type MultiChannelBlock  = (LoopMemoryBlock | Block) & {
    channels: number;
    length: number;
};
*/

// multichannelblock needs to simply implement block and can either
// be a loopblock or regular block...
//class MultiChannelBlock extends MemoryBlock {
//}

export interface Gettable<t> {
    get?: ()=>Promise<t>;
};

export type BlockGen = ((c: Context) => MemoryBlock) & Gettable<Float32Array>;

export const data = (
    size: number,
    channels: number,
    initData?: Float32Array)
: BlockGen => {
    let block: MemoryBlock;
    let resp: BlockGen = (context: Context): MemoryBlock => {
        if (block === undefined) {
            // how should really work? 
            block = context.alloc(size*channels);
            block.initData = initData;
            block.length = size;
            block.channels = channels;

            /*jjjjjj
            // todo: handle this much more gracefully-- im basically trying to 
            // copy over a new loopmemoryblock version of block (in the case that
            // context is a loop context)
            if ((_block as LoopMemoryBlock).context) {
                block = new LoopMemoryBlock(
                    context as LoopContext, _block._idx === undefined ? _block.idx : _block._idx, _block.size, _block.allocatedSize);
                block.channels = channels;
                block.length = size;
                block.initData = _block.initData;
            } else {
                block = {
                    idx: _block._idx === undefined ? _block.idx : _block._idx,
                    size: _block.size,
                    allocatedSize: _block.allocatedSize,
                    channels: channels,
                    length: size,
                    initData: _block.initData
                };
            }
            */
        }
        block.channels = channels;
        block.length = size;

        if (initData != undefined) {
            block.initData = initData;
        }
        // bad: forcve context to keep track of block
        console.log(context);
        context.memory.blocksInUse.push(block);
        return block;
    };
    resp.get = () => {
        if (block) {
            return block.get();
        }
        return new Promise(resolve => resolve(new Float32Array(1)));
    }
    return resp;
};

export const peek = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
): UGen => {
    return (context: Context): Generated => {
        let multichannelBlock: MemoryBlock = data(context);
        let [preIdx, peekIdx, peekVal, channelIdx] = context.useVariables("preIdx", "peekIdx", "peekVal", "channelIdx"); 
        let _index = context.gen(index);
        let _channel = context.gen(channel);
        let perChannel = multichannelBlock.length;

        // todo: make this prettier... basically want the raw idx value
        let idx = multichannelBlock._idx === undefined ? multichannelBlock.idx : multichannelBlock._idx ;

        let code = `
let ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length}) ${preIdx} -= ${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
let ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
let ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
let ${peekVal} = memory[${idx} + ${peekIdx}];
`;

        return context.emit(code, peekVal, _index, _channel);
    };
};

export const poke = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
    value: Arg,
    debug?: boolean
): UGen => {
    return (context: Context): Generated => {
        let multichannelBlock = data(context);
        let _index: Generated = context.gen(index);
        let _channel: Generated = context.gen(channel);
        let _value: Generated = context.gen(value);
        let perChannel: number = multichannelBlock.length!;
        let pokeIdx = `${perChannel} * ${_channel.variable} + ${_index.variable}`; 
        let code = `
// begin poke

memory[${multichannelBlock._idx || multichannelBlock.idx} + ${pokeIdx}] = ${_value.variable};
// end poke
//if (this.counter < 10000)
//    console.log(${_value.variable});
this.counter++;
`
        // this can be used as a value
        return context.emit(code, _value.variable!, _index, _channel, _value);
    };
};

