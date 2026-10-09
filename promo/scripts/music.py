#!/usr/bin/env python3
"""
Build the soundtracks for the promo videos from GarageBand's Apple Loops.

    python3 scripts/music.py            # -> public/music/promo.wav, public/music/abide.wav
                                        #    + out/music-previews/*.m4a to audition

The bed is "Find Strength Piano" (Apple Loops, Hip Hop pack: C major, 73 BPM, an
8-bar phrase that is really a 4-bar progression played twice and resolving on the
tonic every fourth bar). Nothing else is layered on top that could clash with it:
the "pad" is the piano's own long reverb tail, low-passed into a wash, over a very
quiet C-G-C drone. Each cue is timed so a phrase ends as the outro begins and the
reverb carries the last chord out.

Licence: GarageBand's audio loops may be used royalty-free in your own original
music or audio projects, which may be broadcast and distributed; only the loops
themselves may not be redistributed standalone (support.apple.com/102034). The
rendered soundtracks are therefore fine to ship with the videos, but keep the raw
loops out of the repo.

Requires ffmpeg on PATH and the Apple Loops that ship with GarageBand.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.join(os.path.dirname(__file__), "..")
LOOPS = "/Library/Audio/Apple Loops/Apple/01 Hip Hop"
MUSIC = os.path.join(ROOT, "public", "music")
PREVIEWS = os.path.join(ROOT, "out", "music-previews")
SR = 48000

PIANO = os.path.join(LOOPS, "Find Strength Piano.caf")
PIANO_BARS = 8  # 32 beats at 73 BPM

# Both compositions run at 30 fps; keep in sync with src/Promo.tsx and src/Abide.tsx.
PROMO_SECONDS = 885 / 30  # 29.5
ABIDE_SECONDS = 1385 / 30  # 46.17


def sh(*args, **kw):
    return subprocess.run(args, check=True, capture_output=True, **kw)


def load(path):
    """Decode any audio file to float32 stereo at SR."""
    raw = sh("ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-").stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def write(path, audio):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.clip(audio, -1, 1)
    sh("ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", path,
       input=pcm.astype(np.float32).tobytes())


def seconds(n):
    return int(round(n * SR))


def place(timeline, clip, at, gain=1.0, fade_in=0.0, fade_out=0.0):
    """Add `clip` to `timeline` starting at `at` seconds, with optional edge fades.
    Anything before t=0 or after the end is dropped."""
    clip = clip.copy() * gain
    if fade_in:
        n = min(seconds(fade_in), len(clip))
        clip[:n] *= np.linspace(0, 1, n)[:, None] ** 2
    if fade_out:
        n = min(seconds(fade_out), len(clip))
        clip[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    start = seconds(at)
    if start < 0:
        clip = clip[-start:]
        start = 0
    end = min(len(timeline), start + len(clip))
    if end > start:
        timeline[start:end] += clip[: end - start]
    return timeline


def impulse_response(rt60=4.2, predelay=0.025, seed=7):
    """A synthetic hall: decorrelated noise with an exponential decay that falls
    faster in the highs (one-pole damping), after a short pre-delay."""
    rng = np.random.default_rng(seed)
    n = seconds(rt60 * 1.2)
    t = np.arange(n) / SR
    env = 10 ** (-3 * t / rt60)  # -60 dB at rt60
    ir = rng.standard_normal((n, 2)) * env[:, None]
    # damping: progressively low-pass the tail
    for k, cutoff in ((0.0, 7000), (0.6, 4000), (1.6, 2500), (3.0, 1600)):
        i = seconds(k)
        sos = butter(2, cutoff, "lowpass", fs=SR, output="sos")
        ir[i:] = sosfilt(sos, ir[i:], axis=0)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0)).max()
    return np.vstack([np.zeros((seconds(predelay), 2)), ir])


def reverb(audio, ir):
    return np.stack([fftconvolve(audio[:, c], ir[:, c])[: len(audio)] for c in (0, 1)], axis=1)


def lowpass(audio, cutoff, order=4):
    sos = butter(order, cutoff, "lowpass", fs=SR, output="sos")
    return sosfilt(sos, audio, axis=0)


def drone(length, gain_db=-38.0, fade_in=3.0):
    """C2 + G2 + C3 sines with a slow swell, far below the piano."""
    t = np.arange(seconds(length)) / SR
    tone = (np.sin(2 * np.pi * 65.41 * t) + 0.5 * np.sin(2 * np.pi * 98.0 * t)
            + 0.35 * np.sin(2 * np.pi * 130.81 * t))
    tone *= 1 + 0.12 * np.sin(2 * np.pi * 0.11 * t)  # breathing
    tone *= 10 ** (gain_db / 20) / 1.85
    n = seconds(fade_in)
    tone[:n] *= np.linspace(0, 1, n) ** 2
    return np.stack([tone, tone * 0.98], axis=1)


def cue(length, passes, tail_fade, ir, piano):
    """Mix one cue of `length` seconds. `passes` lists (start_seconds, bars) of
    the piano phrase; the reverb input also gets a virtual pass before the first
    one, so the opening already has the room's wash in it."""
    bar = len(piano) / PIANO_BARS / SR
    n = seconds(length)
    dry = np.zeros((n, 2))
    for at, bars in passes:
        clip = piano[: seconds(bar * bars)]
        place(dry, clip, at, fade_out=1.2)
    first_at = passes[0][0]
    send = dry.copy()
    place(send, piano, first_at - bar * PIANO_BARS, gain=0.8)  # virtual previous pass
    wet = reverb(send, ir)
    wash = lowpass(wet, 900, order=2)
    mix = dry + wet * 10 ** (-13 / 20) + wash * 10 ** (-9 / 20) + drone(length)
    # ease in, and out over the outro
    fi = seconds(0.9)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None] ** 2
    fo = seconds(tail_fade)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    return mix


