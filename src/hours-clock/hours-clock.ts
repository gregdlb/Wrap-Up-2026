import { createCardShell, element } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { SCREEN_SECONDS } from '../shared/counter';
import { ensureStyles } from '../shared/styles';

export interface HoursClockData {
  /** Hours of care in the year, in full 24 h days: the number in the middle of the clock. */
  fullDays: number;
  /** The same care in hours, e.g. 1011. Used for the screen reader description. */
  hours: number;
}

export interface HoursClockLabels {
  /** Under the number. Shown in capitals. */
  fullDays: string;
  /** Singular of it, for exactly one day. */
  fullDay: string;
  /** Unit of `hours` in the screen reader description. */
  hours: string;
}

export interface HoursClockOptions extends WrapUpOptions {
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<HoursClockLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the clock. */
  ariaLabel?: string;
}

export type HoursClockController = WrapUpController;

const DEFAULT_LABELS: HoursClockLabels = { fullDays: 'Full days', fullDay: 'Full day', hours: 'hours' };

/** The Figma "Clock face" frame: a round card. */
const FRAME = { width: 236, height: 236 };

/**
 * The ring in a 195.543 box: track and arc share the radius and the stroke.
 * In Figma the arc rests between the 5 and the 9, a third of the way round.
 */
const RING = { box: 195.543, inset: 19.1, radius: 92.1524, stroke: 11.2381, restFrom: 150, sweep: 120 };

/** The numerals sit on a circle of this radius around the centre, 13.486 px tall. */
const NUMERALS = { radius: 66.5, items: [12, 3, 6, 9] };

/**
 * Seconds from `play()`. The clock slides in with the cards. Then the arc goes round like a hand,
 * faster and faster, one turn standing for one day, while the number counts up; near the end it slows
 * and comes to rest where Figma has it.
 */
const TIMING = {
  enter: { at: 0.4, duration: 0.5, offsetY: 24 },
  spin: { at: 0.7, duration: 1.7 },
  /** Turns the arc makes: one per day, but no more than the eye can follow. */
  turns: { min: 1, max: 6 },
  /** Share of the spin spent speeding up before it slows down. */
  speedUpUntil: 0.72,
  /** The arc grows to its length over this share of the spin. */
  growUntil: 0.25,
};

const STYLES = /* css */ `
.wu-hours-clock__face {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: calc(1.124 * var(--wu-u)) solid var(--wu-border, #d4d4d4);
  border-radius: 50%;
  background: var(--wu-card, #ffffff);
  box-shadow: 0 calc(16 * var(--wu-u)) calc(15 * var(--wu-u)) 0 rgba(3, 26, 13, 0.16);
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-hours-clock__ring {
  position: absolute;
  left: calc(19.1 * var(--wu-u));
  top: calc(19.1 * var(--wu-u));
  width: calc(195.543 * var(--wu-u));
  height: calc(195.543 * var(--wu-u));
  overflow: visible;
}

.wu-hours-clock__track {
  fill: none;
  stroke: var(--olive-500, #d7e4c9);
}

.wu-hours-clock__arc {
  fill: none;
  stroke: var(--brand-500, #066e3d);
  stroke-linecap: round;
  transform-origin: 50% 50%;
  transform: rotate(calc(var(--wu-turn, 0) * 1deg));
}

.wu-hours-clock__numeral {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  color: var(--wu-muted, #71717a);
  font-size: calc(13.486 * var(--wu-u));
  font-weight: 500;
  line-height: calc(17.56 * var(--wu-u));
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.wu-hours-clock__centre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.wu-hours-clock__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(33.714 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: calc(-1.0114 * var(--wu-u));
  line-height: calc(43.9 * var(--wu-u));
}

.wu-hours-clock__label {
  color: var(--wu-muted, #71717a);
  font-size: calc(12.362 * var(--wu-u));
  font-weight: 500;
  line-height: calc(16.1 * var(--wu-u));
  text-transform: uppercase;
}
`;

/**
 * Progress of the spin: speeds up for most of the way, then brakes to a stop.
 * A cubic start and a quadratic finish, joined so that neither position nor speed jumps.
 */
