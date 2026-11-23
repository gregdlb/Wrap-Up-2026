import { createCardShell, element } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../shared/counter';
import { observeSize } from '../shared/fit';
import { trackImages } from '../shared/images';
import { addStickerPop, createSticker, heartUrl } from '../shared/sticker';
import { ensureStyles } from '../shared/styles';

export interface CaredForPerson {
  /** First name, shown in the highlight. */
  name: string;
  /** Visits with this person in the year. */
  visits: number;
}

export interface CaredForCardData {
  /** One or more people, in the order they should appear (most visits first). */
  people: CaredForPerson[];
  /** Day of the first visit as `YYYY-MM-DD`. With one person the sticker reads "Since March 4". */
  since?: string;
}

export interface CaredForCardTargets {
  /**
   * Goes into the headline area, in the text flow under the tag: the name rows are drawn here.
   * The block is as tall as its rows; text placed after it moves down with the number of people.
   */
  names: HTMLElement;
  /** Covers the hands illustration (the 360 x 360 frame): the sticker is drawn here. Leave out for no sticker. */
  sticker?: HTMLElement;
}

export interface CaredForCardLabels {
  visit: string;
  visits: string;
  /** Word before the date on the sticker: "Since March 4". */
  since: string;
  /** Word after the count on the sticker for several people: "2 people, 214 visits". */
  people: string;
}

