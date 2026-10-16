/**
 * The sounds of the app: short tones made in the page with the Web Audio API, no sound files.
 *
 * They are played by the phone (or the browser) for what the player does on it, also when the pet
 * lives on a Pi: the Pi itself stays silent (its onboard sound is off, it clashes with the panel).
 * They can be turned off under *More*; the choice is kept on the phone.
 *
 * A browser only lets a page make sound after a touch, so the audio starts with the first touch
 * on the page and is woken again by a touch whenever the system has paused it.
 */

/** One tone: a wave from `from` Hz (gliding to `to`), `at` seconds after the start of the sound, `length` long. */
export interface Tone {
  from: number;
  to?: number;
  at: number;
  length: number;
  wave: OscillatorType;
  /** How loud, 0–1 (before the overall volume). */
  volume: number;
}

const tone = (from: number, at: number, length: number, extra: Partial<Tone> = {}): Tone =>
  ({ from, at, length, wave: "sine", volume: 0.6, ...extra });

// Notes, so the melodies read like melodies
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, G4 = 392, E4 = 329.63, C4 = 261.63;

/** Every sound of the app. Cute and short: none is longer than about a second. */
export const SOUNDS = {
  /** A tap on the pet. */
  boop: [tone(620, 0, 0.09, { to: 900 })],
  /** Stroking it, a little puff now and then. */
  purr: [tone(330, 0, 0.07, { to: 400, wave: "triangle", volume: 0.3 })],
  /** An action was taken. */
  ok: [tone(C5, 0, 0.08, { wave: "triangle" }), tone(G5, 0.07, 0.12, { wave: "triangle" })],
  /** The pet would rather not. */
  no: [tone(260, 0, 0.1, { to: 220, wave: "triangle" }), tone(220, 0.13, 0.16, { to: 175, wave: "triangle" })],
  /** A thing lands in the scene. */
  plop: [tone(520, 0, 0.14, { to: 140 })],
  /** Food goes right into the pet's mouth. */
  munch: [tone(240, 0, 0.06, { to: 160, wave: "triangle" }), tone(260, 0.11, 0.06, { to: 170, wave: "triangle" })],
  /** The sponge. */
  bubble: [tone(900, 0, 0.05, { to: 1500, volume: 0.25 })],
  /** One step of a swipe in the training. */
  step: [tone(D5, 0, 0.07, { wave: "triangle", volume: 0.4 })],
  /** Something great: a trick learned, a game won, a big gain. */
  tada: [C5, E5, G5].map((note, i) => tone(note, i * 0.09, 0.1, { wave: "triangle" }))
    .concat(tone(C6, 0.27, 0.35, { wave: "triangle" })),
  /** A game lost. */
  lose: [G4, E4, C4].map((note, i) => tone(note, i * 0.16, 0.18, { wave: "triangle", volume: 0.45 })),
  /** It goes to sleep. */
  sleep: [tone(G5, 0, 0.18, { volume: 0.35 }), tone(E5, 0.2, 0.18, { volume: 0.3 }), tone(C5, 0.4, 0.35, { volume: 0.25 })],
  /** It wakes up. */
  wake: [tone(C5, 0, 0.1, { volume: 0.4 }), tone(E5, 0.1, 0.1, { volume: 0.45 }), tone(A5, 0.2, 0.18, { volume: 0.5 })],
  /** It hatches or grows up. */
  evolve: [tone(C4, 0, 0.6, { to: C6, wave: "triangle", volume: 0.4 }),
    ...[E5, G5, C6].map((note, i) => tone(note * 2, 0.55 + i * 0.08, 0.14, { volume: 0.25 }))],
} satisfies Record<string, Tone[]>;

export type SoundName = keyof typeof SOUNDS;

const KEY = "sound"; // "off": the player turned the sounds off
const VOLUME = 0.25; // the overall volume: a pet, not an alarm
const FADE = 0.015; // seconds a tone takes to come in, so it never clicks

/** What the sounds need from the browser (an AudioContext, or a stand-in in the tests). */
export type Audio = Pick<AudioContext, "currentTime" | "state" | "destination" | "resume" | "createOscillator" | "createGain">;

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class Sounds {
  private audio: Audio | null = null;
  private output: GainNode | null = null;
  private enabled: boolean;

  constructor(
    private readonly storage: () => Storage | undefined,
    private readonly makeAudio: () => Audio | null,
    private readonly hidden: () => boolean = () => false,
  ) {
    try {
      this.enabled = storage()?.getItem(KEY) !== "off";
    } catch {
      this.enabled = true;
    }
  }

  /** Whether the sounds are on (they are, until the player turns them off). */
  get on(): boolean {
    return this.enabled;
  }

  /** Turns the sounds on or off; called from a tap, so turning them on starts the audio as well. */
  set on(on: boolean) {
    this.enabled = on;
    try {
      if (on) {
        this.storage()?.removeItem(KEY);
      } else {
        this.storage()?.setItem(KEY, "off");
      }
    } catch {
      // then only for as long as the app is open
    }
    this.wake();
  }

  /** On a touch: starts the audio, or wakes it if the system paused it. */
  wake(): void {
    if (!this.enabled) {
      return;
    }
    try {
      if (!this.audio) {
        this.audio = this.makeAudio();
        if (!this.audio) {
          return;
        }
        this.output = this.audio.createGain();
        this.output.gain.value = VOLUME;
        this.output.connect(this.audio.destination);
      }
      if (this.audio.state !== "running") {
        void this.audio.resume().catch(() => {});
      }
    } catch (error) {
      console.warn("No sound", error);
      this.audio = null;
    }
  }

  /** Plays a sound now, if the sounds are on and the audio has been started. */
  play(name: SoundName): void {
    const audio = this.audio, output = this.output;
    if (!this.enabled || this.hidden() || !audio || !output || audio.state !== "running") {
      return;
    }
    const start = audio.currentTime + 0.01;
    for (const { from, to, at, length, wave, volume } of SOUNDS[name]) {
      const begin = start + at, end = begin + length;
      const oscillator = audio.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(from, begin);
      if (to) {
        oscillator.frequency.exponentialRampToValueAtTime(to, end);
      }
      const envelope = audio.createGain();
      envelope.gain.setValueAtTime(0, begin);
      envelope.gain.linearRampToValueAtTime(volume, begin + FADE);
      envelope.gain.exponentialRampToValueAtTime(0.001, end);
      oscillator.connect(envelope).connect(output);
      oscillator.start(begin);
      oscillator.stop(end + 0.02);
    }
  }
}

/** The page's sounds: an AudioContext, started by the first touch on the page. */
export function pageSounds(): Sounds {
  const sounds = new Sounds(
    () => globalThis.localStorage,
    () => {
      const Context = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) {
        return null;
      }
      // iPhone: mix in with the player's own music and keep quiet with the silent switch
      const session = (navigator as { audioSession?: { type: string } }).audioSession;
      if (session) {
        session.type = "ambient";
      }
      return new Context();
    },
    () => document.hidden,
  );
  addEventListener("pointerdown", () => sounds.wake(), { capture: true, passive: true });
  return sounds;
}
