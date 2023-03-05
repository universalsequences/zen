export interface Block {
    idx: number;
    size: number;
}

type BlockList = Block[];

export class Memory {
    heap: Float32Array;
    size: number;
    freeList: BlockList;
    references: number;

    constructor(size: number) {
        this.heap = new Float32Array(size);
        this.size = size;
        this.references = 0;

        // start with a free list of size of the entire heap
        this.freeList = [
            {
                idx: 0,
                size
            }
        ];
    };

    alloc(size: number): Block {
        let idx = 0;
        for (let i=0; i < this.freeList.length; i++) {
            let block: Block = this.freeList[i];
            if (size <= block.size) {
                return this.useBlock(block, size, i);
            }
        }
        //
        return {idx: -1, size};
    }

    useBlock(block: Block, size: number, freeIdx: number): Block {
        if (block.size == size) {
            // we have a perfect match so remove entirely from
            // free list
            this.freeList.splice(freeIdx, 1);
        } else {
            // we have an unperfect match, so create a new block with
            // the size subtracted out and the idx shifted over
            this.freeList.splice(freeIdx, 1, {
                size: block.size - size,
                idx: block.idx + size
            });
        }
        this.references++;
        return block;
    }

    free(block: Block) {
        this.freeList.push(block);
        this.references--;
        if (this.references === 0) {
            this.freeList[0].idx = 0;
        }
    }
}
