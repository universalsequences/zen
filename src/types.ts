import { UGen } from './zen';
export type History = ((x?: UGen) => UGen) & {
    value?: (v: number, time?: number) => void,
    paramName?: string
}

