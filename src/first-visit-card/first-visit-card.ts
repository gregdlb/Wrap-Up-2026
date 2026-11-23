import { createCardShell, element } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { SCREEN_SECONDS } from '../shared/counter';
import { flipSchedule } from '../shared/flips';
import { trackImages } from '../shared/images';
import { addPagesIn, createPages } from '../shared/pages';
import { addStickerPop, createSticker } from '../shared/sticker';
import { ensureStyles } from '../shared/styles';

export interface FirstVisitCardData {
  /** Day of the first visit as `YYYY-MM-DD`, e.g. "2026-03-04". */
  date: string;
}

export interface FirstVisitCardLabels {
  /** Text of the sticker. */
  sticker: string;
}

export interface FirstVisitCardOptions extends WrapUpOptions {
  /** Locale for the month and weekday names. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<FirstVisitCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export interface FirstVisitCardController extends WrapUpController {
  /** The dates the calendar flips through, as `YYYY-MM-DD`: the first one is on top at the start, the last is `date`. */
  readonly flipDates: string[];
}

const DEFAULT_LABELS: FirstVisitCardLabels = { sticker: 'First visit' };

/** The Figma "Calendar · stripe" frame. */
const FRAME = { width: 360, height: 350 };
const MS_PER_DAY = 86_400_000;

/**
 * The calendar flips from 1 January to the date: sheets turn up over the hinge under the month stripe,
 * each one faster than the one before. Seconds are counted from `play()`.
 */
const FLIP = {
  startAt: 0.9,
  endAt: 2.0,
  /** A flip never takes longer than this, so one or two flips stay short. */
  longest: 0.42,
  /** Each flip takes this share of the time of the one before. */
  speedUp: 0.85,
  /** At most this many flips. */
  most: 7,
  /** Days right before the date that get a sheet of their own, day after day. */
  daysBefore: 2,
  /** Between 1 January and those days: one more stop for every so many days, as far as `most` allows. */
  daysPerStop: 20,
  /** Days each stop is moved off an even spread, so the numbers do not look like a pattern. */
  uneven: [2, -4, 5, -3],
  /** Degrees a sheet turns; from `fadeFrom` on it fades, edge-on to the viewer. */
  angle: 100,
  fadeFrom: 80,
};

/**
 * The hand-drawn marker circle around the day, from Figma: an open loop that ends a little past its start.
 * Drawn in a 178.808 x 110.928 box, tilted, centred on the day. Two digits get a wider loop.
 */
const MARKER = {
  at: 2.1,
  duration: 0.7,
  path: [
    ['M', 74.1051, 9.47798],
    ['C', 123.202, 1.29514, 172.299, 17.6608, 172.299, 53.1198],
    ['C', 172.299, 91.3064, 117.747, 110.4, 74.1051, 107.672],
    ['C', 27.7357, 104.944, 0.45959, 83.1235, 3.1872, 53.1198],
    ['C', 5.91482, 23.116, 46.829, 6.75036, 101.381, 4.02275],
    ['C', 134.113, 1.29514, 155.934, 4.02275, 177.754, 12.2056],
  ] as const,
  width: 178.808,
  height: 110.928,
  strokeWidth: 6,
  tilt: 9,
  /** Centre on the front page. */
  x: 105.54,
  y: 128.34,
  /** Horizontal stretch by the number of digits of the day. */
  stretch: { 1: 1, 2: 1.1445 } as Record<number, number>,
};

/** The "First visit" sticker: unrotated top left corner in the frame, its tilt, and how far it turns popping in. */
const STICKER = { at: 2.8, duration: 0.4, x: 233.48, y: 50.5, tilt: 6, turn: 18, shadow: { y: 12, blur: 20 } };

