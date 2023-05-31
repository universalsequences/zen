import {data, peek, poke} from '../data';
import {zswitch} from '../switch'
import {floor, mult, mix, max, add, sub, div, pow, min} from '../math'
import {lte, gte, eq, and} from '../compare'
import {sumLoop} from '../loop'
import {noise} from '../noise'
import {scale} from '../scale'
import {s} from '../seq'
import { float, UGen } from '../zen';

export const membrane = (input: UGen) => {
    let pitch = .00395;
    let tense = 0.51;
    let release = 0.1;
    let placement_x = 6; 
    let placement_y = 6;

    let N = 16;
    let u = data(4, N*N);
    let u_current = data(N, N);
    let nt2 = mix(pow(2,-10), pow(2,-13), release);
    let center_xy = floor(div(N,2));
    let u_center = peek(u_current, center_xy, center_xy);
    let tension = mix(pow(2, -8), pow(2, -1), tense);
    let p0 = mix(.000011044095, 0.2, pitch);
    let p_eff = min(0.47, add(p0 , pow(mult(u_center,tension, 1), 2)));

    let f1 = input;

    let loop = sumLoop(
        {min: 0, max: N},
        (i) => 
            sumLoop(
                {min: 0, max: N},
                (j) => {
                    let idx = add(mult(N,i), j);
                    let idx_n = add(mult(N,add(i,1)), j);
                    let idx_s = add(mult(N,sub(i,1)), j);
                    let idx_w = add(mult(N,i) , j , 1);
                    let idx_e = add(mult(N,i) , j, -1);
                    
                    let val = peek(u, 0, idx);
                    let val_n = peek(u, 0, idx_n);
                    let val_s = peek(u, 0, idx_s);
                    let val_e = peek(u, 0, idx_e);
                    let val_w = peek(u, 0, idx_w); 

                    let triggerCond = and(
                        gte(i, placement_x), 
                        lte(i, add(placement_x, 2)),
                        gte(j, placement_y),
                        lte(j, add(placement_y, 2)));
                    
                    let energy = zswitch(
                        triggerCond, 
                        mult(f1, 0.7),
                        0);
                    
                    let neighbors = mult(.8, add(val_n, val_w, val_e, val_s));
                    let current = div(
                        add(
                            mult(2,val), 
                            mult(
                                p_eff, 
                                add(neighbors, mult(1, energy), mult(-4, val))
                            ), 
                            mult(-1, sub(1,nt2), peek(u, 1, idx) )
                        ),
                        add(1, nt2)
                    );

                    return s(
                      poke(u_current, i, j, max(-.8, min(.8, current))),
                      current);
                }
            )
    );

    let shiftLoop = sumLoop(
        {min: 0, max: 3},
        n => sumLoop(
            {min: 0, max: N},
            i => sumLoop(
                {min:0, max: N},
                j => {
                    // now we shift history over...
                    let idx = add(mult(N,i) , j);
                    let _n = sub(2, n);
                    let val = zswitch(eq(_n, 0), peek(u_current, i, j), peek(u, sub(_n, 1), idx));
                    return s(
                        poke(u, _n, idx, val),
                        float(0));
            })));
    
    return add(
        s(
            f1,
            nt2,
            p_eff,
            loop),
        shiftLoop);
}