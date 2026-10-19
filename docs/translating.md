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
for it; the pet page the Pi serves comes in the Pi's language.

## Adding a language

1. Copy `app/locales/en.json` to a file named after the language code, for
   example `fr.json`.
2. Translate the texts on the right-hand side. Leave the keys on the left as
   they are. `language.name` is the language's own name (`Français`), shown in
   the list on the settings page.
3. Restart the app (`sudo systemctl restart led-matrix`), then choose the
   language on the settings page.

No code changes are needed. A few things to know while translating:

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
- `species`, `children` and `foes` hold the names of the pet's forms (in
  `children` the child of each line) and of the opponents
  on trips. They are the same in English and German, but a translation is free
  to change them.

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