/** Text positions are on the front page (214 x 236); the sheet that flips is the page below the 52 px stripe. */
const STYLES = /* css */ `
.wu-first-visit-card .wu-page--front {
  perspective: calc(600 * var(--wu-u));
  perspective-origin: 50% calc(52 * var(--wu-u));
}

.wu-first-visit-card__stripe {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(52 * var(--wu-u));
  border-radius: calc(14 * var(--wu-u)) calc(14 * var(--wu-u)) 0 0;
  background: var(--brand-500, #066e3d);
}

.wu-first-visit-card__text {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}

.wu-first-visit-card__month {
  top: calc(20 * var(--wu-u));
  color: var(--beige-50, #fefdfc);
  font-size: calc(13 * var(--wu-u));
  font-weight: 700;
  letter-spacing: calc(2.34 * var(--wu-u));
  text-transform: uppercase;
}

.wu-first-visit-card__day {
  top: calc(83 * var(--wu-u));
  color: var(--emerald-500, #023620);
  font-size: calc(96 * var(--wu-u));
  font-weight: 800;
}

.wu-first-visit-card__weekday {
  top: calc(194 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(16 * var(--wu-u));
  font-weight: 500;
}

/* The sheet being turned: hinged on its top edge, right under the stripe. */
.wu-first-visit-card__leaf {
  position: absolute;
  left: 0;
  top: calc(52 * var(--wu-u));
  width: 100%;
  bottom: 0;
  overflow: hidden;
  border-radius: 0 0 calc(14 * var(--wu-u)) calc(14 * var(--wu-u));
  background: var(--beige-50, #fefdfc);
  transform-origin: 50% 0;
  transform: rotateX(calc(var(--wu-flip, 0) * 1deg));
}

.wu-first-visit-card__leaf .wu-first-visit-card__day {
  top: calc(31 * var(--wu-u));
}

.wu-first-visit-card__leaf .wu-first-visit-card__weekday {
  top: calc(142 * var(--wu-u));
}

/* Light falls off the sheet as it lifts. */
.wu-first-visit-card__leaf-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.05), rgba(3, 26, 13, 0.3));
}

/* And the lifted sheet shades the one below, strongest at the hinge. */
.wu-first-visit-card__hinge-shadow {
  position: absolute;
  left: 0;
  top: calc(52 * var(--wu-u));
  width: 100%;
  height: calc(70 * var(--wu-u));
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.16), rgba(3, 26, 13, 0));
}

.wu-first-visit-card__marker {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-u));
  overflow: visible;
  transform: rotate(calc(var(--wu-tilt) * 1deg));
}

.wu-first-visit-card__marker path {
  fill: none;
  stroke: var(--olive-500, #d7e4c9);
  stroke-dasharray: 100;
  /* Rounded ends, like the tip of a real marker. */
  stroke-linecap: round;
}
`;

interface Sheet {
  iso: string;
  month: string;
  day: string;
  weekday: string;
}

/** Reads `YYYY-MM-DD` as a calendar day, independent of the device's time zone. */
function parseDay(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!day || Number.isNaN(day.getTime())) throw new Error(`FirstVisitCard: date must be YYYY-MM-DD, got "${date}"`);
  return day;
}

const addDays = (day: Date, count: number) => new Date(day.getTime() + count * MS_PER_DAY);

/**
 * The dates on the sheets, from the one on top at the start to the first visit.
 * They go forward through the year in uneven steps and no day number appears twice, so every flip shows
 * a new number: for 4 March that is 1 Jan, 18 Jan, 27 Jan, 20 Feb, 2 Mar, 3 Mar, 4 Mar. The last two sheets
 * before the date are always the two days before it. A date early in January gets fewer sheets.
 * 1 January itself gets a single flip, from 31 December.
 */
