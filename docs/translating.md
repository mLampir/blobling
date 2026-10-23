# Languages

Everything a person gets to read – the pet page, the web interface and what
the pet answers – comes from a language file in `app/locales/`. English
(`en.json`) and German (`de.json`) are included.

## Choosing a language

On the settings page (`http://<hostname>.local/`), under *Language*. Until a
language is chosen, the app takes the language of the first phone or browser
that opens a page, if there is a file for it, and English otherwise.

It can also be set in `/etc/led-matrix/config.ini`, as a starting value; a
language chosen on the settings page wins:

```ini
[interface]
language = de
```

Times and dates on the pet page follow the phone's own settings, not this
option. The app on the phone takes the phone's language, if there is a file
for it, or the language chosen for the app in the phone's settings (Android
13 and later: *Settings → Apps → Blobling → Language*; iOS: *Settings →
Blobling → Language*, shown once the phone has more than one language in its
list). The pet page the Pi serves comes in the Pi's language.

## Adding a language

1. Copy `app/locales/en.json` to a file named after the language code, for
   example `fr.json`.
2. Translate the texts on the right-hand side. Leave the keys on the left as
   they are. `language.name` is the language's own name (`Français`), shown in
   the list on the settings page.
3. Restart the app (`sudo systemctl restart led-matrix`), then choose the
   language on the settings page.

For the app from the stores, also add the code to the two lists the phones'
settings take the app's languages from: `app/android/app/src/main/res/xml/locales_config.xml`
and `CFBundleLocalizations` in `app/ios/App/App/Info.plist` (a test checks
both). No other code changes are needed. A few things to know while translating:

- **Write it the way you would say it.** A text should read as if it had been
  written in your language, not translated: everyday words, your language's
  own idioms and sentence order, and a different sentence where a close copy
  of the English would sound stiff. What matters is that it means the same.
- **Placeholders** in curly braces, such as `{name}` or `{time}`, are filled
  in by the app. Keep them, but move them wherever your language needs them.
  `{link}` marks the spot where a link is inserted.
- **Counted texts** come in pairs: `one` is used for exactly 1, `other` for
  every other number (`"one": "1 day"`, `"other": "{n} days"`).
- **Missing entries** fall back to English, so a half-finished translation
  already works. You can also delete entries you want to keep in English.
- Many texts are sentence fragments that the app puts next to the pet's name
  or a time in the history, for example `12:30 petted`. Have a look at the
  pet page to see where a text ends up before settling on the wording.
- `species`, `children`, `babies` and `foes` hold the names of the pet's forms
  (in `children` the child of each line, in `babies` its baby) and of the
  opponents on trips. Every language gives them names of its own, made the way
  *Naming a creature* below describes; a name that is a pun only in English
  needs a new one.

## Naming a creature

A name is the name of a kind of creature, like an animal's, not the name of
one pet (that is the one its owner gives it) and not a word from the
dictionary. These rules hold for every language and every new creature:

- **Melt the words, don't glue them.** Take two words that belong to the
  creature and let them share a sound or drop one, until the name flows:
  *Salamagma* (salamander + magma), *Polarguin*, *Ninjuhu* (ninja + Uhu),
  *Draquak*. Two whole words in a row (*Teichpferd*, *Schnarchbär*,
  *Biberhackl*) sound like a description, not a name.
- **No real words and no first names.** *Schirmherr*, *Kugelblitz* or
  *Sausewind* are words that already mean something else; *Fernando*,
  *Archibald* or *Astrid* are names of people. A pun on a name is fine when
  the name itself no longer stands in it (*Simsalabina*).
- **Short and easy to say.** If it doesn't roll off the tongue, drop a sound
  (*Frackuin* rather than *Frackguin*, *Pinselon* rather than *Pinseleon*).
- **Endings that sound like a name**: -el, -erich, -elle, -ino, -o, -a, -i
  (*Knorzel*, *Loderich*, *Laternelle*, *Loopino*, *Orkana*, *Wollki*).
  Children often get a soft, small ending (*Fuxi*, *Kauzi*, *Kleckschen*).
- **The idea of the creature in the name**: what it is (an anglerfish's lure,
  a lighthouse) and what makes it special, so a player can guess why it is
  called that.
- **Funny where the creature is funny, not everywhere.** A title with a pun
  fits a few characters (*Käpt'n Quak*, *Graf Nilferatu*, *Sir Fingerhut*,
  *DJ Flatter*); most names are not jokes.
- **Kinds that differ sound different.** Forms of one line may share a piece
  (*Kauzi*, *Fernauz*), but names of different lines, and of opponents, must
  not be mistaken for each other: not the same start (*Blinkero* and
  *Blinki*), not the same idea (two thieves called *Klau…*), not one letter
  apart. Check a new name against all names of its language, not only its
  line.
- **Not taken.** No name comes from another game (German *Kiesling* and
  *Quabbel* are Pokémon).
- **Native, not translated.** A German name is found in German, from German
  words and puns; it is not the English name translated, and not a German word
  that means something awkward (*Inkasso* is debt collecting in German).

The tests check that a translation only uses keys and placeholders that exist
in the English file:

```bash
npm test
```

## New texts in the code

Text shown to people never goes into the code. Add it to `en.json` (and to
`de.json`), then look it up:

- TypeScript: `t("pet.rejected.full", { name })`, the `t` of `core/src/i18n.ts`
- The settings page: `{{ t('settings.mode') }}`
- The pet page (`app/pet.html`): `data-t="page.rename"` on an element puts
  the text in it (`data-t-aria` in its `aria-label`); its script uses
  `t("page.trip.out", { time })`, or `tn(key, n)` for counted texts. A test
  checks that every key the page names is in `en.json`.

The one exception are the texts iOS shows when the app asks for a permission
(location, the home network): they live in `app/ios/App/App/Info.plist`
(English) and `app/ios/App/App/de.lproj/InfoPlist.strings`, because iOS reads
them before the app starts.
