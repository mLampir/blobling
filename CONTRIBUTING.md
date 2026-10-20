# Contributing to Blobling

Ideas, bug reports and pull requests are welcome. Ideas and the roadmap live in
the [issues](https://github.com/mLampir/blobling/issues); how the game works is
in [docs/gameplay.md](docs/gameplay.md), and the notes in [CLAUDE.md](CLAUDE.md)
list the rules the project keeps (English only, texts in the language files,
sprites from the script, and so on).

Before you open a pull request, run the tests and the type check:

```bash
npm test && npm run check
```

## The license of your contribution

Blobling is licensed under the GNU General Public License, version 2 or (at
your option) any later version ([LICENSE](LICENSE)). The phone app is also
offered in Apple's App Store and Google Play, whose terms of use add
restrictions the GPL alone does not allow. So the project's own code carries
one additional permission:

> **App store permission.** As an additional permission to the GNU General
> Public License, the copyright holders of Blobling allow Lampir
> (<https://lampir.at>) to distribute the Blobling app, built from this
> code, through app stores (such as Apple's App Store and Google Play) under
> the terms of use those stores require, even where those terms restrict the
> recipients' rights under the GPL. The source code stays available under the
> GPL in this repository.

**By opening a pull request, you agree that your contribution is licensed
under the GPL version 2 or later together with this permission**, and that you
have the right to license it that way (it is your own work, or under a license
that allows it). Please don't submit code you copied from elsewhere unless you
say where it comes from and under which license.

The sprites in `app/pet/assets/` are under their own license
([app/pet/assets/LICENSE.txt](app/pet/assets/LICENSE.txt)).