function sheetDates(target: Date): Date[] {
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  if (target.getTime() === start.getTime()) return [addDays(start, -1), target];

  const near: Date[] = [];
  for (let back = FLIP.daysBefore; back >= 1; back--) {
    const day = addDays(target, -back);
    if (day > start) near.push(day);
  }

  // Days of the year that lie strictly between 1 January and the first of the days before the date.
  const free = Math.round(((near[0] ?? target).getTime() - start.getTime()) / MS_PER_DAY) - 1;
  const count = Math.min(FLIP.most - 1 - near.length, Math.ceil(free / FLIP.daysPerStop));
  const step = (free + 1) / (count + 1);
  const taken = new Set([start, ...near, target].map((day) => day.getUTCDate()));
  const stops: Date[] = [];
  let after = 0;
  for (let index = 0; index < count; index++) {
    // Evenly spread, nudged off the grid; never so late that the stops still to come have no day left.
    const nudge = Math.round(FLIP.uneven[index % FLIP.uneven.length]! * Math.min(1, step / 15));
    const latest = free - (count - 1 - index);
    const ideal = Math.min(Math.max(Math.round(step * (index + 1)) + nudge, after + 1), latest);
    // The closest day whose number is not on another sheet.
    for (let shift = 0; shift <= free; shift = shift > 0 ? -shift : 1 - shift) {
      const offset = ideal + shift;
      if (offset <= after || offset > latest) continue;
      const day = addDays(start, offset);
      if (taken.has(day.getUTCDate())) continue;
      taken.add(day.getUTCDate());
      stops.push(day);
      after = offset;
      break;
    }
  }
  return [start, ...stops, ...near, target];
}

function markerPath(stretch: number): string {
  const centre = MARKER.width / 2;
  return MARKER.path
    .map(([command, ...numbers]) => {
      const points = numbers.map((value, index) => (index % 2 === 0 ? centre + (value - centre) * stretch : value));
      return `${command}${points.map((value) => value.toFixed(3)).join(' ')}`;
    })
    .join('');
}

function createMarker(digits: number): { marker: SVGSVGElement; line: SVGPathElement } {
  const stretch = MARKER.stretch[digits] ?? MARKER.stretch[2]!;
  const namespace = 'http://www.w3.org/2000/svg';
  const marker = document.createElementNS(namespace, 'svg');
  marker.setAttribute('class', 'wu-first-visit-card__marker');
  marker.setAttribute('viewBox', `0 0 ${MARKER.width} ${MARKER.height}`);
  marker.setAttribute('aria-hidden', 'true');
  marker.style.setProperty('--x', String(MARKER.x - MARKER.width / 2));
  marker.style.setProperty('--y', String(MARKER.y - MARKER.height / 2));
  marker.style.setProperty('--w', String(MARKER.width));
  marker.style.setProperty('--h', String(MARKER.height));
  marker.style.setProperty('--wu-tilt', String(MARKER.tilt));

  const line = document.createElementNS(namespace, 'path');
  line.setAttribute('d', markerPath(stretch));
  line.setAttribute('stroke-width', String(MARKER.strokeWidth));
  // The dash pattern is given in hundredths of the line, whatever its real length.
  line.setAttribute('pathLength', '100');
  marker.append(line);
  return { marker, line };
}

/**
 * Mounts the 02 "First visit" calendar into `el` and scales it to fit that element.
 * The calendar flips from 1 January to `data.date`, a marker circles the day, and the "First visit" sticker pops in.
 */
