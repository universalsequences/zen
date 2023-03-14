import React, { useState, useEffect, useCallback } from 'react'
import { SpiderWeb } from '@/lib/physical-modeling/web-maker'
import { getDisplayName } from 'next/dist/shared/lib/utils';
import { setMaxListeners } from 'stream';

interface Props {
    web: SpiderWeb;
    displacements: Float32Array
}

interface Point {
    x: number;
    y: number;
}

const RATIO = 20;
const TERM = 1;
const getPt = (num: number, web: SpiderWeb, SIZE: number): Point => {
    let { neighborsMatrix, radius, coeffs, size } = web;
    let i = 0;
    let dist = 0;
    let count = 0;
    let pts = [];
    /**
     * 
     * xx = x + (d * cos(alpha))
     * yy = y + (d * sin(alpha))
     */

    let center = { x: SIZE / 2, y: SIZE / 2 };
    let lastLevel = [];
    for (let level of neighborsMatrix) {

        let alpha = 2 * Math.PI * count / radius;
        pts.push({
            x: center.x + dist * Math.cos(alpha),
            y: center.y + dist * Math.sin(alpha),
        })


        // dist gives us how far from center we should be
        // count / radius tells us how to do the angle

        if (count > radius - TERM) {
            count = 0;
            lastLevel = [];
            let highest = Math.max(...(level.filter(x => x != -1 && coeffs[x * size + i] > 0)))
            let index = highest; //level.indexOf(highest);
            highest = index * size + i;
            dist += (SIZE / RATIO) / coeffs[highest];
        }
        if (i === 0) {
            count = 0;
            let highest = Math.max(...level)
            let index = highest; //level.indexOf(highest);
            highest = i * size + index;
            dist += (SIZE / RATIO) / coeffs[highest];
        }
        count++;
        i++;
    }
    return pts[num];
}

export default (props: Props) => {
    let [pts, setPts] = useState([]);
    let [lines, setLines] = useState([]);

    const SIZE = 600;
    useEffect(() => {
        let lines = [];
        let { neighborsMatrix, radius, coeffs, size } = props.web;
        let i = 0;
        let dist = 0;
        let count = 0;
        let pts = [];
        /**
         * 
         * xx = x + (d * cos(alpha))
         * yy = y + (d * sin(alpha))
         */
        let center = { x: SIZE / 2, y: SIZE / 2 };
        let lastLevel = [];
        for (let level of neighborsMatrix) {

            let alpha = 2 * Math.PI * count / radius;
            let pt = {
                x: center.x + dist * Math.cos(alpha),
                y: center.y + dist * Math.sin(alpha),
            };
            pts.push(pt)

            if (count > radius - TERM) {
                count = 0;
                lastLevel = [];
                let highest = Math.max(...(level.filter(x => x != -1 && coeffs[x * size + i] > 0)))
                let index = highest; //level.indexOf(highest);
                highest = index * size + i;
                dist += (SIZE / RATIO) / coeffs[highest];
            }
            for (let l of level) {
                let _pt = getPt(l, props.web, SIZE);
                if (_pt) {
                    lines.push([pt, _pt]);
                }
            }


            // dist gives us how far from center we should be
            // count / radius tells us how to do the angle


            if (i === 0) {
                count = 0;
                let highest = Math.max(...level)
                let index = highest; //level.indexOf(highest);
                highest = i * size + index;
                dist += (SIZE / RATIO) / coeffs[highest];
            }
            count++;
            i++;
        }
        setPts(pts);
        setLines(lines);
    }, []);

    return <svg className="bg-black rounded-full" width={SIZE} height={SIZE}>
        {lines.map(([a, b], id) => <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="red"></line>)}
        {pts.map(({ x, y }, id) =>
            <circle
                key={id}
                style={{ filter: `brightness(${Math.abs(500 * Math.pow(Math.abs(props.displacements[id]), .5))})` }}
                cx={x} cy={y} r={2} fill="red" stroke="white"></circle>)}
    </svg>
}
