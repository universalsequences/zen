import { data, peek, BlockGen, poke, Gettable } from '../data';
import { Structure } from './web-maker'
import { breakIf } from '../break';
import { zswitch } from '../switch'
import { floor, mult, mix, max, add, sub, div, pow, min } from '../math'
import { neq, lte, gte, gt, eq, and } from '../compare'
import { sumLoop } from '../loop'
import { noise } from '../noise'
import { scale } from '../scale'
import { accum } from '../accum'
import { s } from '../seq'
import { UGen, Arg } from '../zen';

export interface Membrane {
    membrane: UGen;
    data: Gettable<Float32Array>;
}

export interface Material {
    pitch: Arg,
    release: Arg,
    placement: Arg,
    noise: Arg
}

interface Connection {
    component: Component;
    structure: Structure;

    neighbors: BlockGen;
    coeffs: BlockGen;
}

export class Component {
    material: Material;
    web: Structure;
    neighbors: BlockGen;
    coeffs: BlockGen;
    u: BlockGen;
    currentIdx: UGen;
    prevChannel: UGen;
    nt2: UGen; // damepning
    p_eff: UGen; // pitch
    connections: Connection[];

    constructor(material: Material, web: Structure) {
        this.connections = [];

        this.material = material;

        this.web = web;
        this.neighbors = data(web.size * web.maxNeighbors, 1, web.neighbors);
        this.coeffs = data(web.size, web.size, web.coeffs);

        // the dampening- i.e. "the release"
        this.nt2 = mix(
            pow(2, -8),
            pow(2, -13),
            material.release);

        // contains the displacement data for 3 time steps (now, now-1, now-2)
        this.u = data(web.size, 3);

        // keep track of current index (so we know what channel to peek into U)
        this.currentIdx = accum(1, 0, { min: 0, max: 2, exclusive: false });
        this.prevChannel = sub(this.currentIdx, 1)

        // using current index grab the center value for "now"
        let u_center = peek(this.u, 0, this.prevChannel);

        let tense = 0.0999151;
        let tension = mix(pow(2, -12), pow(2, -5), tense);
        let p0 = mix(.00000000011044095, 0.01, material.pitch);

        this.p_eff = min(0.47, add(p0, pow(mult(u_center, tension, 1), 2)));
    }

    get size() {
        return this.web.size;
    }

    /**
     * Calculate the entire displacement across the network
     */
    gen(input: UGen) {
        return s(
            this.currentIdx,
            this.prevChannel,
            input,
            this.nt2,
            this.p_eff,
            mult(
                div(0.01, this.size),
                sumLoop(
                    { min: 0, max: this.size },
                    (idx: UGen) => this.nodeDisplacement(input, idx)
                )));
    }

    // calculate the displacement for one node
    nodeDisplacement(input: UGen, idx: UGen) {
        let val = peek(this.u, idx, this.prevChannel);

        /**
         * Creating connections:
         * When connected to an inbound component, we need to:
         * 1. Calculate the neighbors sum in THIS component along with
         * 2. Calculate the neighbors sum in the other component (via this node)
         * 
         * Sum #1 and #2 
         * Then use the correct coefficients for dampening and pitch for this 
         * component.
         *
         * So if we create a for loop with all the params
         * and on each iteration w simply get the PARAMS object
         * containing all the information needed to run this loop* in 
         * this way
         */

        let neighborsEnergy = this.calculateNeighborsEnergy(idx);

        let triggerCond = eq(idx, floor(this.material.placement));

        let energy = zswitch(
            triggerCond,
            input,
            0);

        let prev2 = peek(this.u, idx, sub(this.currentIdx, 2));

        let current = div(
            add(
                mult(2, val),
                mult(
                    this.p_eff,
                    add(neighborsEnergy, mult(1, energy), mult(-4, val))
                ),
                mult(-1, sub(1, this.nt2), prev2) // dampening term
            ),
            add(1, this.nt2) // dampening term
        );

        return s(
            poke(this.u, idx, this.currentIdx, min(1, max(-1, current))),
            current);
    }

    calculateNeighborsEnergy(idx: UGen) {
        let noiseParam = this.material.noise ?
            min(1.55, mult(1.55, this.material.noise)) : 0;
        let noiseFactor = scale(noise(), 0, 1, 0.1, noiseParam);
        let neighborsEnergy = mult(
            noiseFactor,
            0.5,
            this.sumNeighbors(
                idx,
                this.prevChannel,
                this.web.maxNeighbors,
                this.u,
                this.neighbors,
                this.coeffs
            ));
        for (let connection of this.connections) {
            let { component, neighbors, coeffs } = connection;
            neighborsEnergy = add(
                neighborsEnergy,
                this.sumNeighbors(
                    idx,
                    component.prevChannel,
                    0, // only care about one neighbor in other component
                    component.u,
                    neighbors,
                    coeffs));
        }
        return neighborsEnergy;
    }

    /**
     * Calculates the sum of neighbors of a particular node (indexed by idx)
     * The parameters by default refer to this component, however,
     * when calculating inter-component neighbors, we will pass in other
     * parameters (taken from the other component wrt to this one).
     */
    sumNeighbors(
        idx: Arg = this.currentIdx,
        prevChannel: Arg = this.prevChannel,
        maxNeighbors: number,
        u: BlockGen = this.u,
        neighbors: BlockGen = this.neighbors,
        coeffs: BlockGen = this.coeffs,
    ) {

        return sumLoop({
            min: 0,
            max: maxNeighbors + 1
        }, (i) => {

            // whats the "index" of the i'th neighbor, according to
            // the "neighbors" matrix
            let neighbor = peek(
                neighbors,
                add(mult(maxNeighbors, idx), i), 0);

            // whats the "coeff" of this neighbor w.r.t to this current node
            let coeff = peek(coeffs, neighbor, idx);

            // if neighbor is not -1 then we have a valid neighbor 
            return s(
                (neighbors === this.neighbors ? breakIf(and(gte(idx, maxNeighbors), gt(i, 3))) : add(0)),
                zswitch(
                    neq(neighbor, -1),
                    mult(
                        zswitch(
                            eq(coeff, -1),
                            mult(-1, peek(u, idx, prevChannel)),
                            // the value of the neighbor in previous time-step
                            peek(u, neighbor, prevChannel)),
                        coeff // the coefficient for that neighbor & idx combo
                    ),
                    0))
        });
    }

    /**
     * Used to connect two different components. the connection parameter
     * describes how the two components are connected and with what coeffs
     * 
     * This connection is always 1 way. So the one being connected to, where the
     * energy goes should call this connect method
     */
    connect(component: Component, structure: Structure): Component {
        console.log("connecting structure=", structure);
        let neighbors = data(component.size * structure.maxNeighbors, 1, structure.neighbors);
        let coeffs = data(component.size, component.size, structure.coeffs);
        this.connections.push({ component, structure, neighbors, coeffs });
        return this;
    }

    /**
     * Quick generate structure between two components
     */
    generateStructure(component: Component): Structure {
        let neighbors = new Float32Array(component.size);
        let coeffs = new Float32Array(component.size);

        for (let i = 0; i < this.size; i++) {
            neighbors[i] = i; //component.size - 1 - i;
            coeffs[i] = .3;
        }

        return {
            neighbors,
            coeffs,
            size: this.size,
            maxNeighbors: 2,
            neighborsMatrix: [],
            radius: 0,
            noise: 0
        };
    }
}
