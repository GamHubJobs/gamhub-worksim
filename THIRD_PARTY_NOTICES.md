# Third-party software in GamHub WorkSim

## Grid Craft (the office spreadsheet)

GamHub WorkSim runs **GridCraft 0.18.0** by the ArtCraft team, unmodified. It is
shown in the game as "Grid Craft".

- **Source:** https://github.com/storytold/gridcraft (tag `v0.18.0`).
- **Build used:** the official web release, `gridcraft-web-0.18.0.zip`, with SHA-256
  `39c3236a3ac6c3607a4126c5ae40491069f5e1c28ccaac1bb884ddc9d294e4c0`.
- **Licence:** MIT OR Apache-2.0, copyright (c) 2026 the ArtCraft Team and the
  GridCraft contributors.
- **Notices shipped with the app:** the full licence texts, the NOTICE and the
  per-file attribution (including the bundled fonts' licences) are served with it,
  in `crafts/gridcraft/` (`LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, `ATTRIBUTION.md`).
- **Trademarks:** the ArtCraft name, wordmark and logos are trademarks of the
  ArtCraft Team and are not covered by that licence. GamHub WorkSim is not made,
  sponsored or endorsed by the ArtCraft Team, and does not use their marks in its own
  interface.

## Word Craft (the office word processor)

GamHub WorkSim runs **WordCraft 0.18.0** by the ArtCraft team, unmodified. It is
shown in the game as "Word Craft".

- **Source:** https://github.com/storytold/wordcraft (tag `v0.18.0`).
- **Build used:** the official web release, `wordcraft-web-0.18.0.zip`, with SHA-256
  `a444046f649a50779b1b6a1b0db7e24facd906156ceecbcfa53bdbbbc89f0310`.
- **Licence:** MIT OR Apache-2.0, copyright (c) 2026 the ArtCraft Team and the
  WordCraft contributors.
- **Notices shipped with the app:** the full licence texts, the NOTICE, the
  per-file attribution and the fonts' SIL Open Font Licence texts are served with it,
  in `crafts/wordcraft/`.
- **Trademarks:** the same notice as for Grid Craft applies.

## Deck Craft (the office presentation app)

GamHub WorkSim runs **DeckCraft 0.18.1** by the ArtCraft team, unmodified. It is
shown in the game as "Deck Craft".

- **Source:** https://github.com/storytold/deckcraft (tag `v0.18.1`).
- **Build used:** the official web release, `deckcraft-web-0.18.1.zip`, with SHA-256
  `3196e537fcfab538aaa2e88584bc74e29bb584459b916ab584ac22fbafe32db5`.
- **Licence:** MIT OR Apache-2.0, copyright (c) 2026 the ArtCraft Team and the
  DeckCraft contributors.
- **Notices shipped with the app:** the full licence texts and the NOTICE (which
  lists the bundled fonts and their licences) are served with it, in
  `crafts/deckcraft/`.
- **Trademarks:** the same notice as for Grid Craft applies.

The app files are not part of this repository. `npm run crafts` downloads them from
the release above and checks them (see `docs/CRAFT_APPS.md`).
