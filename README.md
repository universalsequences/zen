This repository is an exploration is implementing Gen~ (Max/Msp's sound generation language) in typescript.

This is heavily inspired by Charlie Robert's genish.js repo: https://github.com/charlieroberts/genish.js , however
attempts to extend it in 3 ways:
1. Allow several independent audio graphs to be created, so it can be integrated in web-based DAWs, where having multiple standalone effects
is crucial-- genish.js only allows one monolithic audio graph
2. Written in typescript, utilizing functional currying to handle the "context"
3. Written small enough to include on-chain (tbf genish.js is very small)

The ultimate goal is for this package to be placed onchain, and then used by other onchain art projects.

# What is Gen~?

Gen~ is Max MSPs sound generation language, that approachs sound synthesis/effects sample by sample.

Computers normally process audio in chunks of "samples" (i.e. numbers from -1 to 1). This is efficient for the computer, but hard 
to reason about. For example, if you were to think of an effect that depends on a sample 500 samples in the past, you'd normally
have to figure out which chunk that sample was in, etc.

When you abstract away chunks, and think of audio as simply streams of numbers, much more creative possibilities arise.

That is the power of Gen~, abstracting away all that chunk nonsense to give you the stream of sound.

# Why do we need this onchain?

Onchain generative music is limited by web-audio. Simple concepts like oscillator hardsync & feedback FM are not implemented, even though they've been around since the 80s. 

In **Zen** you can get a hardsynced synth like this
`
phasor(440, phasor(22)) 
`

A simple onepole lowpass filter: `history(mix(input(0), history(undefined, "filter"), 0.999), "filter")`

# How it works?

**Web-Audio** allows you to make custom AudioWorklets, which are basically custom ways to process audio-- beyond the core Web-Audio API.

AudioWorklets are just javascript code, and thus they can be generated. **Zen** generates efficient AudioWorklets from simple expressions.
The generated AudioWorklet is automatically loaded and you are returned an **AudioNode** (the terminology for a Web-Audio building block). Allowing
you to connect it with the rest of your Web-Audio setup.

## History/Single-Sample Feedback


# todo

This is just getting started, and implemented as a nextjs project, however, I plan on turning this into a standolone package that can be easily implrted