export interface CaredForCardOptions extends WrapUpOptions {
  /** Locale for the date and number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<CaredForCardLabels>;
  /** Largest scale of the sticker layer relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export type CaredForCardController = WrapUpController;

const DEFAULT_LABELS: CaredForCardLabels = { visit: 'visit', visits: 'visits', since: 'Since', people: 'people' };

/** The Figma "Who · hands card" frame, which holds the hands illustration (the app's MP4) and the sticker. */
const STICKER_FRAME = { width: 360, height: 360 };
const STICKER = { x: 39.37, y: 285.01, tilt: 2 };

/**
 * Highlight and text color of each row, as CSS variables with the Figma values.
 * The first two are the rows drawn in Figma; from the third person on they continue in the Brevy palette.
 */
const ROW_COLORS = [
  ['var(--yellow-300, #fbd48a)', 'var(--yellow-900, #734c1b)'],
  ['var(--violet-300, #ddcefe)', 'var(--violet-900, #5e528c)'],
  ['var(--violet-200, #e9deff)', 'var(--violet-900, #5e528c)'],
  ['var(--orange-200, #fbd2b8)', 'var(--orange-900, #6f3313)'],
  ['var(--olive-300, #dce7cf)', 'var(--brand-600, #055e34)'],
] as const;

/**
 * Seconds from `play()`: rows slide in one by one from 0.6 s, their numbers count up until 2.0 s,
 * the sticker pops in at 2.0 s.
 */
const TIMING = { rows: { at: 0.6, stagger: 0.15, duration: 0.4, offsetX: -16 }, countEndAt: 2.0, sticker: 2.0 };

/**
 * The names sit in the headline, so they are set in the headline's own size: one unit is 1 px,
 * or `--wu-unit` when the host scales its text. `--wu-fit` makes the block smaller when a long name
 * would not fit the slot.
 */
const STYLES = /* css */ `
.wu-cared-for-names {
  --wu-u: calc(var(--wu-unit, 1px) * var(--wu-fit, 1));

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(10 * var(--wu-u));
  font-family: var(--wu-font-sans, 'Rethink Sans', system-ui, sans-serif);
  font-synthesis: none;
  -webkit-user-select: none;
  user-select: none;
}

.wu-cared-for-names__row {
  display: flex;
  align-items: center;
  gap: calc(10 * var(--wu-u));
  padding: calc(2 * var(--wu-u)) calc(8 * var(--wu-u)) 0 calc(10 * var(--wu-u));
  border-radius: calc(4 * var(--wu-u));
  background: var(--wu-row-bg);
  white-space: nowrap;
  transform: translate3d(calc(var(--wu-x, 0) * var(--wu-u)), 0, 0);
}

.wu-cared-for-names__row--single {
  gap: calc(8 * var(--wu-u));
  padding-right: calc(10 * var(--wu-u));
}

.wu-cared-for-names__name {
  color: var(--wu-row-color);
  font-family: var(--wu-font-serif, 'Hedvig Letters Serif', Georgia, serif);
  font-size: calc(40 * var(--wu-u));
  font-weight: 400;
  letter-spacing: calc(-0.4 * var(--wu-u));
  line-height: 1.08;
}

/* The watercolor heart sits in a slightly larger box because it is tilted by 2 degrees. */
.wu-cared-for-names__heart {
  display: block;
  width: calc(var(--wu-heart) * var(--wu-u));
  height: calc(var(--wu-heart) * var(--wu-u));
  margin: calc(var(--wu-heart) * 0.0172 * var(--wu-u));
  transform: rotate(2deg) scale(var(--wu-pop, 1));
}

.wu-cared-for-names__badge {
  display: flex;
  align-items: center;
  gap: calc(4 * var(--wu-u));
  padding: calc(4 * var(--wu-u)) calc(10 * var(--wu-u)) calc(4 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--beige-50, #fefdfc);
  color: var(--emerald-500, #023620);
  font-size: calc(14 * var(--wu-u));
  font-weight: 600;
  line-height: calc(18 * var(--wu-u));
}

/* The word follows the number as it counts; tabular digits keep it from jittering. */
.wu-cared-for-names__count {
  font-variant-numeric: tabular-nums;
}
`;

function heartImage(size: number, assetBaseUrl: string | undefined): HTMLImageElement {
  const image = document.createElement('img');
  image.className = 'wu-cared-for-names__heart';
  image.style.setProperty('--wu-heart', String(size));
  image.alt = '';
  image.draggable = false;
  image.src = heartUrl(assetBaseUrl);
  return image;
}

/** Reads `YYYY-MM-DD` as a calendar day and prints it like "March 4". */
function formatDay(date: string, locale: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(day);
}

/**
 * Mounts the 08 "Who you cared for" pieces: the name rows into `targets.names` (the headline area)
 * and the sticker into `targets.sticker` (over the hands illustration). One controller runs both.
 *
 * One person gets a highlighted name with a heart and the sticker "Since March 4".
 * Several people get a row each, with a badge that counts their visits, and the sticker "2 people, 214 visits".
 */
export function mountCaredForCard(
  targets: CaredForCardTargets,
  data: CaredForCardData,
  options: CaredForCardOptions = {},
): CaredForCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const people = data.people.map((person) => ({ name: person.name, visits: Math.max(0, Math.round(person.visits)) }));
  const single = people.length === 1;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));
  const visitsLabel = (count: number) => (count === 1 ? labels.visit : labels.visits);
  const timeline = holdTimeline(SCREEN_SECONDS);

  ensureStyles('cared-for-card', STYLES);
  const names = element('wu-cared-for-names');
  /** The counting numbers with their final texts, which decide how wide a row gets. */
  const counts: { node: HTMLElement; final: string }[] = [];
  const rows = people.map((person, index) => {
    const [background, color] = ROW_COLORS[index % ROW_COLORS.length]!;
    const row = element(`wu-cared-for-names__row${single ? ' wu-cared-for-names__row--single' : ''}`);
    row.style.setProperty('--wu-row-bg', background);
    row.style.setProperty('--wu-row-color', color);
    row.append(element('wu-cared-for-names__name', person.name));
    const arrivesAt = TIMING.rows.at + TIMING.rows.stagger * index;

    if (single) {
      const heart = heartImage(30, assetBaseUrl);
      row.append(heart);
      timeline.fromTo(heart, { '--wu-pop': 0 }, { '--wu-pop': 1, duration: 0.35, ease: 'back.out(2.2)' }, arrivesAt + 0.3);
    } else {
      const count = document.createElement('span');
      count.className = 'wu-cared-for-names__count';
      count.textContent = '0';
      const text = document.createElement('span');
      // A no-break space: the number and its word stay on one line.
      text.append(count, `\u00a0${visitsLabel(person.visits)}`);
      const badge = element('wu-cared-for-names__badge');
      badge.append(heartImage(16, assetBaseUrl), text);
      row.append(badge);
      counts.push({ node: count, final: format(person.visits) });
      const countAt = arrivesAt + TIMING.rows.duration / 2;
      addCounter(timeline, count, person.visits, { at: countAt, duration: TIMING.countEndAt - countAt, format });
    }
    return row;
  });
  names.append(...rows);
  targets.names.append(names);

  /**
   * A long name must not run out of the slot: when the widest row, with its final number, is wider than
   * the slot, the whole block is set smaller so that it fits. A slot that takes its width from the names
   * (inline, or shrink-to-fit) never limits them.
   */
  const fitNames = () => {
    names.style.setProperty('--wu-fit', '1');
    const shown = counts.map(({ node }) => node.textContent);
    counts.forEach(({ node, final }) => (node.textContent = final));
    // Both measured with the final numbers, so a slot that hugs the names is exactly as wide as they are.
    const room = targets.names.clientWidth;
    const widest = Math.max(0, ...rows.map((row) => row.offsetWidth));
    counts.forEach(({ node }, index) => (node.textContent = shown[index] ?? ''));
    if (room > 0 && widest > room) names.style.setProperty('--wu-fit', String(Math.floor((room / widest) * 1000) / 1000));
  };
  let slotWidth = -1;
  const stopFitting = observeSize(targets.names, ({ width }) => {
    if (width === slotWidth) return;
    slotWidth = width;
    fitNames();
  });
  // The measure is only right once the fonts are in.
  void document.fonts?.ready.then(() => names.isConnected && fitNames());

  if (rows.length > 0) {
    const { at, stagger, duration, offsetX } = TIMING.rows;
    timeline
      .fromTo(rows, { '--wu-x': offsetX }, { '--wu-x': 0, duration, ease: 'power2.out', stagger }, at)
      .fromTo(rows, { opacity: 0 }, { opacity: 1, duration: duration * 0.75, ease: 'power1.out', stagger }, at);
  }

  const since = data.since ? formatDay(data.since, locale) : null;
  const total = people.reduce((sum, person) => sum + person.visits, 0);
  const stickerText = single
    ? since && `${labels.since} ${since}`
    : people.length > 1 && `${format(people.length)} ${labels.people}, ${format(total)} ${visitsLabel(total)}`;
  const shell =
    targets.sticker && stickerText
      ? createCardShell(targets.sticker, { className: 'wu-cared-for-sticker', frame: STICKER_FRAME, maxScale })
      : null;
  if (shell && stickerText) {
    const sticker = createSticker({ text: stickerText, ...STICKER, heart: false });
    shell.stage.append(sticker);
    addStickerPop(timeline, sticker, TIMING.sticker);
  }

  const controller = createController({
    timeline,
    ready: trackImages([...names.querySelectorAll('img'), ...(shell?.root.querySelectorAll('img') ?? [])]),
    onComplete,
    onDestroy: () => {
      stopFitting();
      names.remove();
      shell?.remove();
    },
  });
  if (autoplay) controller.play();
  return controller;
}
