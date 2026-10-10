/**
 * Interface text in the chosen language.
 *
 * Everything a person gets to read lives in the language files (one per language), never in the
 * code. English is the reference: it is always used and the chosen language is laid on top, so
 * an entry missing from a translation shows up in English instead of breaking the page.
 *
 * The files themselves are handed in: the Pi reads them from its folder, the app brings them
 * along.
 */

export const DEFAULT_LANGUAGE = "en";
const LANGUAGE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/;
const PLACEHOLDER = /\{(\w+)\}/g;

/** "pet.rejected.full" -> text */
export type Catalog = Record<string, string>;

/** A language file as it is written: texts in nested groups. */
export function flatten(node: object, prefix = ""): Catalog {
  const strings: Catalog = {};
  for (const [key, value] of Object.entries(node)) {
    if (value !== null && typeof value === "object") {
      Object.assign(strings, flatten(value, `${prefix}${key}.`));
    } else {
      strings[prefix + key] = String(value);
    }
  }
  return strings;
}

/**
 * The language of the locales that a browser prefers most, from its Accept-Language header
 * ("de-AT,de;q=0.9,en;q=0.8"), or null if none of them is there.
 */
export function preferredLanguage(header: string | undefined, available: readonly string[]): string | null {
  const wanted = (header ?? "").split(",").map((part, index) => {
    const [tag, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((param) => param.trim().match(/^q=([\d.]+)$/)).find(Boolean);
    return { tag, q: q ? Number(q[1]) : 1, index };
  }).filter(({ tag, q }) => tag && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of wanted) {
    for (const code of [tag, tag.split("-")[0]]) {
      if (available.includes(code)) {
        return code;
      }
    }
  }
  return null;
}

export class I18n {
  readonly language: string;
  /** All strings as {key: text}, for the pages' own scripts. */
  readonly catalog: Catalog;
  private readonly warn: (message: string) => void;

  /**
   * `locales`: language code -> the content of its file. `language`: a code such as "de";
   * unknown codes fall back to English.
   */
  constructor(locales: Record<string, object>, language: string | null = DEFAULT_LANGUAGE,
      warn: (message: string) => void = console.warn) {
    this.warn = warn;
    const wanted = (language || DEFAULT_LANGUAGE).trim().toLowerCase();
    const strings = flatten(locales[DEFAULT_LANGUAGE]);
    if (wanted === DEFAULT_LANGUAGE) {
      this.language = wanted;
    } else if (LANGUAGE.test(wanted) && Object.hasOwn(locales, wanted)) {
      Object.assign(strings, flatten(locales[wanted]));
      this.language = wanted;
    } else {
      warn(`Language "${wanted}" is not available, using English`);
      this.language = DEFAULT_LANGUAGE;
    }
    this.catalog = strings;
  }

  /** Text for a key, with {placeholders} filled in. An unknown key comes back as it is. */
  t = (key: string, values?: Record<string, unknown>): string => {
    const text = this.catalog[key];
    if (text === undefined) {
      this.warn(`No text for "${key}"`);
      return key;
    }
    if (!values) {
      return text;
    }
    const missing = [...text.matchAll(PLACEHOLDER)].some((match) => !Object.hasOwn(values, match[1]));
    if (missing) {
      this.warn(`Placeholders of "${key}" do not fit (${this.language})`);
      return text;
    }
    return text.replace(PLACEHOLDER, (_, name) => String(values[name]));
  };
}