def master(src, dst, lufs=-16.0, tp=-1.5):
    """Two-pass EBU R128 normalisation (linear gain) to a social-video level."""
    filt = f"loudnorm=I={lufs}:TP={tp}:LRA=11:print_format=json"
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", src, "-af", filt, "-f", "null", "-"],
                         capture_output=True, text=True, check=True).stderr
    m = json.loads(out[out.rindex("{"):out.rindex("}") + 1])
    measured = ":".join(f"measured_{k}={m[f'input_{k.lower()}']}" for k in ("I", "TP", "LRA", "thresh"))
    sh("ffmpeg", "-v", "error", "-y", "-i", src,
       "-af", f"{filt}:{measured}:offset={m['target_offset']}:linear=true",
       "-ar", str(SR), "-c:a", "pcm_s16le", dst)
    return m


def main():
    piano = load(PIANO)
    bar = len(piano) / PIANO_BARS / SR
    print(f"piano loop {len(piano) / SR:.2f}s, bar {bar:.3f}s")
    ir = impulse_response()
    os.makedirs(MUSIC, exist_ok=True)
    os.makedirs(PREVIEWS, exist_ok=True)
    cues = {
        # The phrase ends at 26.6s, just after the outro card lands (26.5s).
        "promo": (PROMO_SECONDS, [(0.3, 8)], 2.2),
        # A wash under the Greek word, the phrase from the lexicon scene (3.5s),
        # then one more pass of the first four bars: 12 bars end at 42.95s, as the
        # outro begins (42.17s), and ring through it.
        "abide": (ABIDE_SECONDS, [(3.5, 8), (3.5 + bar * 8, 4)], 2.8),
    }
    for name, (length, passes, tail) in cues.items():
        mix = cue(length, passes, tail, ir, piano)
        raw = os.path.join(PREVIEWS, f"{name}-raw.wav")
        write(raw, mix)
        final = os.path.join(MUSIC, f"{name}.wav")
        m = master(raw, final)
        sh("ffmpeg", "-v", "error", "-y", "-i", final, "-c:a", "aac", "-b:a", "192k",
           os.path.join(PREVIEWS, f"{name}.m4a"))
        print(f"  wrote {os.path.relpath(final, ROOT)}  {length:.2f}s  "
              f"(raw {float(m['input_i']):.1f} LUFS -> {float(m['output_i']):.1f} LUFS, TP {float(m['output_tp']):.1f})")


if __name__ == "__main__":
    main()
