import { Arg, zswitch, eq, s } from './index';
import { pow, lte, gte, log10, gt, exp, clamp, abs, tanh, sub, div, mult, add } from './math';
import { history } from './history';
import { samplerate } from './filters/zdf';

export const compressor = (
    audio_in: Arg,
    ratio: Arg,
    threshold: Arg,
    knee: Arg,
    saturation: Arg,
    makeup_gain: Arg,
    attack_mode: Arg,
    release: Arg
) => {

    // SSL-style fixed attack times
    let _mode = clamp(attack_mode, 0, 2);
    const attack = zswitch(eq(_mode, 0), 0.1, zswitch(eq(_mode, 1), 0.3, 3));

    // Convert attack and release times to coefficients
    const attack_coeff = sub(1, exp(div(-1, mult(0.001, attack, samplerate()))));
    const release_coeff = sub(1, exp(div(-1, mult(0.001, release, samplerate()))));

    // Calculate the knee range
    const knee_low = pow(10, div(sub(threshold, knee), 20));
    const knee_high = pow(10, div(add(threshold, knee), 20));

    // Envelope follower
    const env_prev = history();
    const _env = abs(audio_in);
    const env = zswitch(gt(_env, env_prev()),
        add(env_prev(), mult(attack_coeff, sub(_env, env_prev()))),
        add(env_prev(), mult(release_coeff, sub(_env, env_prev()))));


    // NEED TO SET history of env_prev(env) //env_prev = env;

    // Calculate the gain reduction based on the input envelope, threshold, ratio, and knee width
    const knee_env = mult(20, log10(env));

    const gain_reduction = zswitch(
        lte(env, knee_low),
        0,
        zswitch(
            gte(env, knee_high),
            sub(sub(mult(20, log10(env)), threshold), div(sub(mult(20, log10(env)), threshold), ratio)),
            mult(sub(knee_env, sub(threshold, knee)), div(sub(knee_env, sub(threshold, knee)), mult(4, knee)))));


    const makeup = zswitch(eq(makeup_gain, 0), div(gain_reduction, ratio), makeup_gain);

    // Apply gain reduction and makeup gain to the input signal
    let reduction = add(mult(-1, gain_reduction), makeup);
    const compressed_signal = mult(audio_in, pow(10, div(reduction, 20)));

    // Apply soft saturation to the compressed signal
    //compressed_signal = tanh(saturation * compressed_signal) / tanh(saturation);
    return s(
        env_prev(env),
        tanh(div(mult(saturation, compressed_signal), tanh(saturation))));

};
