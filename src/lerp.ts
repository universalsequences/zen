import { Context } from './context';
import { MemoryBlock } from './block';
import { Generated } from './zen';

export const lerpPeek = (
    context: Context,
    block: MemoryBlock,
    index: string,
    memory: string = "memory")
    : Generated => {
    let varIdx = context.idx++;
    let fracName = `frac${varIdx}`;
    let lerpName = `lerpVal${varIdx}`;
    let nextIdxName = `nextIdx${varIdx}`;
    let out = `
let ${fracName} = ${index} - Math.floor(${index})
let ${nextIdxName} = Math.floor(${index} + 1);
if (${nextIdxName} - ${block.idx} >= ${block.length}) ${nextIdxName} = ${block.idx} + 0;
let ${lerpName} = (1.0-${fracName})*${memory}[Math.floor(${index})] + ${fracName}*${memory}[${nextIdxName}];
`;

    return {
        params: [],
        code: out,
        variable: lerpName,
        histories: []
    };
};
