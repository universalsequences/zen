import { ZenGraph } from './zen';
import { genInputs, genHistories, declareOutputs, prettyPrint, genOutputs } from './worklet';

export const generateWASM = (graph: ZenGraph) => {
    let memorySize = graph.context.memory.size;

    let code = `
#include <stdlib.h>
#include <emscripten.h>
#include <math.h>
#define BLOCK_SIZE 128 // The size of one block of samples

#define MEM_SIZE ${memorySize} // Define this based on your needs
#define SINE_TABLE_SIZE 1024

float memory[MEM_SIZE]; // Your memory buffer
float sineTable[SINE_TABLE_SIZE]; // Your memory buffer

double random_double() {
    return rand() / (double)RAND_MAX;
}

EMSCRIPTEN_KEEPALIVE
void* my_malloc(size_t size) {
  return malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void initSineTable() {
   for (int i=0; i < SINE_TABLE_SIZE; i++) {
       sineTable[i] = sin((2 * M_PI * i) / SINE_TABLE_SIZE);
   }
}

EMSCRIPTEN_KEEPALIVE
void init(float *mem) {
   for (int i=0; i < MEM_SIZE; i++) {
     memory[i] = mem[i];
   }
}

EMSCRIPTEN_KEEPALIVE
void setMemorySlot(int idx, float val) {
  memory[idx] = val;
}

EMSCRIPTEN_KEEPALIVE
void setMemoryRegion(int idx, float* val, int size) {
   for (int i=0 ; i < size; i++) {
     memory[idx + i] = val[i];
   }
}

EMSCRIPTEN_KEEPALIVE
void process(float* inputs, float* outputs) {
  for (int j = 0; j < BLOCK_SIZE; j++) {
      ${declareOutputs(graph)}
      ${genHistories(graph)}
      ${prettyPrint("      ", graph.code)}
      ${genOutputs(graph)}
  }
}
`;
    return code;
}