function spinEase(progress: number): number {
  const join = TIMING.speedUpUntil;
  const rise = 1 / (1.5 * join * join - 0.5 * join * join * join);
  if (progress < join) return rise * progress * progress * progress;
  const brake = (3 * rise * join * join) / (2 * (1 - join));
  return 1 - brake * (1 - progress) * (1 - progress);
}

function svg<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

/**
 * Mounts the 04 "Hours" clock into `el` and scales it to fit that element.
 * A round clock face; the progress arc sweeps round while the number counts up to the full days.
 */
export function mountHoursClock(el: HTMLElement, data: HoursClockData, options: HoursClockOptions = {}): HoursClockController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const fullDays = Math.max(0, Math.round(data.fullDays));
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));
  const label = fullDays === 1 ? labels.fullDay : labels.fullDays;

  ensureStyles('hours-clock', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-hours-clock',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${format(data.hours)} ${labels.hours}: ${format(fullDays)} ${label}`,
  });

  const face = element('wu-hours-clock__face');
  const centreOfRing = RING.box / 2;
  const ring = svg('svg', { class: 'wu-hours-clock__ring', viewBox: `0 0 ${RING.box} ${RING.box}`, 'aria-hidden': 'true' });
  const circle = { cx: centreOfRing, cy: centreOfRing, r: RING.radius, 'stroke-width': RING.stroke };
  // The arc is a dash on the same circle; its length is given in 360ths, so a degree is a degree.
  const arc = svg('circle', { ...circle, class: 'wu-hours-clock__arc', pathLength: 360 });
  ring.append(svg('circle', { ...circle, class: 'wu-hours-clock__track' }), arc);

  // The face's own centre: its content box starts inside the border.
  const centre = FRAME.width / 2 - 1.124;
  const numerals = NUMERALS.items.map((numeral, index) => {
    const angle = (index * Math.PI) / 2;
    const node = element('wu-hours-clock__numeral', String(numeral));
    node.style.setProperty('--x', String(centre + Math.sin(angle) * NUMERALS.radius));
    node.style.setProperty('--y', String(centre - Math.cos(angle) * NUMERALS.radius));
    return node;
  });

  const value = element('wu-hours-clock__value', '0');
  const middle = element('wu-hours-clock__centre');
  middle.append(value, element('wu-hours-clock__label', label));
  face.append(ring, ...numerals, middle);
  shell.stage.append(face);

  const turns = Math.min(Math.max(fullDays, TIMING.turns.min), TIMING.turns.max);
  // A dash starts at 3 o'clock; turning it by (restFrom - 90) puts its start on the Figma position.
  const restTurn = RING.restFrom - 90;

  /** Shows the clock at `progress` (0–1) of the spin: where the arc is, how long it is, and the number. */
  const showSpin = (progress: number) => {
    const travelled = spinEase(progress);
    const sweep = RING.sweep * Math.min(progress / TIMING.growUntil, 1);
    arc.style.setProperty('--wu-turn', (restTurn - 360 * turns * (1 - travelled)).toFixed(2));
    arc.setAttribute('stroke-dasharray', `${sweep.toFixed(2)} 360`);
    arc.style.opacity = progress > 0 ? '1' : '0';
    const text = format(fullDays * travelled);
    if (value.textContent !== text) value.textContent = text;
  };

  // GSAP writes through the setter on every render, so the clock also follows seek() and rewinds.
  let spun = 0;
  const spinning = {
    get progress() {
      return spun;
    },
    set progress(next: number) {
      spun = next;
      showSpin(next);
    },
  };

  const timeline = holdTimeline(SCREEN_SECONDS);
  timeline
    .fromTo(
      face,
      { opacity: 0, '--wu-y': TIMING.enter.offsetY },
      { opacity: 1, '--wu-y': 0, duration: TIMING.enter.duration, ease: 'power3.out' },
      TIMING.enter.at,
    )
    .fromTo(spinning, { progress: 0 }, { progress: 1, duration: TIMING.spin.duration, ease: 'none' }, TIMING.spin.at);

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  if (autoplay) controller.play();
  return controller;
}
