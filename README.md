# Wrap Up 2026

**Live demo: https://wrap-up-2026.vercel.app**
In the screen list, "00 Full story" plays the whole story, and 01 to 11 show one screen each, with its settings.

Animated, data-driven components for the Brevy "Wrap Up 2026" story: the cards, counters, falling pieces and the
money rain. Framework-agnostic TypeScript with GSAP as the only dependency.

| Folder | What it is |
| --- | --- |
| [`export/`](export/) | **What the app takes.** One self-contained `.js` per component with its `.d.ts`, the images in `assets/`, and the [integration guide](export/README.md). Generated: do not edit by hand. |
| [`src/`](src/) | Source of the components. `src/README.md` is the source of the guide in `export/`. |
| [`demo/`](demo/) | Preview only: every screen with its component, data switches and three phone sizes. Background, header, text and the still illustrations are context from Figma; in the app the illustrations are the animator's MP4 or Lottie. Screens 01, 03 to 08 and 10 play the animator's videos; 01 is made of them entirely. "00 Full story" at the top of the screen list plays 01 to 11 one after the other, with the progress bar and music; the demo opens with it. Where the browser lets no sound start before the first touch, the story runs and the music joins at that touch. |
| [`audio/`](audio/) | The music the demo plays (a track from Pixabay; credits and licenses in [audio/README.md](audio/README.md)). Demo only: the app has its own music, and SoundButton only reports the state. |
| [`video/`](video/) | The animator's videos with a transparent background, ready for the app: HEVC with alpha (`.mov`) and VP9 with alpha (`.webm`). How to embed them is in the [integration guide](export/README.md#videos-from-the-animator). The ProRes sources in `video/source/` are not in the repository. |
| [`reference/`](reference/) | Motion reference video. |
| [`scripts/`](scripts/) | `build-export.ts`, which generates `export/` from `src/`. |

## Using the components

Copy `export/` into the app and follow [`export/README.md`](export/README.md). In short:

```js
import { mountBusiestMonthCard } from './BusiestMonthCard.js';

const card = mountBusiestMonthCard(container, { visitsPerMonth: [14, 17, 19, 21, 20, 22, 23, 23, 21, 33, 18, 17], year: 2026 });
await card.ready; // its images are loaded
card.play();      // when the screen is in; all timings count from here
```

Every component returns `{ ready, play, pause, seek, destroy, duration }`, has a transparent background, scales to
its container like `object-fit: contain`, and shows its final state at once under `prefers-reduced-motion`.

## Run locally

For developers who work on the components or the demo. Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev          # demo at http://localhost:5173
```

| Command | |
| --- | --- |
| `bun run dev` | Demo with hot reload. |
| `bun run build` | Regenerates `export/` from `src/`. Run it after every change in `src/`. |
| `bun run build:demo` | Static build of the demo into `dist/` (this is what Vercel deploys, see `vercel.json`). |
| `bun run typecheck` | TypeScript check. |
| `bun test` | Unit tests. |
