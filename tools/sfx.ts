/**
 * The app's sounds as recipes, and the little synthesizer that turns them into WAV files.
 *
 * `npm run sounds` (tools/sounds.ts) writes every recipe to app/pet/sounds/<name>.wav; the build
 * puts the files into the app's script. The synthesizer works like the retro sound generators
 * sfxr and ZzFX (this is an implementation of its own, no code taken from them): a wave (square,
 * saw, triangle, sine or noise), a pitch that slides, steps (arpeggio) and wobbles (vibrato), an
 * envelope of attack, sustain and decay, a low-pass filter and, if wanted, fewer bits. Chiptune
 * sounds, to match the pixels of the pet and the LED panel.
 *
 * Nothing here is random from run to run (the noise has a fixed seed), so running the script
 * again gives the same files, and the tests can check that the files are up to date.
 *
 * Pure code, no Node: the app's tests use it too.
 */

export const SAMPLE_RATE = 22050;

export type Wave = "square" | "saw" | "triangle" | "sine" | "noise";

/** One voice of a sound: a single note with its own wave, pitch and envelope. */
export interface Voice {
  /** Seconds after the start of the sound. */
  at?: number;
  wave: Wave;
  /** Square only: the share of a period that is up (0.5 hollow and soft, 0.25 and 0.125 thinner). */
  duty?: number;
  /** The pitch it starts on, in Hz (see `note`). */
  hz: number;
  /** Semitones the pitch glides by (up or down), evenly over `slideTime`. */
  slide?: number;
  /** Seconds the glide takes; the whole voice if not given. */
  slideTime?: number;
  /** Arpeggio: semitones above `hz`, one after the other, `arpStep` seconds each; the last one stays. */
  arp?: number[];
  arpStep?: number;
  /** Vibrato: how far the pitch wobbles (semitones) and how fast (Hz). */
  vibrato?: number;
  vibratoHz?: number;
  /** The envelope in seconds: rising, full, fading out. */
  attack?: number;
  sustain?: number;
  decay?: number;
  /** Low-pass filter (Hz): rounds off the corners of square and saw waves. */
  lowpass?: number;
  /** Bit crush: the wave with only this many bits. */
  bits?: number;
  /** How loud in the mix of its sound, 0–1. */
  volume?: number;
}

