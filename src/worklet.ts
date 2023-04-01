import { Context } from './context';
import { ZenGraph } from './zen';

export interface ZenWorklet {
    code: string;
    workletNode: AudioWorkletNode;
}

export type LazyZenWorklet = ZenWorklet | (() => AudioWorkletNode);

export const createWorklet = (
    ctxt: AudioContext,
    graph: ZenGraph,
    name: string = "Zen",
    onlyCompile: boolean = false): Promise<LazyZenWorklet> => {

    return new Promise(async (resolve: (x: LazyZenWorklet) => void) => {
        let a = new Date().getTime();
        let workletCode = createWorkletCode(name, graph);
        console.log(workletCode);
        let b = new Date().getTime();

        const url = window.URL.createObjectURL(
            new Blob(
                [workletCode],
                { type: 'text/javascript' }
            )
        );
        let c = new Date().getTime();

        let numChannels = graph.numberOfOutputs

        const onCompilation = (): AudioWorkletNode => {
            let d = new Date().getTime();
            console.log("create object url took %s ms", c - b);
            console.log("addWorkletNode took %s ms", d - c);
            const workletNode = new AudioWorkletNode(
                ctxt,
                name,
                {
                    channelInterpretation: 'discrete',
                    numberOfInputs: graph.numberOfInputs,
                    numberOfOutputs: 1,
                    channelCount: graph.numberOfOutputs,
                    outputChannelCount: [graph.numberOfOutputs]
                })


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
            if (!onlyCompile) {
                resolve({
                    code: workletCode,
                    workletNode
                })
            }
            return workletNode;
        };;

        await ctxt.audioWorklet.addModule(url);
        if (onlyCompile) {
            resolve(onCompilation);
            return;
        } else {
            onCompilation();
        }
    });
};

const createWorkletCode = (name: string, graph: ZenGraph): string => {
    return `
class ${name}Processor extends AudioWorkletProcessor {

  constructor() {
    super();
    this.counter=0;
    this.disposed = false;
    this.id = "${name}";
    this.events = {};
    ${prettyPrint("    ", genMemory(graph))}

    this.createSineTable();
    
    this.port.onmessage = (e) => {
       if (e.data.type === "memory-set") {

         let {idx, value} = e.data.body;

         this.memory[idx] = value;
//         console.log("mem set idx=%s value=%s", idx, value);
       } else if (e.data.type === "schedule-set") {
         let {idx, value, time} = e.data.body;
         this.events[idx] = {value, time};
         //console.log("scheduling idx=%s value=%s time=%s", idx, value, time, this.events);
       } else if (e.data.type === "init-memory") {
         let {idx, data} = e.data.body;
         this.memory.set(data, idx)
       } else if (e.data.type === "memory-get") {
           let {idx, allocatedSize} = e.data.body;
           this.port.postMessage({
               type: "memory-get",
               body: this.memory.slice(idx, idx+allocatedSize)
           });
       } else if (e.data.type === "dispose") {
           this.disposed = true;
           this.memory = null;
       }
    }
  }

  createSineTable() {
    const sineTableSize = 1024; // Choose a suitable size for the table, e.g., 4096 
    this.sineTable = new Float32Array(sineTableSize);

    for (let i = 0; i < sineTableSize; i++) {
      this.sineTable[i] = Math.sin((2 * Math.PI * i) / sineTableSize);
    }
  }

  scheduleEvents() {
      for (let idx in this.events) {
          let event = this.events[idx];
          let value = event.value;
          event.time--;
          if (event.time <= 0) {
             this.memory[idx] = value;
             
             //console.log('executing sched idx=%s time=%s value=%s', idx, event.time, event.value);
             delete this.events[idx];
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
    if (this.disposed) {
      return true;
    }
  let memory = this.memory;

  // note: we need to go thru each output channel for each sample
  // instead of how we are doing it here... or else the histories
  // will get all messed up.
  // actually, really the whole channels concept should be removed...
  for (let j=0; j < outputs[0][0].length; j++) {
      this.scheduleEvents();
      ${genInputs(graph)}
      ${declareOutputs(graph)}
      ${genHistories(graph)}
      ${prettyPrint("      ", graph.code)}
      ${genOutputs(graph)}
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
    for (let i = 0; i < graph.numberOfInputs; i++) {
        out += `let in${i} = inputs[0][${i}]  ? inputs[0][${i}][j] : 0;
`;

    }
    return out;
};

const declareOutputs = (graph: ZenGraph): string => {
    let out = ``;
    for (let i = 0; i < graph.numberOfOutputs; i++) {
        out += `let output${i} = 0;`
    }
    return out;
};

const genOutputs = (graph: ZenGraph): string => {
    let out = ``;
    for (let i = 0; i < graph.numberOfOutputs; i++) {
        out += `
outputs[0][${i}][j] = output${i};
`
    }
    return out;
};

const genMemory = (graph: ZenGraph): string => {
    return `
        this.memory = new Float32Array(${graph.context.memory.size});
        `;
};

export const prettyPrint = (prefix: string, code: string): string => {
    return code.split("\n").map(x => prefix + x).join("\n");
};
