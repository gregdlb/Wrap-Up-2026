# Wrap Up 2026 components

Animated, data-driven pieces of the Brevy "Wrap Up 2026" story. Copy this folder into the app as it is.

| File | Screen | What it is |
| --- | --- | --- |
| `FirstVisitCard.js` | 02 First visit | the calendar page with the date of the first visit |
| `VisitsCount.js` | 03 Visits | the "VISITS 214" plaque with its counter and the "With Rosa" sticker |
| `HoursClock.js` | 04 Hours | the round clock with the arc that goes round and the counter of full days |
| `BusiestMonthCard.js` | 05 Busiest month | the bar chart card |
| `FallingLeaves.js` | 05 Busiest month | the month's falling leaves, petals or snow |
| `PersonalityCard.js` | 06 Clock-in personality | the stat card, one component for every personality type |
| `WeeksCard.js` | 07 Weeks in a row | the grid of weeks with the streak and its counter |
| `CaredForCard.js` | 08 Who you cared for | the highlighted names with their visit badges, and the sticker |
| `PayCard.js` | 09 Pay | the scratch card with the amount |
| `MoneyRain.js` | 09 Pay | bills and coins that burst out when the amount is revealed |
| `TopCaregiverCard.js` | 10 Top caregiver | the rank chart with the "You" pin and the "Top 10%" counter |
| `ThankYouCard.js` | 11 Thank you + share | the four summary tiles, and the image to share |
| `SoundButton.js` | header | the mute / unmute button next to Close; shows and reports the state, the music is the app's |
| `WrapUpAssets.js` | all | `preloadWrapUpAssets()`: fetches the components' images ahead of the story |
| `WrapUpText.js` | all | `keepTogether()`: keeps a number and its unit on one line in the app's own texts |
| `*.d.ts` | | TypeScript declarations, one per component, picked up automatically next to the JS file |
| `assets/` | | Images used by the components. Keep it next to the JS files. |

Each JS file is a self-contained ES module: code and styles in one file, `gsap` is the only import. Styles are
added to the page as a `<style>` tag on first mount. Everything a component renders has a transparent background;
screen backgrounds, header, text and transitions stay in the app, and so do the animator's MP4 and Lottie layers
(illustrations, garlands, scenes). `FallingLeaves.js` stands in for the
animator's MP4 for now.

## Shared by all cards

Every card follows the same conventions; the sections below only list what differs.

```js
const card = mountSomeCard(container, data, options);
await card.ready; // its images are loaded and decoded
card.play();      // when the screen is in; all timings count from here
```

| Returns | |
| --- | --- |
| `ready` | `Promise<void>`: resolves when the component's images are downloaded and decoded. See "Images" below. |
| `play(delay?)` | Starts after `delay` seconds. Resumes when paused, restarts when finished. |
| `pause()` | Freezes the animation, e.g. while the user holds the story. |
| `seek(t)` | Jumps to `t` seconds. |
| `destroy()` | Stops and removes the card from the container. |
| `duration` | `6`: the length of the whole screen in seconds. The animation ends earlier, then the card holds. |

| Option | Default | |
| --- | --- | --- |
| `onComplete` | none | Called when the screen's 6 s are up. |
| `autoplay` | `false` | Start right after mounting instead of waiting for `play()`. |
| `maxScale` | `1.15` | Largest scale relative to the Figma size. |
| `locale` | `'en-US'` | Names of months and weekdays, number formatting. |
| `ariaLabel` | generated | Screen reader description of the card. |

- **Size.** A card is its Figma frame. It scales as a whole to fit `container`, like `object-fit: contain`: it
  keeps its proportions, is centred, and never grows beyond `maxScale`. Give the container a width and a height.
  A container without a height gets one from the card. The frame size and its place on the 360 x 782 Figma screen
  are listed per card.
