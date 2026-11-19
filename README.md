# Cover Snap Studio — a GTA 6 cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Michaelembiring/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Michaelembiring/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An entry for make.fun's "Make GTA 6 Cover Art" competition: a static,
offline web app that turns your photos and a caption into poster-style
cover art and exports it as a PNG.

## What it does

- **Multi-panel collage engine** (`app/src/cover.js`, canvas 2D): three
  layouts — Classic collage, Diagonal slash, Trio strips — drawn as polygon
  panels with thick white dividers. Each panel cover-fits one photo with
  its own zoom and offset.
- **Four colour grades** — Vice sunset, Neon nights, Leonida day, Noir —
  applied per render as a `ctx.filter` plus a soft-light gradient tint and
  a vignette.
- **Poster lettering** — a bold condensed title (system font stack only)
  with a dark outline and gradient fill over a top scrim, a letterspaced
  subtitle on a dark bottom band with an accent rule, and a small
  "COVER SNAP STUDIO" maker's mark.
- **Three export sizes** — 1080×1080, 1080×1350, 1920×1080.
- **Editor** (`app/src/main.js`): three photo slots, sample photos, title /
  subtitle inputs, layout / grade / size pickers, framing sliders for the
  selected panel, drag-on-canvas repositioning, Export PNG.

Everything runs locally in the browser; photos never leave the machine.
No network requests, no external fonts, no game logos, artwork or fonts —
the lettering is original, drawn from the system condensed stack.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `main.ts` — the entry point (copies `app/` + `screenshots/` to the
  output dir and writes `dossier.json`).
- `vendor/makefun-app.ts` — byte-identical copy of the kit's dossier
  library.
- `app/` — the studio (`index.html`, `style.css`, `src/cover.js`,
  `src/main.js`, `src/shots.js`, `samples/`).
- `screenshots/` — the four judged screenshots (see `shots.json`).
- `LICENSE` — MIT.
