import { UGen, Generated, Arg } from './zen';
import { print, float } from './index';
import { history, History } from './history';
import { accum } from './accum';
import { lt } from './compare';
import { zswitch, zswitch_inline_then } from './switch';
import { s } from './seq';
import { scale } from './scale';
import { add, sub, and, or, gt, div, mult, clamp, pow } from './math';

export const triangle = (ramp: Arg, duty: Arg = 0.5): UGen => {
    return zswitch(
        lt(ramp, duty),
        scale(ramp, 0, duty, 0, 1),
        scale(ramp, duty, 1, 1, 0))
};

// the difficult thing about this is it needs to receive a message
// to "begin". lets call it a click that will be a simple input
// it also needs a duration for this to work
export const adsr = (
    trig: UGen,
    attack: Arg = 10000,
    decay: Arg = 10000,
    sustain: Arg = .8,
    release: Arg = 10000,
    duration: Arg = 4000
): UGen => {
    // using inline = true;
    let hist: History = history(undefined, { inline: true }); // = history(); // initialize the history (used for trigger)

    let nextTrig = history();
    let trigger = or(trig, nextTrig());
    let counter = accum(
        hist(),
        trigger,
        { min: 0, max: Infinity });

    // let attack_decay = add(attack, decay);

    // note: this is  lot of math for something so simple
    // todo: explore buffers

    let attack_decay = add(attack, decay);

    let sustainValue = zswitch(
        lt(counter, attack),
        div(counter, attack),
        zswitch(
            lt(counter, attack_decay),
            scale(counter, attack, attack_decay, 1, sustain), // DECAY
            sustain)); // SUSTAIN

    // if we're in the middle of any of the stages when we receive a trigger
    // we must fall the value to 0 really quick before re-starting the adsr
    // chain

    // we need a history

    let adsrVal = history();

    let mainADSR = adsrVal(mult(hist(), zswitch(
        gt(trigger, 0),
        hist(float(1)),// trigger: history --- set ---> 1)
        zswitch(
            and(lt(counter, duration), lt(counter, attack)),
            pow(div(counter, attack), 2),
            zswitch(
                and(lt(counter, duration), lt(counter, attack_decay)),
                scale(counter, attack, attack_decay, 1, sustain), // DECAY
                zswitch(
                    lt(counter, duration),
                    sustain, // SUSTAIN
                    zswitch(
                        lt(counter, add(duration, release)),
                        clamp( // RELEASE
                            mult(
                                sustainValue, // if were releasing then we need to "know" the sustain
                                sub(1, div(sub(counter, duration), release))),
                            0,
                            1),
                        hist(float(0)) // Finish: history --- set ---> 0
                    )))))));

    // now 

    let fallback: History = history();
    return s(
        zswitch(
            and(fallback(), gt(adsrVal(), 0.00001)), // we are in fallback stage
            // fall down quickly
            adsrVal(mult(adsrVal(), 0.001)),
            zswitch(fallback(),
                s(
                    nextTrig(float(1)),
                    mult(0, fallback(float(0))), // in this case we've finished falling
                ),
                zswitch( // otherwise we're not falling so just do the regular adsr
                    and(gt(trigger, 0), gt(adsrVal(), 0.01)),
                    mult(0, fallback(float(1))), // fallback
                    s(
                        mainADSR,
                        nextTrig(float(0))),
                ))));

    //return mainADSR;
}
