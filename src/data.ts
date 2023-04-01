import { UGen, Arg, genArg, Generated, float } from './zen';
import { ContextualBlock } from './history';
import { Context, LoopContext } from './context';
import { add, mult, wrap } from './math';
import { LoopMemoryBlock, Block, MemoryBlock } from './block'

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
    get?: () => Promise<t>;
    set?: (x: t) => void
};

export type BlockGen = ((c: Context) => MemoryBlock) & Gettable<Float32Array>;

export const data = (
    size: number = 1,
    channels: number = 1,
    initData?: Float32Array,
    root?: boolean): BlockGen => {

    let block: MemoryBlock;
    let _context: Context;
    let contextBlocks: ContextualBlock[] = [];
    let resp: BlockGen = (context: Context): MemoryBlock => {
        let variableContext = context;
        if (block === undefined || _context !== context) {
            // how should really work? 
            if (root!) {
                // need the base context if its a parameter (we dont want
                // a different parameter for every single loop iteration)
                while ("context" in variableContext) {
                    variableContext = variableContext["context"] as Context;
                }
            }
            console.log("allocating with size-%s channels=%s", size, channels);
            block = context.alloc(size * channels);
            block.initData = initData;
            block.length = size;
            block.channels = channels;
            contextBlocks.push({ block, context });
        }

        _context = context;

        block.channels = channels;
        block.length = size;

        if (initData != undefined) {
            block.initData = initData;
        }
        // bad: forcve context to keep track of block
        context.memory.blocksInUse.push(block);
        return block;
    };
    resp.get = (): Promise<Float32Array> => {
        if (block) {
            return block.get();
        }
        return new Promise((resolve: (x: Float32Array) => void) => resolve(new Float32Array(1)));
    };

    resp.set = (buf: Float32Array) => {
        for (let { context, block } of contextBlocks) {
            console.log('sending init memory', block.idx, buf, context);
            context.postMessage({
                type: "init-memory",
                body: {
                    idx: block.idx,
                    data: buf,
                }
            });
        }
    };

    return resp;
};

export const peek = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
): UGen => {
    return (context: Context): Generated => {
        // need the base context if its a parameter (we dont want
        // a different parameter for every single loop iteration)
        let variableContext = context;
        while ("context" in context) {
            context = context["context"] as Context;
        }

        let multichannelBlock: MemoryBlock = data(context);
        let _index = variableContext.gen(index);
        let _channel = variableContext.gen(channel);
        let [preIdx, peekIdx, peekVal, channelIdx, frac, nextIdx] = variableContext.useVariables(
            "preIdx", "peekIdx", "peekVal", "channelIdx", "frac", "nextIdx");
        let perChannel = multichannelBlock.length;

        // todo: make this prettier... basically want the raw idx value
        let idx = multichannelBlock._idx === undefined ? multichannelBlock.idx : multichannelBlock._idx;

        let code = `
let ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length}) ${preIdx} -= ${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
let ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
let ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
let ${frac} = ${peekIdx} - Math.floor(${peekIdx});
let ${nextIdx} = Math.floor(${peekIdx}) + 1;
if (${nextIdx} >= ${perChannel} * (${_channel.variable} + 1)) {
   ${nextIdx} =  ${perChannel} * (${_channel.variable})
}
let ${peekVal} = (1 - ${frac})*memory[${idx} + Math.floor(${peekIdx})] + (${frac})*memory[${idx} + ${nextIdx}];;
`;

        return context.emit(code, peekVal, _index, _channel);
    };
};

export const poke = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
    value: Arg,
): UGen => {
    return (context: Context): Generated => {
        let multichannelBlock = data(context);
        let _index: Generated = context.gen(index);
        let _channel: Generated = context.gen(channel);
        let _value: Generated = context.gen(value);
        let perChannel: number = multichannelBlock.length!;
        let pokeIdx = `${perChannel} * ${_channel.variable} + Math.floor(${_index.variable})`;
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

