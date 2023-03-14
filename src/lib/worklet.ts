import { Context } from './context';
import { ZenGraph } from './zen';

export interface ZenWorklet {
    code: string;
    workletNode: AudioWorkletNode;
}

export const createWorklet = (ctxt: AudioContext, graph: ZenGraph, name: string = "Zen"): Promise<ZenWorklet> => {

    return new Promise((resolve: (x: ZenWorklet) => void) => {
        let workletCode = createWorkletCode(name, graph);
        console.log(workletCode);
        const url = window.URL.createObjectURL(
            new Blob(
                [workletCode],
                { type: 'text/javascript' }
            )
        );

        let numChannels = 1;
        ctxt.audioWorklet.addModule(url).then(() => {
            const workletNode = new AudioWorkletNode(
                ctxt,
                name,
                { channelInterpretation: 'discrete', channelCount: numChannels, outputChannelCount: [numChannels] })

            workletNode.port.onmessage = (e: MessageEvent) => {
                let type = e.data.type
                let body = e.data.body;
                graph.context.onMessage({
                    type,
                    body
                });
            }
            for (let block of graph.context.memory.blocksInUse) {
                if (block.initData !== undefined) {
                    workletNode.port.postMessage({
                        type: "init-memory",
                        body: {
                            idx: block._idx === undefined ? block.idx : block._idx,
                            data: block.initData
                        }
                    })
                }
            }

            graph.context.addWorklet(workletNode);
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
    this.counter=0;
    ${prettyPrint("    ", genMemory(graph))}
    
    this.port.onmessage = (e) => {
       if (e.data.type === "memory-set") {
         let {idx, value} = e.data.body;
         this.memory[idx] = value;
       }
       if (e.data.type === "init-memory") {
         let {idx, data} = e.data.body;
         this.memory.set(data, idx)
       }
       if (e.data.type === "memory-get") {
           let {idx, allocatedSize} = e.data.body;
           this.port.postMessage({
               type: "memory-get",
               body: this.memory.slice(idx, idx+allocatedSize)
           });
       }
    }
  }

  ${prettyPrint("   ", genProcess(graph))}
}

registerProcessor("${name}", ${name}Processor)
`
};

const genProcess = (graph: ZenGraph): string => {
    let out = `
process(inputs, outputs) {
    this.counter++;
  let memory = this.memory;
  for (let i=0; i < outputs.length; i++) {
    for (let j=0; j < outputs[i][0].length; j++) {
      ${genInputs(graph)}
      ${genHistories(graph)}
      ${prettyPrint("      ", graph.code)}
      ${genOutputs(graph)}
    }
  }
  return true;
}
`;

    return out;
};

const genHistories = (graph: ZenGraph): string => {
    let out = '';
    let already: string[] = [];
    for (let hist of graph.histories) {
        if (!already.includes(hist)) {
            out += prettyPrint("      ", hist);
        }
        already.push(hist);
    }
    return out;
};

const genInputs = (graph: ZenGraph): string => {
    let out = '';
    for (let i = 1; i <= graph.context.numberOfInputs; i++) {
        out += `let in${i} = inputs[${i - 1}][j];`;
    }
    return out;
};

const genOutputs = (graph: ZenGraph): string => {
    let lastVariable = graph.variable;
    if (lastVariable !== undefined) {
        return `
//       if (this.counter < 100 ) 
//           console.log(${lastVariable});
        outputs[i][0][j] = ${lastVariable};`
    }
    return "";
};

const genMemory = (graph: ZenGraph): string => {
    return `
this.memory = new Float32Array(${graph.context.memory.size});
`;
};

export const prettyPrint = (prefix: string, code: string): string => {
    return code.split("\n").map(x => prefix + x).join("\n");
};
