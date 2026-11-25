import { createCardShell, element } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, screenSeconds } from '../shared/counter';
import { addBlankFlips } from '../shared/flips';
import { addPagesIn, createPages } from '../shared/pages';
import { ensureStyles } from '../shared/styles';
import { keepTogether } from '../shared/text';

/** The clock-in personalities of screen 06. The card looks the same for all of them; only the data differs. */
export type PersonalityType =
  | 'early_bird'
  | 'night_owl'
  | 'midday_hero'
  | 'rock'
  | 'steady_one'
  | 'every_day_hero'
  | 'marathoner'
  | 'weekend_warrior'
  | 'juggler';

export type PersonalityValueType = 'time' | 'number' | 'percent' | 'duration';

export interface PersonalityCardData {
  /** Which personality this is. Kept on the card as `data-type`; decides the default of `chipCheck`. */
  type: PersonalityType | (string & {});
  /** Small title above the value, e.g. "Earliest clock-in". Shown in capitals. */
  label: string;
  /**
   * The big value, counted up from zero:
   * - `time`: "5:48" (shown as written, 12 or 24 hour) or minutes after midnight;
   * - `duration`: minutes, or text like "7h 20m";
   * - `percent`: 38 for "38%";
   * - `number`: a plain number.
   */
  value: number | string;
  valueType: PersonalityValueType;
  /** Line under the value, e.g. "AM · Tue, Mar 10". */
  sub: string;
  /** Text of the chip at the bottom, e.g. "Clocked in". */
  chip: string;
  /** Check mark in the chip. Defaults to true for `early_bird` and `night_owl`, as in Figma. */
  chipCheck?: boolean;
}

export interface PersonalityCardOptions extends WrapUpOptions {
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
}

export type PersonalityCardController = WrapUpController;

/** The Figma "Clock-in card · torn page" frame. */
const FRAME = { width: 360, height: 350 };
const MINUTES_PER_HOUR = 60;
const TYPES_WITH_CHECK = ['early_bird', 'night_owl'];

/** Values longer than "11:42" are set one size smaller, like "7h 20m" in Figma. */
const VALUE_SIZES = { regular: { size: 64, line: 83, maxLength: 5 }, long: { size: 52, line: 68 } };

/** Seconds from `play()`: the value counts at 1.05–1.8, once the last blank sheet is see-through; the chip pops in last, at 1.8–2.0. */
const TIMING = { value: { at: 1.05, duration: 0.75 }, chip: { at: 1.8, duration: 0.2 } };

const STYLES = /* css */ `
.wu-personality-card__line {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  white-space: nowrap;
}

.wu-personality-card__label {
  top: calc(35 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  letter-spacing: calc(1.32 * var(--wu-u));
  line-height: calc(14 * var(--wu-u));
  text-transform: uppercase;
}

.wu-personality-card__value {
  top: calc(59 * var(--wu-u));
  color: var(--brand-500, #066e3d);
  font-size: calc(var(--wu-value-size) * var(--wu-u));
  font-weight: 800;
  line-height: calc(var(--wu-value-line) * var(--wu-u));
}

.wu-personality-card__sub {
  top: calc(147 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-personality-card__chip-row {
  top: calc(177 * var(--wu-u));
  display: flex;
  justify-content: center;
}

.wu-personality-card__chip {
  display: flex;
  align-items: center;
  gap: calc(6 * var(--wu-u));
  padding: calc(4 * var(--wu-u)) calc(10 * var(--wu-u));
  border-radius: calc(6 * var(--wu-u));
  background: var(--olive-500, #d7e4c9);
  color: var(--brand-500, #066e3d);
  font-size: calc(12 * var(--wu-u));
  font-weight: 500;
  line-height: calc(16 * var(--wu-u));
  transform: scale(var(--wu-pop, 1));
}

.wu-personality-card__check {
  display: block;
  width: calc(11 * var(--wu-u));
  height: calc(11 * var(--wu-u));
}
`;

const CHECK_ICON =
  '<svg class="wu-personality-card__check" viewBox="0 0 11 11" fill="none" aria-hidden="true">' +
  '<path d="M9.16627 2.74995L4.1246 7.79162L1.83294 5.49995" stroke="currentColor" stroke-width="1.375" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

interface Countable {
  /** What the counter runs to: minutes for times and durations, the number itself otherwise. */
  target: number;
  format(value: number): string;
}

function invalid(data: PersonalityCardData): never {
  throw new Error(`PersonalityCard: cannot read value "${data.value}" as ${data.valueType}`);
}

