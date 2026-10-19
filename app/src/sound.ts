/**
 * The sounds of the app: little chiptune effects, played from WAV files with the Web Audio API.
 *
 * The files (app/pet/sounds/) are made by a script from recipes, like the sprites:
 * tools/sfx.ts holds the recipes and the synthesizer, `npm run sounds` writes the files, and the
 * build puts them into the app's script, so they come along wherever the page runs and nothing
 * is loaded from a server.
 *
 * They are played by the phone (or the browser) for what the player does on it, also when the pet
 * lives on a Pi: the Pi itself stays silent (its onboard sound is off, it clashes with the panel).
 * They can be turned off under *More*; the choice is kept on the phone.
 *
 * A browser only lets a page make sound after a touch, so the audio starts with the first touch
 * on the page, the files are decoded then (once), and the audio is woken again by a touch
 * whenever the system has paused it.
 */

/** Every sound of the app; each has its file app/pet/sounds/<name>.wav and its recipe in tools/sfx.ts. */
export const SOUND_NAMES = [
  "boop",   // a tap on the pet
  "purr",   // stroking it, a little hum now and then
  "ok",     // an action was taken
  "no",     // the pet would rather not
  "plop",   // a thing lands in the scene
  "munch",  // food goes right into the pet's mouth
  "bubble", // the sponge
  "step",   // one step of a swipe in the training
  "tada",   // something great: a trick learned, a game won, a big gain
  "lose",   // a game lost
  "sleep",  // it goes to sleep
  "wake",   // it wakes up
  "evolve", // it hatches or grows up
] as const;

export type SoundName = typeof SOUND_NAMES[number];

/** The files of the sounds by name, as the build hands them over. */
export type SoundFiles = () => Partial<Record<string, Uint8Array>>;

const KEY = "sound"; // "off": the player turned the sounds off
const VOLUME = 0.4; // the overall volume: a pet, not an alarm (the files peak at −6 dBFS and below)

/** What the sounds need from the browser (an AudioContext, or a stand-in in the tests). */
export type Audio = Pick<AudioContext, "state" | "destination" | "resume" | "createGain" | "createBufferSource" | "decodeAudioData">;

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class Sounds {
  private audio: Audio | null = null;
  private output: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private enabled: boolean;

  constructor(
    private readonly storage: () => Storage | undefined,
    private readonly makeAudio: () => Audio | null,
    private readonly files: SoundFiles,
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

  /** On a touch: starts the audio and decodes the sounds, or wakes the audio if the system paused it. */
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
        this.decode(this.audio);
      }
      if (this.audio.state !== "running") {
        void this.audio.resume().catch(() => {});
      }
    } catch (error) {
      console.warn("No sound", error);
      this.audio = null;
    }
  }

  /** Decodes every sound once; a sound that fails stays silent, the others play. */
  private decode(audio: Audio): void {
    const files = this.files();
    for (const name of SOUND_NAMES) {
      const file = files[name];
      if (!file) {
        continue;
      }
      // decodeAudioData takes the buffer over, so it gets a copy of its own
      const copy = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      audio.decodeAudioData(copy)
        .then((buffer) => void this.buffers.set(name, buffer))
        .catch((error: unknown) => console.warn(`No sound ${name}`, error));
    }
  }

  /** Plays a sound now, if the sounds are on and the audio has been started (and the sound decoded). */
  play(name: SoundName): void {
    const audio = this.audio, output = this.output, buffer = this.buffers.get(name);
    if (!this.enabled || this.hidden() || !audio || !output || !buffer || audio.state !== "running") {
      return;
    }
    try {
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(output);
      source.start();
    } catch (error) {
      console.warn("No sound", error);
    }
  }
}

/** The page's sounds: an AudioContext, started by the first touch on the page. */
export function pageSounds(files: SoundFiles): Sounds {
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
    files,
    () => document.hidden,
  );
  addEventListener("pointerdown", () => sounds.wake(), { capture: true, passive: true });
  return sounds;
}
