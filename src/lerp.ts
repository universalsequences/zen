import { Context } from './context';
import { Target } from './targets';
import { MemoryBlock } from './block';
import { cKeywords } from './math';
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
    let flooredName = `flooredName${varIdx}`;
    let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
    let out = `
${context.varKeyword} ${fracName} = ${index} - ${floor}(${index});
${context.target === Target.C ? "int" : "let"} ${nextIdxName} = ${floor}(${index} + 1);
if (${nextIdxName} - ${block.idx} >= ${block.length}) ${nextIdxName} = ${block.idx} + 0;
${context.target === Target.C ? "int" : "let"} ${flooredName} = ${floor}(${index});
${context.varKeyword} ${lerpName} = (1.0-${fracName})*${memory}[${flooredName}] + ${fracName}*${memory}[${nextIdxName}];
`;

    return {
        params: [],
        code: out,
        variable: lerpName,
        histories: []
    };
};