function toMinutes(data: PersonalityCardData, pattern: RegExp): number {
  if (typeof data.value === 'number') return Math.max(0, Math.round(data.value));
  const match = pattern.exec(data.value.trim());
  if (!match) invalid(data);
  return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2] ?? 0);
}

function toNumber(data: PersonalityCardData): number {
  const number = typeof data.value === 'number' ? data.value : Number(data.value.replace(/[%,\s]/g, ''));
  if (!Number.isFinite(number)) invalid(data);
  return Math.max(0, Math.round(number));
}

/** Turns the value into a number to count to and a way to print every step on the way. */
function countable(data: PersonalityCardData, locale: string): Countable {
  const split = (minutes: number) => {
    const rounded = Math.round(minutes);
    return { hours: Math.floor(rounded / MINUTES_PER_HOUR), minutes: rounded % MINUTES_PER_HOUR };
  };

  if (data.valueType === 'time') {
    return {
      target: toMinutes(data, /^(\d{1,2}):(\d{2})$/),
      format(value) {
        const { hours, minutes } = split(value);
        return `${hours}:${String(minutes).padStart(2, '0')}`;
      },
    };
  }
  if (data.valueType === 'duration') {
    const target = toMinutes(data, /^(\d+)\s*h(?:\s*(\d+)\s*m)?$/i);
    return {
      target,
      format(value) {
        const { hours, minutes } = split(value);
        // A whole number of hours ends as "12h", not "12h 0m".
        return minutes === 0 && Math.round(value) === target && hours > 0 ? `${hours}h` : `${hours}h\u00a0${minutes}m`;
      },
    };
  }
  if (data.valueType === 'percent') {
    return { target: toNumber(data), format: (value) => `${Math.round(value)}%` };
  }
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return { target: toNumber(data), format: (value) => numberFormat.format(Math.round(value)) };
}

/**
 * Seconds of the animator's scene video behind the card, for the types that have one. A screen whose video
 * plus the time on its last frame does not fit into 6 s lasts longer (The Early Bird, The Night Owl).
 */
const SCENE_VIDEO_SECONDS: Partial<Record<string, number>> = {
  early_bird: 5.04,
  night_owl: 5,
  midday_hero: 3,
  rock: 3,
  steady_one: 3,
};

/**
 * Mounts the 06 "Clock-in personality" stat card into `el` and scales it to fit that element.
 * One component for every personality type: label, a value that counts up, a sub line and a chip.
 */
export function mountPersonalityCard(
  el: HTMLElement,
  data: PersonalityCardData,
  options: PersonalityCardOptions = {},
): PersonalityCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const { target, format } = countable(data, locale);
  const finalValue = format(target);
  const size = finalValue.length > VALUE_SIZES.regular.maxLength ? VALUE_SIZES.long : VALUE_SIZES.regular;
  const withCheck = data.chipCheck ?? TYPES_WITH_CHECK.includes(data.type);

  ensureStyles('personality-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-personality-card',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${data.label}: ${finalValue} ${data.sub}. ${data.chip}`,
  });
  shell.root.dataset.type = data.type;
  const pages = createPages(shell.stage);

  const line = (name: string, text?: string) => element(`wu-personality-card__line wu-personality-card__${name}`, text);
  const value = line('value', format(0));
  value.style.setProperty('--wu-value-size', String(size.size));
  value.style.setProperty('--wu-value-line', String(size.line));

  const chip = element('wu-personality-card__chip');
  if (withCheck) chip.innerHTML = CHECK_ICON;
  chip.append(keepTogether(data.chip));
  const chipRow = line('chip-row');
  chipRow.append(chip);

  pages.front.append(line('label', keepTogether(data.label)), value, line('sub', keepTogether(data.sub)), chipRow);

  const timeline = holdTimeline(screenSeconds(SCENE_VIDEO_SECONDS[data.type]));
  addPagesIn(timeline, pages);
  addBlankFlips(timeline, pages.front);
  addCounter(timeline, value, target, { ...TIMING.value, format });
  timeline
    .fromTo(chip, { '--wu-pop': 0.8 }, { '--wu-pop': 1, duration: TIMING.chip.duration, ease: 'back.out(2)' }, TIMING.chip.at)
    .fromTo(chip, { opacity: 0 }, { opacity: 1, duration: TIMING.chip.duration / 2, ease: 'power1.out' }, TIMING.chip.at);

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  if (autoplay) controller.play();
  return controller;
}
