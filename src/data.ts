import { UGen, Arg, genArg, Generated, float } from './zen';
import { ContextualBlock } from './history';
import { memo } from './memo';
import { Context, LoopContext } from './context';
import { Target } from './targets';
import { cKeywords } from './math';
import { add, mult, wrap } from './math';
import { LoopMemoryBlock, Block, MemoryBlock } from './block'
import { uuid } from 'uuidv4';

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

export type Interpolation = "linear" | "none";

export interface Gettable<t> {
    get?: () => Promise<t>;
    set?: (x: t) => void
    getInitData?: () => Float32Array;
    getSize?: () => number;
    getChannels?: () => number;
};

export type BlockGen = ((c: Context) => MemoryBlock) & Gettable<Float32Array> & {
    interpolation?: Interpolation;
};

export const data = (
    size: number = 1,
    channels: number = 1,
    initData?: Float32Array,
    root?: boolean,
    interpolation?: Interpolation
): BlockGen => {

    let id = uuid();
    let block: MemoryBlock;
    let _context: Context;
    let contextBlocks: ContextualBlock[] = [];
    let lastData: Float32Array;
    let resp: BlockGen = (context: Context): MemoryBlock => {
        if (lastData) {
            initData = lastData;
        }
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

            if (!block ||
                (!((context as LoopContext).context === _context) &&
                    !((_context as LoopContext).context === context))
            ) {
                block = context.alloc(size * channels);
            } else {
            }


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

    resp.interpolation = interpolation === undefined ? "linear" : interpolation;

    resp.getSize = () => {
        return size;
    };

    resp.getChannels = () => {
        return channels;
    };

    resp.getInitData = () => {
        return initData!;
    };

    resp.set = (buf: Float32Array) => {
        lastData = buf;
        for (let { context, block } of contextBlocks) {
            block.initData = buf;
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
    return memo((context: Context): Generated => {
        // need the base context if its a parameter (we dont want
        // a different parameter for every single loop iteration)
        let variableContext = context;
        while ("context" in context) {
            context = context["context"] as Context;
        }

        let multichannelBlock: MemoryBlock = data(context);
        let _index = variableContext.gen(index);
        let _channel = variableContext.gen(channel);
        let [preIdx, peekIdx, peekVal, channelIdx, frac, nextIdx, peekIdx2, peekIdx3] = variableContext.useVariables(
            "preIdx", "peekIdx", "peekVal", "channelIdx", "frac", "nextIdx", "peekIdx2", "peekIdx3");
        let perChannel = multichannelBlock.length;

        // todo: make this prettier... basically want the raw idx value
        let idx = multichannelBlock._idx === undefined ? multichannelBlock.idx : multichannelBlock._idx;
        let intKeyword = context.intKeyword;
        let varKeyword = context.varKeyword;
        let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";

        let code = `
${varKeyword} ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length}) ${preIdx} -= ${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
${intKeyword} ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
${intKeyword} ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
${varKeyword} ${frac} = ${peekIdx} - ${floor}(${peekIdx});
${intKeyword} ${nextIdx} = ${floor}(${peekIdx}) + 1;
if (${nextIdx} >= ${perChannel} * (${_channel.variable} + 1)) {
   ${nextIdx} =  ${perChannel} * (${_channel.variable});
}
${intKeyword} ${peekIdx2} = ${idx} + ${floor}(${peekIdx});
${intKeyword} ${peekIdx3} = ${idx} + ${nextIdx};
${varKeyword} ${peekVal} = (1 - ${frac})*memory[${peekIdx2}] + (${frac})*memory[${peekIdx3}];
`;

        if (data.interpolation === "none") {
            code = `
${intKeyword} ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length}) ${preIdx} -= ${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
${intKeyword} ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
${intKeyword} ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
${intKeyword} ${peekIdx2} = ${idx} + ${peekIdx};
${varKeyword} ${peekVal} = memory[${peekIdx2}];
`;
        }

        return context.emit(code, peekVal, _index, _channel);
    });
};

export const poke = (
    data: BlockGen,
    index: Arg,
    channel: Arg,
    value: Arg,
): UGen => {
    return memo((context: Context): Generated => {
        let multichannelBlock = data(context);
        let _index: Generated = context.gen(index);
        let [_idx2]: Generated = context.useVariables('pokeIdx2');
        let _channel: Generated = context.gen(channel);
        let _value: Generated = context.gen(value);
        let perChannel: number = multichannelBlock.length!;
        let intKeyword = context.intKeyword;
        let varKeyword = context.varKeyword;
        let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
        let pokeIdx = `${perChannel} * ${_channel.variable} + ${floor}(${_index.variable})`;
        let code = `
// begin poke
${intKeyword} ${_idx2} = ${multichannelBlock._idx || multichannelBlock.idx} + ${pokeIdx};
memory[${_idx2}] = ${_value.variable};
// end poke
`
        // this can be used as a value
        return context.emit(code, _value.variable!, _index, _channel, _value);
    });
};

