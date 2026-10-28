#!/usr/bin/env python3
"""Quiet background music for the site video, made here so there is no licence to worry about.

Slow chords (a soft pad) with a music-box arpeggio over them, 66 beats a minute. Only the standard library;
echo, fades and loudness come in make.sh through ffmpeg.

    python3 scripts/promo/music.py <seconds> <out.wav>
"""
import array
import math
import random
import sys
import wave

RATE = 44100
BPM = 66
BEAT = 60 / BPM

# Two bars per chord: Cmaj7 · Am7 · Fmaj7 · G6sus4, as MIDI notes (pad low, arpeggio high).
CHORDS = [
    ([48, 55, 59, 64], [72, 76, 79, 83, 79, 76]),
    ([45, 52, 55, 60], [69, 72, 76, 79, 76, 72]),
    ([41, 48, 52, 57], [69, 72, 76, 77, 76, 72]),
    ([43, 50, 55, 60], [67, 71, 72, 74, 72, 71]),
]


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def main(seconds, out):
    n = int(seconds * RATE)
    left, right = array.array('f', bytes(4 * n)), array.array('f', bytes(4 * n))
    rnd = random.Random(7)
    bar = 4 * BEAT
    t, i = 0.0, 0
    while t < seconds:
        pad, arp = CHORDS[i % len(CHORDS)]
        length = 2 * bar
        # Pad: each note slowly swells and fades over two bars, slightly detuned left and right.
        start, stop = int(t * RATE), min(n, int((t + length + 1.5) * RATE))
        for note in pad:
            f = hz(note)
            w1, w2 = 2 * math.pi * f / RATE, 2 * math.pi * f * 1.003 / RATE
            span = stop - start
            for k in range(span):
                env = math.sin(math.pi * min(1.0, k / span)) ** 1.6 * 0.035
                left[start + k] += env * math.sin(w1 * k)
                right[start + k] += env * math.sin(w2 * k)
        # Arpeggio: a plucked note on every beat and the off-beats of the second bar, decaying like a music box.
        times = [b * BEAT for b in range(4)] + [4 * BEAT + b * BEAT / 2 for b in range(0, 8, 2)] + [4 * BEAT + 3.5 * BEAT]
        for j, at in enumerate(times):
            note = arp[j % len(arp)]
            f, s0 = hz(note), int((t + at) * RATE)
            if s0 >= n:
                break
            pan = 0.5 + 0.3 * math.sin(j)
            vol = 0.11 * (0.8 + 0.2 * rnd.random())
            dur = min(n - s0, int(2.6 * RATE))
            w = 2 * math.pi * f / RATE
            for k in range(dur):
                env = math.exp(-k / (0.55 * RATE)) * min(1.0, k / 220)
                v = vol * env * (math.sin(w * k) + 0.25 * math.sin(2 * w * k) * math.exp(-k / (0.15 * RATE)))
                left[s0 + k] += v * (1 - pan)
                right[s0 + k] += v * pan
        t += length
        i += 1
    peak = max(max(abs(x) for x in left), max(abs(x) for x in right)) or 1
    frames = array.array('h')
    for a, b in zip(left, right):
        frames.append(int(a / peak * 0.8 * 32767))
        frames.append(int(b / peak * 0.8 * 32767))
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames.tobytes())


if __name__ == '__main__':
    main(float(sys.argv[1]), sys.argv[2])
