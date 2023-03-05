import {ZenGraph} from './zen';

export interface ZenWorklet {
    code: string;
    workletNode: AudioWorkletNode;
}

export const createWorklet = (ctxt: AudioContext, graph: ZenGraph, name: string = "Zen"): Promise<ZenWorklet> => {

    return new Promise((resolve: (x: ZenWorklet) => void) => {
        let workletCode = createWorkletCode(name, graph);
        const url = window.URL.createObjectURL(
            new Blob(
                [ workletCode ], 
                { type: 'text/javascript' }
            )
        );
        
        let numChannels = 1;
        ctxt.audioWorklet.addModule( url ).then( ()=> {
            const workletNode = new AudioWorkletNode(
                ctxt,
                name,
                { channelInterpretation:'discrete', channelCount: numChannels, outputChannelCount:[ numChannels ] })

            resolve({
                code: workletCode,
                workletNode
            });
        });
    });
};

const createWorkletCode = (name: string, graph: ZenGraph): string => {
    return `
class ${name}Processor extends AudioWorkletProcessor {

  constructor() {
    super();
    ${prettyPrint("    ", genMemory(graph))}
  }

  ${prettyPrint("   ", genProcess(graph))}
}

registerProcessor("${name}", ${name}Processor)
`
};

const genProcess = (graph: ZenGraph): string => {
    let out = `
process(inputs, outputs) {
  let memory = this.memory;
  for (let i=0; i < outputs.length; i++) {
    for (let j=0; j < outputs[i][0].length; j++) {
      ${genInputs(graph)}
      ${prettyPrint("      ", graph.code)}
      ${genOutputs(graph)}
    }
  }
  return true;
}
`;

    return out;
};

const genInputs = (graph: ZenGraph): string => {
    let out = '';
    for (let i=1; i <= graph.context.numberOfInputs; i++) {
        out += `let in${i} = inputs[${i-1}][j];`;
    }
    return out;
};

const genOutputs = (graph: ZenGraph): string => {
    let lastVariable = graph.variable;
    if (lastVariable !== undefined) {
        return `outputs[i][0][j] = ${lastVariable};`
    }
    return "";
};

const genMemory = (graph: ZenGraph): string => {
    return `
this.memory = new Float32Array(${graph.context.memory.size});
`;
};

const prettyPrint = (prefix: string, code: string):string => {
    return code.split("\n").map(x => prefix + x).join("\n");
};