export interface Recipe {
  /** The loudest point of the finished sound in dBFS: −6 for the jingles, lower for the rest (the dense square waves lower still, so they sound no louder). */
  peak: number;
  voices: Voice[];
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** A note's pitch in Hz: note("A4") is 440. */
export function note(name: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(name);
  if (!match) {
    throw new Error(`Not a note: ${name}`);
  }
  const semitone = NOTE_NAMES.indexOf(match[1]) + (Number(match[2]) + 1) * 12 - 69;
  return 440 * 2 ** (semitone / 12);
}

// Shorthands for the recipes
const square = (hz: number, extra: Partial<Voice> = {}): Voice => ({ wave: "square", hz, ...extra });
const triangle = (hz: number, extra: Partial<Voice> = {}): Voice => ({ wave: "triangle", hz, ...extra });
const sine = (hz: number, extra: Partial<Voice> = {}): Voice => ({ wave: "sine", hz, ...extra });
const noise = (hz: number, extra: Partial<Voice> = {}): Voice => ({ wave: "noise", hz, ...extra });
const n = note;

/**
 * Every sound of the app. Cute, soft and short, from the proven recipes of sfxr made gentle:
 * blip, pickup, jump and powerup, with the square waves rounded off by the low-pass filter.
 * The names are those of SOUND_NAMES in app/src/sound.ts (a test checks that both agree).
 */
export const RECIPES: Record<string, Recipe> = {
  /** A tap on the pet: a little blip that goes up. */
  boop: { peak: -11, voices: [
    square(n("C#5"), { slide: 7, slideTime: 0.06, attack: 0.004, sustain: 0.025, decay: 0.06, lowpass: 2200 }),
  ] },
  /** Stroking it: a soft, fluttering hum. */
  purr: { peak: -15, voices: [
    triangle(n("E4"), { slide: 3, vibrato: 1.2, vibratoHz: 26, attack: 0.02, sustain: 0.04, decay: 0.08, lowpass: 1400 }),
  ] },
  /** An action was taken: the coin pickup, two notes up. */
  ok: { peak: -9, voices: [
    square(n("G5"), { duty: 0.25, arp: [0, 5], arpStep: 0.05, attack: 0.003, sustain: 0.05, decay: 0.12, lowpass: 3000 }),
  ] },
  /** The pet would rather not: two low notes that sag. */
  no: { peak: -12, voices: [
    square(n("E4"), { slide: -2, attack: 0.005, sustain: 0.06, decay: 0.05, lowpass: 1000 }),
    square(n("D4"), { at: 0.13, slide: -3, attack: 0.005, sustain: 0.08, decay: 0.08, lowpass: 1000 }),
  ] },
  /** A thing lands in the scene: a quick drop. */
  plop: { peak: -9, voices: [
    triangle(n("G5"), { slide: -24, slideTime: 0.1, attack: 0.002, sustain: 0.02, decay: 0.1, lowpass: 2500 }),
  ] },
  /** Food goes right into the pet's mouth: two soft crunches. */
  munch: { peak: -11, voices: [0, 0.1].flatMap((at) => [
    noise(6000, { at, attack: 0.002, sustain: 0.02, decay: 0.04, lowpass: 1600 }),
    square(n("A3"), { at, slide: -5, attack: 0.002, sustain: 0.02, decay: 0.04, lowpass: 900, volume: 0.6 }),
  ]) },
  /** The sponge: tiny bubbles that rise. */
  bubble: { peak: -16, voices: [
    sine(n("D5"), { slide: 14, attack: 0.002, sustain: 0.01, decay: 0.04 }),
    sine(n("A5"), { at: 0.045, slide: 12, attack: 0.002, sustain: 0.01, decay: 0.04, volume: 0.7 }),
  ] },
  /** One step of a swipe in the training: a light tick. */
  step: { peak: -14, voices: [
    triangle(n("D6"), { attack: 0.002, sustain: 0.02, decay: 0.05, lowpass: 3500 }),
  ] },
  /** Something great: a trick learned, a game won, a big gain. A little fanfare. */
  tada: { peak: -6, voices: [
    ...["C5", "E5", "G5"].map((name, i) =>
      square(n(name), { at: i * 0.08, duty: 0.25, attack: 0.003, sustain: 0.05, decay: 0.04, lowpass: 3200 })),
    square(n("C6"), { at: 0.24, duty: 0.25, attack: 0.003, sustain: 0.12, decay: 0.25, vibrato: 0.25, vibratoHz: 7, lowpass: 3200 }),
    triangle(n("C4"), { at: 0.24, attack: 0.003, sustain: 0.12, decay: 0.25, volume: 0.5 }),
  ] },
  /** A game lost: three notes down, the last one wobbles. */
  lose: { peak: -12, voices: [
    square(n("G4"), { slide: -1, attack: 0.005, sustain: 0.08, decay: 0.06, lowpass: 1300 }),
    square(n("E4"), { at: 0.15, slide: -1, attack: 0.005, sustain: 0.08, decay: 0.06, lowpass: 1300 }),
    square(n("C4"), { at: 0.3, slide: -1, attack: 0.005, sustain: 0.12, decay: 0.2, vibrato: 0.3, vibratoHz: 5, lowpass: 1300 }),
  ] },
  /** It goes to sleep: a lullaby that gets quieter. */
  sleep: { peak: -13, voices: [
    triangle(n("G5"), { attack: 0.01, sustain: 0.08, decay: 0.12, lowpass: 2000 }),
    triangle(n("E5"), { at: 0.2, attack: 0.01, sustain: 0.08, decay: 0.12, lowpass: 2000, volume: 0.85 }),
    triangle(n("C5"), { at: 0.4, attack: 0.01, sustain: 0.1, decay: 0.25, vibrato: 0.2, vibratoHz: 5, lowpass: 2000, volume: 0.7 }),
  ] },
  /** It wakes up: three notes up, bright. */
  wake: { peak: -10, voices: [
    triangle(n("C5"), { attack: 0.004, sustain: 0.04, decay: 0.05, lowpass: 3000 }),
    triangle(n("E5"), { at: 0.09, attack: 0.004, sustain: 0.04, decay: 0.05, lowpass: 3000 }),
    triangle(n("A5"), { at: 0.18, slide: 2, attack: 0.004, sustain: 0.06, decay: 0.14, lowpass: 3000 }),
  ] },
  /** It hatches or grows up: the powerup, a sweep up with sparkles on top. */
  evolve: { peak: -6, voices: [
    square(n("C4"), { duty: 0.25, slide: 24, slideTime: 0.45, vibrato: 0.6, vibratoHz: 16, attack: 0.01, sustain: 0.35, decay: 0.1, lowpass: 2800, volume: 0.7 }),
    ...["E6", "G6"].map((name, i) =>
      triangle(n(name), { at: 0.45 + i * 0.08, attack: 0.002, sustain: 0.03, decay: 0.08 })),
    triangle(n("C7"), { at: 0.61, attack: 0.002, sustain: 0.06, decay: 0.3 }),
    square(n("C6"), { at: 0.61, duty: 0.25, attack: 0.002, sustain: 0.06, decay: 0.3, lowpass: 2800, volume: 0.5 }),
  ] },
};

/** A fixed series of random numbers in −1…1 (mulberry32), so the noise is the same every time. */
function randomSeries(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Smooths the jump of a square or saw wave at phase 0 (PolyBLEP), so high notes don't fizz. */
function blep(phase: number, step: number): number {
  if (phase < step) {
    const t = phase / step;
    return t + t - t * t - 1;
  }
  if (phase > 1 - step) {
    const t = (phase - 1) / step;
    return t * t + t + t + 1;
  }
  return 0;
}

/** One voice as samples (−1…1 before its volume). */
function renderVoice(voice: Voice, seed: number): Float64Array {
  const attack = voice.attack ?? 0.005, sustain = voice.sustain ?? 0.05, decay = voice.decay ?? 0.1;
  const length = attack + sustain + decay;
  const out = new Float64Array(Math.ceil(length * SAMPLE_RATE));
  const duty = voice.duty ?? 0.5;
  const slideTime = voice.slideTime ?? length;
  const random = randomSeries(seed);
  const lowpass = voice.lowpass ? 1 - Math.exp(-2 * Math.PI * voice.lowpass / SAMPLE_RATE) : 1;
  let phase = 0, held = random(), low1 = 0, low2 = 0;

  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    let semitones = (voice.slide ?? 0) * Math.min(1, t / slideTime);
    if (voice.arp?.length) {
      semitones += voice.arp[Math.min(voice.arp.length - 1, Math.floor(t / (voice.arpStep ?? 0.05)))];
    }
    if (voice.vibrato) {
      semitones += voice.vibrato * Math.sin(2 * Math.PI * (voice.vibratoHz ?? 6) * t);
    }
    const step = Math.min(0.5, voice.hz * 2 ** (semitones / 12) / SAMPLE_RATE);

    let value: number;
    switch (voice.wave) {
      case "sine":
        value = Math.sin(2 * Math.PI * phase);
        break;
      case "triangle":
        value = 1 - 4 * Math.abs(phase - 0.5);
        break;
      case "saw":
        value = 2 * phase - 1 - blep(phase, step);
        break;
      case "square":
        value = (phase < duty ? 1 : -1) + blep(phase, step) - blep((phase - duty + 1) % 1, step) - (2 * duty - 1);
        break;
      case "noise":
        value = held;
        break;
    }
    phase += step;
    if (phase >= 1) {
      phase -= 1;
      held = random();
    }

    if (voice.bits) {
      const levels = 2 ** (voice.bits - 1);
      value = Math.round(value * levels) / levels;
    }
    // two gentle one-pole filters one after the other: 12 dB per octave above the cutoff
    low1 += (value - low1) * lowpass;
    low2 += (low1 - low2) * lowpass;
    value = low2;

    const envelope = t < attack ? t / attack
      : t < attack + sustain ? 1
      : (1 - (t - attack - sustain) / decay) ** 2;
    out[i] = value * envelope * (voice.volume ?? 1);
  }
  return out;
}

const SILENT = 0.0015; // below this (about −56 dBFS) the end of a sound counts as silence
const FADE_OUT = 0.004; // seconds of fade at the very end, so a trimmed sound never clicks

/** A recipe as samples, −1…1: the voices mixed, brought to the recipe's peak and trimmed. */
export function render(recipe: Recipe): Float64Array {
  const voices = recipe.voices.map((voice, i) => ({ start: Math.round((voice.at ?? 0) * SAMPLE_RATE), samples: renderVoice(voice, i + 1) }));
  const mix = new Float64Array(Math.max(...voices.map(({ start, samples }) => start + samples.length)));
  for (const { start, samples } of voices) {
    for (let i = 0; i < samples.length; i++) {
      mix[start + i] += samples[i];
    }
  }
  let loudest = 0;
  for (const value of mix) {
    loudest = Math.max(loudest, Math.abs(value));
  }
  const gain = loudest ? 10 ** (recipe.peak / 20) / loudest : 0;
  let first = 0, last = mix.length - 1;
  while (first < last && Math.abs(mix[first] * gain) < SILENT) {
    first++;
  }
  while (last > first && Math.abs(mix[last] * gain) < SILENT) {
    last--;
  }
  const out = mix.slice(first, last + 1).map((value) => value * gain);
  const fade = Math.min(out.length, Math.round(FADE_OUT * SAMPLE_RATE));
  for (let i = 0; i < fade; i++) {
    out[out.length - 1 - i] *= i / fade;
  }
  return out;
}

/** Samples (−1…1) as a WAV file: mono, 16 bit, SAMPLE_RATE. */
export function encodeWav(samples: Float64Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true));
  return bytes;
}

/** The samples of a WAV file as encodeWav writes it, −1…1 (for the tests). */
export function decodeWav(bytes: Uint8Array): { rate: number; channels: number; bits: number; samples: Float64Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(40, true) / 2;
  const samples = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = view.getInt16(44 + i * 2, true) / 32767;
  }
  return { rate: view.getUint32(24, true), channels: view.getUint16(22, true), bits: view.getUint16(34, true), samples };
}