export function mountFirstVisitCard(
  el: HTMLElement,
  data: FirstVisitCardData,
  options: FirstVisitCardOptions = {},
): FirstVisitCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale, ariaLabel, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const target = parseDay(data.date);
  const format = (day: Date, parts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...parts, timeZone: 'UTC' }).format(day);
  const sheets: Sheet[] = sheetDates(target).map((day) => ({
    iso: day.toISOString().slice(0, 10),
    month: format(day, { month: 'long', year: 'numeric' }),
    day: format(day, { day: 'numeric' }),
    weekday: format(day, { weekday: 'long' }),
  }));
  const last = sheets.length - 1;
  // One or two flips stay short instead of filling the whole window.
  const schedule = flipSchedule(last, Math.min(FLIP.endAt - FLIP.startAt, last * FLIP.longest), FLIP.speedUp);
  const flipSeconds = schedule.reduce((all, flip) => all + flip.duration, 0);

  ensureStyles('first-visit-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-first-visit-card',
    frame: FRAME,
    maxScale,
    ariaLabel: ariaLabel ?? format(target, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  });
  const pages = createPages(shell.stage);
  pages.all.forEach((page) => page.append(element('wu-first-visit-card__stripe')));

  const text = (name: string) => element(`wu-first-visit-card__text wu-first-visit-card__${name}`);
  const month = text('month');
  const under = { day: text('day'), weekday: text('weekday') };
  const turning = { day: text('day'), weekday: text('weekday') };
  const { marker, line } = createMarker(sheets[last]!.day.length);
  const hingeShadow = element('wu-first-visit-card__hinge-shadow');
  const leaf = element('wu-first-visit-card__leaf');
  const leafShade = element('wu-first-visit-card__leaf-shade');
  leaf.append(turning.day, turning.weekday, leafShade);
  pages.front.append(month, marker, under.day, under.weekday, hingeShadow, leaf);

  const sticker = createSticker({ text: labels.sticker, ...STICKER, assetBaseUrl });
  shell.stage.append(sticker);

  const write = (node: HTMLElement, value: string) => {
    if (node.textContent !== value) node.textContent = value;
  };

  /**
   * Shows the calendar `seconds` into the flipping: which sheet is turning and how far,
   * what is printed on it and on the sheet below, and the month on the stripe.
   */
  const showFlip = (seconds: number) => {
    const index = schedule.findIndex((flip) => seconds < flip.at + flip.duration);
    const resting = seconds <= 0 || index < 0;
    const below = sheets[resting ? (seconds <= 0 ? 0 : last) : index + 1]!;
    write(under.day, below.day);
    write(under.weekday, below.weekday);

    if (resting) {
      write(month, below.month);
      leaf.style.opacity = '0';
      hingeShadow.style.opacity = '0';
      return;
    }
    const flip = schedule[index]!;
    const top = sheets[index]!;
    const progress = Math.min(Math.max((seconds - flip.at) / flip.duration, 0), 1);
    const angle = FLIP.angle * Math.pow(progress, 1.6);
    write(turning.day, top.day);
    write(turning.weekday, top.weekday);
    write(month, progress < 0.5 ? top.month : below.month);
    leaf.style.setProperty('--wu-flip', angle.toFixed(2));
    leaf.style.opacity = String(Math.min(Math.max((FLIP.angle - angle) / (FLIP.angle - FLIP.fadeFrom), 0), 1));
    leafShade.style.opacity = String(Math.sin((Math.min(angle, 90) * Math.PI) / 180));
    hingeShadow.style.opacity = String(Math.sin(progress * Math.PI));
  };

  // GSAP writes through the setter on every render, so the sheets also follow seek() and rewinds.
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next: number) {
      flipped = next;
      showFlip(next);
    },
  };

  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  timeline
    .fromTo(flipping, { seconds: 0 }, { seconds: flipSeconds, duration: flipSeconds, ease: 'none' }, FLIP.startAt)
    .fromTo(marker, { opacity: 0 }, { opacity: 1, duration: 0.01 }, MARKER.at)
    .fromTo(
      line,
      { strokeDashoffset: 100 },
      { strokeDashoffset: 0, duration: MARKER.duration, ease: 'power1.inOut' },
      MARKER.at,
    );
  addStickerPop(timeline, sticker, STICKER.at, { duration: STICKER.duration, turn: STICKER.turn });

  const controller = createController({
    timeline,
    ready: trackImages(shell.root.querySelectorAll('img')),
    onComplete,
    onDestroy: shell.remove,
  });
  const card = Object.defineProperty(controller, 'flipDates', {
    value: sheets.map((sheet) => sheet.iso),
    enumerable: true,
  }) as FirstVisitCardController;

  if (autoplay) card.play();
  return card;
}
