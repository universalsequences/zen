This repository is an exploration is implementing Gen~ (Max/Msp's sound generation language) in typescript.

This is heavily inspired by Charlie Robert's genish.js project: https://github.com/charlieroberts/genish.js , however
attempts to extend it in 3 ways:
1. Allow several independent audio graphs to be created, so it can be integrated in web-based DAWs, where having multiple standalone effects
is crucial-- genish.js only allows one monolithic audio graph
2. Written in typescript, utilizing functional programming.
3. Written small enough to include onchain (note: this ended up getting a bit large, its about 50KB minified)

# What is Gen~?

Gen~ is Max MSP's sound generation language, that approachs sound synthesis/effects sample by sample.

Computers normally process audio in chunks of 100s of "samples" (i.e. numbers from -1 to 1). This is efficient for the computer, but hard 
to reason about. For example, if you were to think of an effect that depends on a sample 500 samples in the past, you'd normally
have to figure out which chunk that sample was in, etc.

When you abstract away chunks, and think of audio as simply streams of numbers, much more creative possibilities arise.

That is the power of Gen~, abstracting away all that chunk nonsense to give you the stream of sound.

# Zen

Zen makes several improvements on Gen~ that make it easier to do higher-order programming. 
For example, you can use memory-referencing operators (like history, delay, & latch) within loops & functions. Each "scope" within a function or loop
has its own memory, giving you access to these memory-based operators. 

In Gen~, this is not possible. If you write a foor loop in Gen~, and call history within it, it just overwrites the same memory address on each iteration of loop. This ends up making
code extremely verbose, as you need to use poke/peek/data while managing the channels/indices yourself.

With Zen, this is all managed by the compiler.

# Going beyond the standard Gen~ Operators

While Gen~ and genish.js aim to be extremely consise in its language definition, Zen goes slightly beyond to offer built-in operators for advanced concepts that result in smaller code.
For example, there are operators for popular functions like biquad filters and onepole filters.

There is a membrane physical modeling synthesizer in the physical-modeling folder, that demonstrates how to do 2D membrane phyiscal-modeling, for simulating real drum sounds. This is
useful for creating realistic snares, rims and kicks. The code there makes use of the scope-based memory functions.

You can remove these files and remove them from the index.ts before compiling the repo to make the library smaller, if you wish.

# Whats wrong with Web-Audio?

Web-based interactive music is limited by web-audio. Simple concepts like oscillator hardsync & FM feedback are not possible in standard Web-Audio, even though they've been around since the 80s. 
This is because the standard Web-Audio API works with chunks, so writing feedback processes referencing "one sample" back, is impossible. You can only reference samples from previous chunks, which are often hundreds of samples away. I've lost many nights learning that this makes FM feedback impossible in Web-Audio.

In **Zen** you can get a hardsynced synth like this
`
phasor(440, rampToTrig(phasor(22)))
`

And you get FM feedback like this: `let h = history(); let feedbackFM = h(cycle(429, mult(0.25, h())));`

A simple onepole lowpass filter: 
`let h = history(); 
return h(mix(phasor(432), h(), .99));
`

# How it works?

**Web-Audio** allows you to make custom AudioWorklets, which are basically custom ways to process audio-- beyond the core Web-Audio API.

AudioWorklets are just javascript code, and thus they can be generated. **Zen** generates efficient AudioWorklets from simple expressions.
The generated AudioWorklet is automatically loaded and you are returned an **AudioNode** (the terminology for a Web-Audio building block). Allowing
you to connect it with the rest of your Web-Audio setup.

# A full example
```
// create a feedback fm synth 
let fmFeedback: UGen = history();
let fmOsc: UGen = fmFeedback(cycle(50, mult(0.3, fmFeedback())));

// shape the osc with a 4 to the floor 
let env: UGen = vactrol(lte(phasor(.5), .3), 1, 200);
let shapedOsc: UGen = mult(env, fmOsc);

// feedback delay with 777 ms delay and 50% feedback
let delayFeedback: UGen = history();
let delayedOsc: UGen = delayFeedback(delay(add(mult(0.5, delayFeedback()), shapedOsc), mstosamps(777)));

// evaluate the zen graph 
let graph: ZenGraph = zen(delayedOsc);

// create the audio worklet from the graph
createWorklet(
    audioContext,
    graph).then(
    ({workletNode}) => {
    workletNode.connect(audioContext.destination); // connect to speakers
});
```

# WebAssembly Support

Zen allows choosing what target language you want for compilation. The options are C and Javascript. When the target is set as C, the DSP code gets compiled into C and then sent to a server that compiles that C code to WebAssembly, which is then loaded into the AudioWorklet. 

Javascript-based AudioWorklets have a soft limit for much code you can generate before your computer starts glitching out. When AudioWorklets exceed around 200KB, even powerful M1 processors start to get produce glitches.

# TODO

SIMD support has been started for very specific usecases (summing a matrix), but a more general purpose set of SIMD-enabled vector operations are being worked on. This will hopefully increase efficiency of some complex DSP algorithms,