- **Images.** Nothing may pop in mid-animation, so a screen starts when its images are in. Mount every component
  of the screen, wait for all of them, then play:

  ```js
  await Promise.all([card.ready, leaves.ready]);
  card.play();
  leaves.play();
  ```

  `ready` never rejects; a component without images (most cards) is ready at once. `play()` called before
  `ready` waits for it by itself and only then starts the 6 s clock. If the images are still not there after
  2 s, the animation starts without them and each missing image fades in over 0.2 s when it arrives. Components
  with images: FirstVisitCard, VisitsCount and CaredForCard (the sticker's heart) and FallingLeaves (the sprites).

  To have the images in the browser's cache before the story opens, call `preloadWrapUpAssets` early:

  ```js
  import { preloadWrapUpAssets } from './WrapUpAssets.js';
  await preloadWrapUpAssets([10]); // months whose FallingLeaves sprites are needed, 1 = January; default: all 12
  ```

  It fetches and decodes the sticker heart and the sprites of those months, and resolves when they are in (it
  never rejects). The second argument takes `{ assetBaseUrl }`, as the components do.
- **Page flip.** Wherever sheets turn (the calendar of FirstVisitCard, and the three blank sheets that
  BusiestMonthCard, PersonalityCard and WeeksCard open with at 0.2–1.35 s) they move like the calendar in the
  reference video (`reference/Demo_m1.mp4`), a little slower and softer: a sheet is hinged at its top edge;
  its free edge first swings out towards the viewer, so for a moment the sheet is about 1.09x its size; then
  it folds up onto the hinge, turning see-through, and is gone after 0.55 s. The next sheet starts before the
  one above it is gone, but never more than two are in the air; a lifted sheet casts a soft shadow. While it
  swings out a sheet reaches up to 22 px below the card and about 30 px past its sides (19 px while it is
  still solid), so leave the card's container unclipped (`overflow: visible`).
- **Text.** Every text a component draws stays on one line; nothing wraps inside a card. A number and its unit
  are joined with a no-break space ("5:48 AM", "214 visits", "42 full days", "7h 20m", "March 4"), also on
  stickers, badges and the share image, so they stay together wherever the text is reused. Long names are set
  smaller instead of being cut: the names of CaredForCard fit their slot, "with {name}" fits its tile.

  The texts around the cards are the app's. To break them as in Figma: give the text column its Figma width
  (329 px on the 360 px screen), set `text-wrap: pretty` on body text (no single word in the last line) and
  `text-wrap: balance` on headline rows that may wrap, and pass the strings through `keepTogether`:

  ```js
  import { keepTogether } from './WrapUpText.js';
  body.textContent = keepTogether('Half your clock-ins were between 10 AM and 2 PM.');
  // "…between 10 AM" / "and 2 PM.": "10 AM" and "2 PM" can no longer be split
  ```
- **Reduced motion.** With the system's `prefers-reduced-motion` a card shows its final state at once; `duration`
  and `onComplete` keep the same 6 s.
- **Tokens and fonts.** Colors read the app's CSS variables named like the Figma tokens (`--brand-500`,
  `--olive-300`, `--emerald-500`, `--beige-50`, `--taupe-700`, …) and fall back to the Figma values. The font is
  `--wu-font-sans`, falling back to Rethink Sans, which the app is expected to load.

## FirstVisitCard

```js
import { mountFirstVisitCard } from './FirstVisitCard.js';
const card = mountFirstVisitCard(container, { date: '2026-03-04' });
card.play();
```

The calendar of screen 02, all in code: the sheets flip to the date, a marker circles the day, the "First visit"
sticker pops in. Frame 360 x 350, at `left: 0; top: 406px` on the Figma screen.

| Data | Type | |
| --- | --- | --- |
| `date` | `'YYYY-MM-DD'` | Day of the first visit. Read as a calendar day, independent of the device's time zone. |

Options: the shared ones, plus `labels` (`{ sticker: 'First visit' }`) and `assetBaseUrl` (folder of the sticker's
heart image; only needed if the bundler does not resolve `new URL('./assets/…', import.meta.url)`). The controller
also has `flipDates`, the dates on the sheets as `YYYY-MM-DD`.

Motion:

1. 0.4–1.0 s: the page stack slides in with 1 January on top.
2. 0.75–3.05 s: the sheets turn up over the hinge under the month stripe, at an even pace, each one starting
   before the one above it is gone (see "Page flip" above), until the date shows. Not every day gets a sheet:
   at most 7 flips, 0.29–0.42 s apart; with fewer flips the date shows earlier (a single flip is done at 1.3 s). The dates go forward through the year in uneven steps and no day number appears twice, so
   every flip shows a new number; the last two sheets before the date are always the two days before it
   (4 March: 1 Jan → 18 Jan → 27 Jan → 20 Feb → 2 Mar → 3 Mar → 4 Mar). A date early in January gets fewer
   flips (10 January: 1 → 5 → 8 → 9 → 10). The stripe shows the month of the sheet on top. 1 January itself
   gets one flip, from 31 December.
3. 3.1–3.8 s: the marker circle draws itself around the day and ends a little past its start. Its ends are
   rounded, like a real marker's. It is wider for a two-digit day.
4. 3.8–4.2 s: the sticker pops in with a small bounce, turning into its tilt.

