import { createCardShell, element, place } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../shared/counter';
import { trackImages } from '../shared/images';
import { PAGES_IN } from '../shared/pages';
import { addStickerPop, createSticker } from '../shared/sticker';
import { ensureStyles } from '../shared/styles';

export interface VisitsCountData {
  /** Visits completed in the year. */
  visits: number;
  /** First name of the person cared for, shown on the sticker ("With Rosa"). Without it there is no sticker. */
  personName?: string;
}

export interface VisitsCountLabels {
  /** Title on the plaque. Shown in capitals. */
  visits: string;
  /** Word before the name on the sticker. */
  with: string;
}

export interface VisitsCountOptions extends WrapUpOptions {
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<VisitsCountLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description. */
  ariaLabel?: string;
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export type VisitsCountController = WrapUpController;

const DEFAULT_LABELS: VisitsCountLabels = { visits: 'Visits', with: 'With' };

/** The Figma "Visits · door" frame. The door in the arch is the app's MP4; this component draws on top of it. */
const FRAME = { width: 360, height: 360 };
const PLAQUE = { x: 241.87, y: 154.81, w: 96, h: 74 };
const STICKER = { x: 37.9, y: 295.87, tilt: 6 };

/** Seconds from `play()`: the plaque comes in with the cards, counts at 1.0–2.5, the sticker pops in at 2.5. */
const TIMING = { counter: { at: 1.0, duration: 1.5 }, sticker: 2.5 };

/** Number size by the count of characters, so that four and more digits still fit the 90 px wide plaque. */
const NUMBER_SIZES = [36, 36, 36, 36, 30, 26, 22];

const STYLES = /* css */ `
.wu-visits-count__plaque {
  box-sizing: border-box;
  overflow: hidden;
  border: calc(3 * var(--wu-u)) solid var(--beige-50, #fefdfc);
  border-radius: calc(14 * var(--wu-u));
  background: linear-gradient(178.5166deg, var(--beige-500, #f5f2ef) 31.975%, var(--base-white, #ffffff) 98.375%) border-box;
  box-shadow: 0 calc(14 * var(--wu-u)) calc(28 * var(--wu-u)) 0 rgba(3, 26, 13, 0.2);
  color: var(--emerald-500, #023620);
  text-align: center;
  white-space: nowrap;
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-visits-count__title {
  position: absolute;
  left: 0;
  top: calc(7 * var(--wu-u));
  width: 100%;
  font-size: calc(10 * var(--wu-u));
  font-weight: 700;
  letter-spacing: calc(1.6 * var(--wu-u));
  line-height: calc(13 * var(--wu-u));
  text-transform: uppercase;
}

.wu-visits-count__number {
  position: absolute;
  left: 0;
  top: calc(20.19 * var(--wu-u));
  width: 100%;
  font-size: calc(var(--wu-number-size) * var(--wu-u));
  font-weight: 800;
  line-height: calc(47 * var(--wu-u));
}
`;

/**
 * Mounts the 03 "Visits" plaque with its counter and the "With …" sticker into `el`,
 * scaled to fit that element. Lay it over the door illustration, in the same box.
 */
export function mountVisitsCount(
  el: HTMLElement,
  data: VisitsCountData,
  options: VisitsCountOptions = {},
): VisitsCountController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const visits = Math.max(0, Math.round(data.visits));
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));
  const name = data.personName?.trim();
  const stickerText = name ? `${labels.with} ${name}` : null;

  ensureStyles('visits-count', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-visits-count',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? [`${labels.visits}: ${format(visits)}`, stickerText].filter(Boolean).join('. '),
  });

  const plaque = place(element('wu-visits-count__plaque'), PLAQUE);
  const number = element('wu-visits-count__number', '0');
  const digits = format(visits).length;
  number.style.setProperty('--wu-number-size', String(NUMBER_SIZES[Math.min(digits, NUMBER_SIZES.length - 1)]));
  plaque.append(element('wu-visits-count__title', labels.visits), number);
  shell.stage.append(plaque);

  const timeline = holdTimeline(SCREEN_SECONDS);
  timeline.fromTo(
    plaque,
    { opacity: 0, '--wu-y': PAGES_IN.offsetY },
    { opacity: 1, '--wu-y': 0, duration: PAGES_IN.duration, ease: 'power3.out' },
    PAGES_IN.at,
  );
  addCounter(timeline, number, visits, { ...TIMING.counter, format });

  if (stickerText) {
    const sticker = createSticker({ text: stickerText, ...STICKER, assetBaseUrl });
    shell.stage.append(sticker);
    addStickerPop(timeline, sticker, TIMING.sticker);
  }

  const controller = createController({
    timeline,
    ready: trackImages(shell.root.querySelectorAll('img')),
    onComplete,
    onDestroy: shell.remove,
  });
  if (autoplay) controller.play();
  return controller;
}