Then the card holds until 6 s. With the system's `prefers-reduced-motion` the date, the circle and the sticker
are there at once.

## VisitsCount

```js
import { mountVisitsCount } from './VisitsCount.js';
const visits = mountVisitsCount(container, { visits: 214, personName: 'Rosa' });
visits.play();
```

The plaque and the sticker of screen 03. Frame 360 x 360, at `left: 0; top: 400px` on the Figma screen: the same
box as the door illustration (the app's MP4), so lay it over that.

| Data | Type | |
| --- | --- | --- |
| `visits` | `number` | Visits completed in the year. |
| `personName` | `string`, optional | Name on the sticker: "With Rosa". Without it there is no sticker. |

Options: the shared ones, plus `labels` (`{ visits: 'Visits', with: 'With' }`) and `assetBaseUrl` (folder of the
sticker's heart image; only needed if the bundler does not resolve `new URL('./assets/…', import.meta.url)`).

Motion: the plaque slides in at 0.4–0.9 s, the number counts from 0 at 1.0–2.5 s, the sticker pops in at 2.5 s.
Numbers of four and more digits are set smaller so they fit the plaque.

## HoursClock

```js
import { mountHoursClock } from './HoursClock.js';
const clock = mountHoursClock(container, { fullDays: 42, hours: 1011 });
clock.play();
```

The round clock of screen 04: the numerals 12, 3, 6 and 9, a ring with a progress arc, and the number of full
days in the middle. Frame 236 x 236, at `left: 62px; top: 489px` on the Figma screen. The sun, the moon and the
dotted orbit around the clock are the app's MP4.

| Data | Type | |
| --- | --- | --- |
| `fullDays` | `number` | Hours of care in full 24 h days, e.g. `Math.floor(hours / 24)`. The number in the middle. |
| `hours` | `number` | The same care in hours. Only used in the screen reader description. |

Options: the shared ones, plus `labels` (`{ fullDays: 'Full days', fullDay: 'Full day', hours: 'hours' }`).

Motion: the clock slides in at 0.4–0.9 s. From 0.7 s the arc goes round the ring like a hand, faster and faster,
one turn standing for one day (6 turns at most, so the eye can follow), while the number counts from 0 to
`fullDays`. Near the end the arc slows down and comes to rest where Figma has it, between the 5 and the 9, at
2.4 s. The ring is `--olive-500`, the arc `--brand-500`.

## BusiestMonthCard

```js
import { mountBusiestMonthCard } from './BusiestMonthCard.js';
const card = mountBusiestMonthCard(container, { visitsPerMonth: [14, 17, 19, 21, 20, 22, 23, 23, 21, 33, 18, 17], year: 2026 });
card.play(); // when the screen is in; all timings count from here
```

### Data

| Field | Type | |
| --- | --- | --- |
| `visitsPerMonth` | `number[12]` | Visits for January to December. |
| `year` | `number` | Shown in the pill, e.g. `2026`. |
| `weeks` | `{ label: string, value: number }[]`, optional | When passed, the bars are these weeks instead of months (8 in Figma), e.g. `{ label: '10/12', value: 9 }`. |

The card picks its variant from the data:

- `peak`: one busiest month.
- `tie`: several months share the maximum, all of them are highlighted.
- `steady`: `(max - min) / average < steadyThreshold`. The number is the monthly average, the unit "a month".
- `busiest_week`: `weeks` is passed.

### Options

| Option | Default | |
| --- | --- | --- |
| `onComplete` | none | Called when the screen's 6 s are up. |
| `autoplay` | `false` | Start right after mounting instead of waiting for `play()`. |
| `maxScale` | `1.15` | Largest scale relative to the Figma size. |
| `steadyThreshold` | `0.22` | See `steady` above. |
| `locale` | `'en-US'` | Month letters and number formatting. |
| `labels` | `{ visit: 'visit', visits: 'visits', perMonth: 'a month' }` | Unit texts. |
| `ariaLabel` | generated | Screen reader description of the card. |

### Returns

| Member | |
| --- | --- |
| `play(delay?)` | Starts after `delay` seconds. Resumes when paused, restarts when finished. |
| `pause()` | Freezes the animation, e.g. while the user holds the story. |
| `seek(t)` | Jumps to `t` seconds. |
| `destroy()` | Stops and removes the card from the container. |
| `duration` | `6`: the length of the whole screen in seconds. The animation is done by 2.8 s, then the card holds. |
| `analysis` | `{ variant, highlighted, primaryIndex, value, unit, bars, max, average }`. Use it to pick the headline, copy and month theme. With several equal maxima `primaryIndex` is the latest one. |

`analyzeBusiestMonthCard(data)` is also exported and returns the same analysis without mounting anything.

### Size

The card is the Figma "Months card" frame, 360 x 350. It scales as a whole to fit `container`, like
`object-fit: contain`: it keeps its proportions, is centred, and never grows beyond `maxScale`. Give the container
a width and a height. A container without a height gets one from the card (350 / 360 of its width). Bar heights
depend on the data only.

### Motion

Pages slide in at 0.4–1.0 s and three blank sheets flip off the front page at 0.2–1.35 s. Bars and the counter
start at 1.05 s, when the last sheet is see-through, and are done by 2.5 s; the busiest bar turns `brand-500` by
2.8 s. While the number counts, the unit ("visits") stays 8 px behind its last digit and moves with it; the
digits are tabular, so it does not jitter.
With the system's `prefers-reduced-motion` the card shows its final state at once; `duration` and `onComplete`
keep the same 6 s.

### Tokens and fonts

Colors read the app's CSS variables and fall back to the Figma values: `--brand-500`, `--olive-300`,
`--emerald-500`, `--beige-50`, `--taupe-700`. The font is `--wu-font-sans`, falling back to Rethink Sans, which
the app is expected to load.

## FallingLeaves

```js
import { mountFallingLeaves } from './FallingLeaves.js';
const leaves = mountFallingLeaves({ back: layerUnderCard, front: layerOverCard }, { month: 10, anchor: container });
leaves.play();
```

The month's watercolor pieces, falling slowly and looping for as long as the screen is shown. One instance draws
into two layers with a shared clock, in the layer order of Figma:

- `back`: the pieces Figma paints under the card's pages (one per month, the big one by the card's left edge), and
  the snow. Put this layer under the card.
- `front`: the pieces Figma paints over the card. Put this layer above the card and the text.

Each layer fills its element and clips to it, so make both cover the screen. Neither catches taps.

```html
<div class="screen">
  <div class="leaves-back"></div>   <!-- position: absolute; inset: 0 -->
  <!-- header, text -->
  <div class="card-container"></div> <!-- BusiestMonthCard -->
  <div class="leaves-front"></div>  <!-- position: absolute; inset: 0 -->
</div>
```

### Layers (first argument)

| Field | Type | |
| --- | --- | --- |
| `back` | `HTMLElement` | Layer under the card. |
| `front` | `HTMLElement` | Layer above the card. |

### Data

| Field | Type | |
| --- | --- | --- |
| `month` | `1`–`12` | January to December. Use `analysis.primaryIndex + 1` of the card. |
| `anchor` | `HTMLElement`, optional | The element BusiestMonthCard is mounted in. The pieces are arranged around the card as in Figma and scale with it. Without it the card is assumed to sit centred at the bottom of the layers, as on the Figma screen. |

| Month | Pieces |
| --- | --- |
| 1, 2, 12 | snow (all in `back`) |
| 3 | snowdrops |
| 4 | petals |
| 5 | lilac florets |
| 6 | daisies |
| 7 | fireworks |
| 8 | sunflower petals |
| 9, 10, 11 | leaves |

### Options

| Option | Default | |
| --- | --- | --- |
| `autoplay` | `false` | Start right after mounting instead of waiting for `play()`. |
| `maxScale` | `1.15` | Largest scale relative to the Figma size, the same as the card. |
| `assetBaseUrl` | `./assets/` next to the file | Folder with the images, ending in `/`. Only needed if the bundler does not resolve `new URL('./assets/…', import.meta.url)`. |

### Returns

| Member | |
| --- | --- |
| `ready` | `Promise<void>`: the month's sprites are downloaded and decoded. Await it together with the card's `ready`. |
| `play()` | Starts or resumes the loop. The layers fade in over 0.6 s. Before `ready` it waits for the sprites, 2 s at most. |
| `pause()` | Freezes it. |
| `seek(t)` | Jumps to `t` seconds after the start, e.g. `seek(0)` when the screen is shown again. |
| `destroy()` | Stops and removes both layers. |

### Motion

A falling piece comes down like a real leaf, swinging from side to side like a pendulum:

- it slows towards each end of a swing and is fastest through the middle, sideways and in its fall: at the ends
  it almost hangs in the air, through the middle it drops;
- it leans into the direction it is travelling, and tips over to the other side as it turns;
- now and then it turns in depth, so for a moment it is only a sliver wide, then faces the viewer again;
- every piece has its own tempo (one swing takes 2.5–4.2 s), reach (16–38 px to each side), fall speed and
  timing, drawn from a seed per piece, so no two move in step and a month looks the same every time.

That is how leaves (September to November) and petals (April, August) fall. Whole flowers are heavier: the
snowdrops of March, the lilac florets of May and the daisies of June come **straight down at an even speed**,
without hanging at the sides; they turn slowly around themselves (14–38 degrees a second, each in its own
direction and at its own pace), drift sideways only slightly and slowly, and never turn in depth.

The kind of motion still comes from the piece's Figma layer name:

- `(tumbles)`: leaves and petals fall at 50–70 px/s with wide swings and a turn in depth every 4–6 s;
  flowers at 58–78 px/s.
- `(sways)`: slower: leaves and petals at 40–54 px/s with gentler swings and fewer turns; flowers at
  48–62 px/s.
- `(lands last)`: comes down after the others and stays where Figma places it, by the card, landed by about
  5 s. A leaf or petal swings on the way and the swinging dies away as it slows; a flower comes straight
  down, turning ever more slowly.
- `(bursts)`, the July fireworks: opens in place, fades and comes back. It does not fall.
- Snow drifts straight down with a slight sway, smaller flakes slower.

Speeds are in Figma px and scale with the card. All of it is computed from the time since `play()` (GSAP is
only the clock), so `pause()`, `play()` and `seek(t)` never make a piece jump.

About 3 s after `play()` the looping pieces pass through their Figma positions, at their Figma angles. With the
system's `prefers-reduced-motion` nothing moves: every piece rests at its Figma position.

## PersonalityCard

```js
import { mountPersonalityCard } from './PersonalityCard.js';
const card = mountPersonalityCard(container, { type: 'early_bird', label: 'Earliest clock-in', value: '5:48', valueType: 'time', sub: 'AM · Tue, Mar 10', chip: 'Clocked in' });
card.play();
```

The stat card of screen 06. One component for all personality types: the layout is the same, the data differs.
Frame 360 x 350, at `left: 0; top: 413px` on the Figma screen. The scene behind the card is the app's MP4.

| Data | Type | |
| --- | --- | --- |
| `type` | `'early_bird' \| 'night_owl' \| 'midday_hero' \| 'rock' \| 'steady_one' \| 'every_day_hero' \| 'marathoner' \| 'weekend_warrior' \| 'juggler'` | Kept on the card as `data-type`. |
| `label` | `string` | Small title, shown in capitals: "Earliest clock-in". |
| `value` | `number \| string` | The big value, see below. |
| `valueType` | `'time' \| 'number' \| 'percent' \| 'duration'` | How `value` is read, counted and printed. |
| `sub` | `string` | Line under the value: "AM · Tue, Mar 10". |
| `chip` | `string` | Chip text: "Clocked in", "31 weeks". |
| `chipCheck` | `boolean`, optional | Check mark in the chip. Defaults to `true` for `early_bird` and `night_owl`, as in Figma. |

| `valueType` | `value` | Shown | Counts |
| --- | --- | --- | --- |
| `time` | `'5:48'`, `'11:42'` (as it should read) or minutes after midnight | `5:48` | minute by minute from `0:00` |
| `duration` | minutes (`440`) or `'7h 20m'` | `7h 20m` | minute by minute from `0h 0m` |
| `percent` | `38` | `38%` | from `0%` |
| `number` | `4` | `4` | from `0` |

Values longer than five characters, like "7h 20m", are set one size smaller, as in Figma.

Options: the shared ones. Motion: the page stack slides in at 0.4–1.0 s and three blank sheets flip off the front
page at 0.2–1.35 s; the value counts at 1.05–1.8 s, the chip pops in last, at 1.8–2.0 s.

## WeeksCard

```js
import { mountWeeksCard } from './WeeksCard.js';
const card = mountWeeksCard(container, { weeksInARow: 31, totalWeeks: 48 });
card.play();
```

The page of screen 07: the streak length, the legend and one square per week. Frame 360 x 350, at
`left: 0; top: 413px` on the Figma screen. The path with the stones behind the card is the app's MP4.

| Data | Type | |
| --- | --- | --- |
| `weeksInARow` | `number` | Length of the streak. |
| `totalWeeks` | `number` | Weeks in the grid: `48` for January to November, as in Figma. Rows of 8, up to 56. |
| `weeks` | `boolean[]`, optional | One entry per week, `true` when the week had a visit. Visited weeks outside the streak are drawn in the lighter green, and the streak sits on the longest run of `true`. Without it the streak is the last `weeksInARow` weeks and the other squares are empty. |

Options: the shared ones, plus `labels` (`{ week, weeks, legend: '1 = 1 week', from: 'Jan', to: 'Nov' }`; `to`
defaults to the month the last week falls in). The controller also has `streak`, `{ start, end }` as 0-based week
indexes.

Motion: the page stack with the grid slides in at 0.4–1.0 s and three blank sheets flip off the front page at
0.2–1.35 s; as the last one turns see-through (1.05 s) the streak starts to fill square by square in the brand color and the
number counts up with it, done by 2.0 s.

## CaredForCard

```js
import { mountCaredForCard } from './CaredForCard.js';
const card = mountCaredForCard({ names: namesSlot, sticker: handsContainer }, { people: [{ name: 'Rosa', visits: 152 }, { name: 'Daniel', visits: 62 }], since: '2026-03-04' });
card.play();
```

Screen 08 has its data in two places, so this card takes two elements instead of one container:

- `names`: a slot in the headline, under the tag. The rows with the highlighted names are drawn here. The block
  is as tall as its rows (45 px each, 10 px apart), so the text after it moves down with the number of people.
  Give the slot the width of the text column (`display: block; width: 100%`): a row with a long name and its
  badge that would be wider than the slot makes the whole block smaller until it fits.
  It is set in the headline's size and does not scale with a container; to scale it with the text, set
  `--wu-unit` (default `1px`) on the slot. The name uses `--wu-font-serif`, falling back to Hedvig Letters Serif.
- `sticker`: the box of the hands illustration (the app's MP4), frame 360 x 360 at `left: 0; top: 415px` on the
  Figma screen. The sticker is drawn over it and scales with it like the other cards. Leave it out for no sticker.

| Data | Type | |
| --- | --- | --- |
| `people` | `{ name: string, visits: number }[]` | One or more people, in display order. |
| `since` | `'YYYY-MM-DD'`, optional | Day of the first visit, for the sticker of the one-person variant. |

- One person: the name with a heart; the sticker reads "Since March 4". The visits are in the app's headline
  ("214 visits together"), not in the component.
- Several people: a row each, with a white badge that counts the visits; the sticker reads
  "2 people, 214 visits". Row colors follow Figma for the first two (`yellow-300`, `violet-300`) and continue
  with `violet-200`, `orange-200` and `olive-300`, then start over. The highlight keeps 10 px of padding on the
  left and 8 px on the right of the name.

Options: the shared ones (`maxScale` applies to the sticker), plus `labels`
(`{ visit, visits, since: 'Since', people: 'people' }`) and `assetBaseUrl` for the heart image.

Motion: rows slide in one by one from 0.6 s, 150 ms apart; the badge numbers count up until 2.0 s; the sticker
pops in at 2.0 s.

## PayCard

```js
import { mountPayCard } from './PayCard.js';
const card = mountPayCard(container, { earned: 14860, paychecks: 26, year: 2026 }, { onRevealed: () => rain.play() });
card.play();
```

The scratch card of screen 09. Frame 328 x 220, at `left: 16px; top: 452px` on the Figma screen. The two side
notches are real holes, so the screen's background shows through them.

| Data | Type | |
| --- | --- | --- |
| `earned` | `number` | Amount earned in the year, in whole dollars. |
| `paychecks` | `number` | For the line "across 26 paychecks in 2026". |
| `year` | `number`, optional | Defaults to the current year. |

| Option | Default | |
| --- | --- | --- |
| `onRevealed` | none | Called once when the amount is revealed. Start MoneyRain and resume the story here. |
| `revealAt` | `0.6` | Share of the cover that has to be wiped before the rest is revealed. |
| `currency` | `'USD'` | ISO currency code for the amount. |
| `labels` | `{ scratch: 'Scratch or tap to reveal', paychecks: 'across {paychecks} paychecks in {year}' }` | Texts. |

Plus the shared options. The controller has the shared members and `reveal()` (reveals without scratching) and
`revealed`.

How it runs:

1. `play()`: the card slides in with a small tilt at 0.4–1.0 s, then **waits**. The story should pause here.
   `play()` does not move it past this point.
2. The user wipes the cover with a finger or the mouse. The cover is a canvas; the brush is soft with a slightly
   irregular edge. Under it the real amount is printed, as on a paper scratch card. A tap, Enter or Space on the
   cover reveals it as well. Pointer events on the cover do not bubble, so scratching cannot trigger the story's
   tap navigation.
3. At 60 % wiped (`revealAt`) the rest of the cover disappears by itself in a quick 0.2 s fade, `onRevealed`
   fires and the amount counts up from $0 to the full amount (1.8 s). Start MoneyRain in `onRevealed`.
4. The timeline then runs on to its 6 s, and `onComplete` fires 5 s after the reveal.

`seek(t)` below 1 s brings back a fresh cover; above 1 s it shows the revealed state.

The amount is private. Nothing in these components exports it: `ThankYouCard.exportImage()` has no access to it,
and the card's root carries `data-private="true"` in case the app builds its own share image from the DOM.

With the system's `prefers-reduced-motion` the card is in place at once, still waits for the scratch, and shows
the amount without counting.

## MoneyRain

```js
import { mountMoneyRain } from './MoneyRain.js';
const rain = mountMoneyRain(layerOverScreen, { origin: container });
// later, from PayCard's onRevealed: rain.play();
```

Bills and coins burst out from behind the amount and spread over the **whole screen**, to the places they have
in the Figma frame "09 Pay · Revealed · Money rain" (from the header down to the bottom edge, at that density);
then they fall like confetti (turning, flipping, swaying, each at its own speed) and have left through the
bottom 3.4 s after `play()`. One canvas that fills `layerOverScreen`; everything is drawn in code, there are no
images. Make the layer cover the whole phone screen (`position: absolute; inset: 0`), above the card, the header
and the text: a layer that only covers the card would clip the rain. It does not catch taps.

There is no data. Shapes and colors are the Figma ones: 9 bills (`--olive-300`, lines and "$" in `--brand-500`)
and 9 coins (`--yellow-400`, inner disc `--yellow-300`, "$" in `--yellow-700`).

| Option | Default | |
| --- | --- | --- |
| `origin` | none | Element the burst starts from, e.g. PayCard's container. It only sets the starting point, not the area. Without it: the middle of the layer, 70 % down. |
| `autoplay` | `false` | Start right after mounting. |
| `onComplete` | none | Called when the rain is over. |
| `maxScale` | `1.15` | Largest scale relative to the Figma size. |

| Returns | |
| --- | --- |
| `ready` | Resolved from the start: there are no images. |
| `play()` | Starts the burst, or resumes it when paused. After it has finished, starts a new one. |
| `pause()` | Freezes it. |
| `destroy()` | Stops and removes the layer. |

With the system's `prefers-reduced-motion` there is no rain: `play()` only calls `onComplete`.

## TopCaregiverCard

```js
import { mountTopCaregiverCard } from './TopCaregiverCard.js';
const card = mountTopCaregiverCard(container, { topPercent: 10 });
card.play();
```

The rank card of screen 10: all caregivers by hours of care, with the caregiver's group highlighted. Frame
360 x 350, at `left: 0; top: 413px` on the Figma screen. The watercolor summit behind the card is the app's MP4.

| Data | Type | |
| --- | --- | --- |
| `topPercent` | `number` | `10` for "Top 10%". |
| `distribution` | `number[]`, optional | How many caregivers fall into each band of hours, fewest hours first. Any positive numbers; the tallest bar is scaled to the chart. Defaults to the 20-bar curve drawn in Figma. |

The rightmost `topPercent` % of the bars (2 of 20 for the top 10 %) turn `brand-500`, and the "You" pin stands on
the first of them. The controller also has `topBars`.

Options: the shared ones, plus `labels`
(`{ top: 'Top', chip: 'by hours', fewer: 'Fewer hours', more: 'More hours', you: 'You' }`).

Motion: the page stack slides in at 0.4–1.0 s; bars grow from 0.8 s; the number counts down from "Top 100%" to
its value by 2.0 s; then the top bars turn green and the pin drops in with a bounce, done by 2.5 s.

## ThankYouCard

```js
import { mountThankYouCard } from './ThankYouCard.js';
const card = mountThankYouCard(container, { name: 'Maria', since: '2026-03-04', visits: 214, personName: 'Rosa', hours: 1011, fullDays: 42, weeksInARow: 31, personality: 'The Early Bird', earliestClockIn: '5:48 AM' });
card.play();
```

The four tiles of screen 11. Frame 328 x 416, at `left: 16px; top: 266px` on the Figma screen. The headline above
and the Share / Watch again buttons below are the app's.

| Data | Type | |
| --- | --- | --- |
| `name` | `string` | The caregiver's first name. Only on the share image: "Maria’s year in care". |
| `since` | `'YYYY-MM-DD'` | Day of the first visit. Only on the share image: "Caring for Rosa since March 4". |
| `visits` | `number` | Big number of the green tile. |
| `personName` | `string`, optional | "visits with Rosa". Without it the line is just "visits", and the share image has no "Caring for … since …" line. |
| `hours` | `number` | Number of the violet tile. |
| `fullDays` | `number` | Its small title: "42 FULL DAYS". |
| `weeksInARow` | `number` | Number of the yellow tile. |
| `personality` | `string` | Name as it should read: "The Early Bird". |
| `earliestClockIn` | `string` | "5:48 AM", for the line "Earliest clock-in at 5:48 AM". |

Options: the shared ones (no `ariaLabel`: the tiles are real text), plus `labels`
(`youWereThere`, `visit`, `visits`, `with`, `fullDays: '{days} full days'`, `hours`, `weeks`, `inARow`,
`personalityTitle`, `personalityNote: 'Earliest clock-in at {time}'`, and for the share image
`shareTag: 'Wrap Up 2026'`, `shareTitle: '{name}’s year in care'`, `shareSite: 'brevy.com'`,
`shareSince: 'Caring for {name} since {date}'`). For a personality that is not about a time, pass your own
`personalityNote`.

Numbers with more digits than a tile is wide, and long personality names, are set smaller so they fit.

Motion: tiles pop in one by one from 0.4 s (scale 0.9 → 1 and fade, 120 ms apart); the numbers count up until
1.6 s.

### Sharing

```js
const blob = await card.exportImage();           // PNG, 1080 x 1920 (9:16)
const file = new File([blob], 'brevy-wrap-up.png', { type: 'image/png' });
// write the file with @capacitor/filesystem and pass its uri to Share.share({ files: [uri] })
```

`exportImage({ scale })` draws the share image on a canvas, after the Figma frame "Base / 11 Share image"
(360 x 640, 9:16), on `emerald-500`:

- top: the Brevy logo on the left, the tag "Wrap Up 2026" (`olive-300`) on the right;
- the headline "{name}’s year in care" (Hedvig Letters Serif, `beige-50`); a long name is set smaller so the
  line still fits;
- the four tiles with their final numbers, as on the screen (scaled to the image's 320 px column);
- bottom: "brevy.com" on the left and "Caring for {personName} since {date}" on the right (`olive-300`); the
  date is printed like "March 4" in the card's `locale`.

No buttons. It never contains the pay amount: the card does not receive it. `scale` is pixels per Figma px
(default `3`, which gives 1080 x 1920). The image uses the app's fonts and color tokens; call it when the fonts
are loaded (it waits for them itself) and at any time after mounting, also mid-animation.

## SoundButton

```js
import { mountSoundButton } from './SoundButton.js';
const sound = mountSoundButton(slotLeftOfClose, { muted: player.muted, onChange: (muted) => (player.muted = muted) });
```

The mute / unmute button of the story's header, Figma "Sound button": 36 x 36 like Close, with an 18 px icon
(a speaker with waves, or a speaker with an X when muted; 1.75 px round strokes like the X of Close). Put it
left of Close, 8 px apart (`display: flex; gap: 8px`). It is a real `<button>`: a tap, Enter or Space switches
the state. Taps do not bubble, so they cannot trigger the story's tap navigation.

It only shows and reports the state. There is no audio in the component: mute and unmute the app's music in
`onChange`.

| Option | Default | |
| --- | --- | --- |
| `muted` | `false` | State to start in. |
| `tone` | `'light'` | `'light'` on the light screens, `'dark'` on the emerald ones (09, 10, 11): fill and icon color follow the Close button. |
| `onChange` | none | `(muted: boolean) => void`, called when the user taps the button or `toggle()` is called. |
| `labels` | `{ mute: 'Mute music' }` | Name for screen readers; the button's pressed state (`aria-pressed`) says whether it is muted. |

| Returns | |
| --- | --- |
| `muted` | The current state, `true` when muted. |
| `setMuted(muted)` | Shows a state **without** calling `onChange`: use it when the app changes the music by itself. |
| `toggle()` | Switches the state like a tap, and calls `onChange`. |
| `setTone(tone)` | Switches fill and icon color when the story moves between light and dark screens. |
| `destroy()` | Removes the button. |

**State across screens.** Mount the button once in a header that stays while the screens change, and call
`setTone` on each screen: the state is kept. If the header is rebuilt per screen, keep the state in the app and
pass it back in as `muted`.

| Tone | Fill | Icon |
| --- | --- | --- |
| `light` | `beige-50` at 70 % | `--emerald-500` |
| `dark` | `beige-50` at 15 % | `--beige-50` |

Both with a 6 px background blur, as Close has in Figma. To use other colors, set `--wu-sound-fill` and
`--wu-sound-icon` on the slot. The button is set in px like the rest of the header; set `--wu-unit` to scale it.
The element also carries `data-state="muted" | "unmuted"`.
