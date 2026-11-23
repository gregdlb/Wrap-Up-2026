import gsap from 'gsap';
import { createCardShell, element } from '../shared/card';
import { holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { SCREEN_SECONDS } from '../shared/counter';
import { observeSize } from '../shared/fit';
import { ensureStyles } from '../shared/styles';
import { keepTogether } from '../shared/text';
import { createScratch } from './scratch';

export interface PayCardData {
  /** Amount earned in the year, in whole currency units. */
  earned: number;
  /** Number of paychecks. */
  paychecks: number;
  /** Year in the line under the amount. Defaults to the current year. */
  year?: number;
}

export interface PayCardLabels {
  /** Text on the cover. */
  scratch: string;
  /** Line under the amount; `{paychecks}` and `{year}` are filled in. */
  paychecks: string;
}

export interface PayCardOptions extends WrapUpOptions {
  /**
   * Called once, when the cover is wiped far enough (or tapped) and the amount is revealed.
   * Start MoneyRain and resume the story from here.
   */
  onRevealed?: () => void;
  /** Share of the cover (0–1) that has to be wiped before the rest is revealed. Defaults to 0.6. */
  revealAt?: number;
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  /** ISO currency code. Defaults to "USD". */
  currency?: string;
  labels?: Partial<PayCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
}

export interface PayCardController extends WrapUpController {
  /** Reveals the amount without scratching, e.g. from an accessibility action. */
  reveal(): void;
  /** True once the amount is revealed. */
  readonly revealed: boolean;
}

const DEFAULT_LABELS: PayCardLabels = {
  scratch: 'Scratch or tap to reveal',
  paychecks: 'across {paychecks} paychecks in {year}',
};

/** The Figma "Scratch card" frame. */
const FRAME = { width: 328, height: 220 };

/**
 * Seconds on the card's timeline. It plays the entrance (0.4–1.0) and then waits at `waitAt` for the user.
 * Revealing resumes it: the cover fades, the amount counts from 0, and the rest of the 6 s is a hold.
 */
const TIMING = {
  enter: { at: 0.4, duration: 0.6, offsetY: 24, tilt: -2 },
  waitAt: 1.0,
  cover: { duration: 0.2 },
  count: { at: 1.1, duration: 1.8 },
};

const STYLES = /* css */ `
.wu-pay-card__ticket {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 calc(1 * var(--wu-u)) calc(1 * var(--wu-u)) rgba(0, 0, 0, 0.05));
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0) rotate(calc(var(--wu-tilt, 0) * 1deg));
}

/* The ticket's side notches are real holes, so whatever is behind the card shows through. */
.wu-pay-card__body {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(8 * var(--wu-u));
  background: var(--wu-card, #ffffff);
  -webkit-mask:
    radial-gradient(circle at 0 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) left / 51% 100% no-repeat,
    radial-gradient(circle at 100% 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle at 0 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) left / 51% 100% no-repeat,
    radial-gradient(circle at 100% 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) right / 51% 100% no-repeat;
}

.wu-pay-card__line {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  white-space: nowrap;
}

.wu-pay-card__amount {
  top: calc(64 * var(--wu-u));
  color: var(--brand-500, #066e3d);
  font-size: calc(56 * var(--wu-u));
  font-weight: 800;
  letter-spacing: calc(-2.24 * var(--wu-u));
  line-height: calc(73 * var(--wu-u));
}

.wu-pay-card__sub {
  top: calc(141 * var(--wu-u));
  color: var(--wu-muted, #71717a);
  font-size: calc(14 * var(--wu-u));
  font-weight: 400;
  line-height: calc(18 * var(--wu-u));
}

.wu-pay-card__cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.wu-pay-card__cover:focus-visible {
  outline: calc(3 * var(--wu-u)) solid var(--brand-500, #066e3d);
  outline-offset: calc(-6 * var(--wu-u));
}
`;

/** Reads a color token from the page, with the Figma value as fallback, for drawing on the canvas. */
function token(node: HTMLElement, name: string, fallback: string): string {
  return getComputedStyle(node).getPropertyValue(name).trim() || fallback;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Mounts the 09 "Pay" scratch card into `el` and scales it to fit that element.
 * The card slides in, then waits: the user wipes the cover with a finger or the mouse (or taps it),
 * at about 60 % the rest is revealed, `onRevealed` fires and the amount counts up from 0.
 * The amount is private: it is not part of anything the share card exports.
 */
export function mountPayCard(el: HTMLElement, data: PayCardData, options: PayCardOptions = {}): PayCardController {
  const { locale = 'en-US', currency = 'USD', autoplay = false, onComplete, onRevealed, revealAt = 0.6, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const earned = Math.max(0, Math.round(data.earned));
  const year = data.year ?? new Date().getFullYear();
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const subText = labels.paychecks
    .replace('{paychecks}', new Intl.NumberFormat(locale).format(data.paychecks))
    .replace('{year}', String(year));
  const reducedMotion = prefersReducedMotion();

  ensureStyles('pay-card', STYLES);
  const shell = createCardShell(el, { className: 'wu-pay-card', frame: FRAME, maxScale });
  shell.root.dataset.private = 'true';
  const ticket = element('wu-pay-card__ticket');
  const body = element('wu-pay-card__body');
  const amount = element('wu-pay-card__line wu-pay-card__amount', money.format(earned));
  const cover = document.createElement('canvas');
  cover.className = 'wu-pay-card__cover';
  cover.tabIndex = 0;
  cover.setAttribute('role', 'button');
  cover.setAttribute('aria-label', labels.scratch);
  body.append(amount, element('wu-pay-card__line wu-pay-card__sub', keepTogether(subText)), cover);
  ticket.append(body);
  shell.stage.append(ticket);

  let revealed = false;
  let destroyed = false;
  let pendingStart: gsap.core.Tween | null = null;

  const timeline = holdTimeline(SCREEN_SECONDS);
  timeline
    .fromTo(
      ticket,
      { opacity: 0, '--wu-y': TIMING.enter.offsetY, '--wu-tilt': TIMING.enter.tilt },
      { opacity: 1, '--wu-y': 0, '--wu-tilt': 0, duration: TIMING.enter.duration, ease: 'power3.out' },
      TIMING.enter.at,
    )
    .fromTo(cover, { opacity: 1 }, { opacity: 0, duration: TIMING.cover.duration, ease: 'power1.out' }, TIMING.waitAt)
    .addPause(TIMING.waitAt);

  /**
   * Under the cover the real amount is printed, as on a paper scratch card.
   * After the reveal it counts from 0 back up to it.
   */
  const drawAmount = () => {
    const progress = (timeline.time() - TIMING.count.at) / TIMING.count.duration;
    const counting = timeline.time() > TIMING.waitAt && progress < 1;
    const eased = 1 - Math.pow(1 - Math.min(Math.max(progress, 0), 1), 3);
    amount.textContent = money.format(counting ? Math.round(earned * eased) : earned);
    cover.style.pointerEvents = revealed ? 'none' : '';
  };
  timeline.eventCallback('onUpdate', drawAmount);
  timeline.eventCallback('onComplete', () => onComplete?.());

  const scratch = createScratch({
    canvas: cover,
    text: labels.scratch,
    fontFamily: getComputedStyle(shell.root).fontFamily,
    colors: {
      cover: token(shell.root, '--brand-500', '#066e3d'),
      pill: token(shell.root, '--wu-card', '#ffffff'),
      pillText: token(shell.root, '--brand-500', '#066e3d'),
    },
    threshold: revealAt,
    onReveal: () => controller.reveal(),
  });

  /** The canvas is drawn at the screen's pixel density; a new size means a fresh cover. */
  const stopSizing = observeSize(cover, ({ width, height }) => {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (pixelWidth === 0 || (cover.width === pixelWidth && cover.height === pixelHeight)) return;
    cover.width = pixelWidth;
    cover.height = pixelHeight;
    if (!revealed) scratch.reset();
  });
  // The pill's text is drawn with the app's font; repaint once it has loaded.
  void document.fonts?.ready.then(() => {
    if (!destroyed && !revealed && scratch.progress === 0) scratch.reset();
  });

  const cancelPendingStart = () => {
    pendingStart?.kill();
    pendingStart = null;
  };

  const startOver = () => {
    revealed = false;
    scratch.reset();
    timeline.pause(reducedMotion ? TIMING.waitAt : 0, true);
    drawAmount();
  };

  const controller: PayCardController = {
    // Everything is drawn in code: there are no images to wait for.
    ready: Promise.resolve(),
    play(delay = 0) {
      if (destroyed) return;
      if (pendingStart) {
        pendingStart.resume();
        return;
      }
      if (timeline.progress() === 1) startOver();
      // Waiting for the user: only a reveal moves the card past this point.
      if (!revealed && timeline.time() >= TIMING.waitAt) return;
      if (delay <= 0 || timeline.time() > 0) {
        timeline.play();
        return;
      }
      pendingStart = gsap.delayedCall(delay, () => {
        pendingStart = null;
        timeline.play();
      });
    },
    pause() {
      pendingStart?.pause();
      timeline.pause();
    },
    seek(t) {
      if (destroyed) return;
      cancelPendingStart();
      const time = Math.min(Math.max(t, reducedMotion ? TIMING.waitAt : 0), timeline.duration());
      if (time <= TIMING.waitAt && revealed) {
        revealed = false;
        scratch.reset();
      } else if (time > TIMING.waitAt && !revealed) {
        revealed = true;
        scratch.lock();
      }
      timeline.time(time, true);
      drawAmount();
    },
    reveal() {
      if (destroyed || revealed) return;
      cancelPendingStart();
      revealed = true;
      scratch.lock();
      onRevealed?.();
      // With reduced motion the amount is simply there; the timeline only keeps the screen's time.
      const from = reducedMotion ? TIMING.count.at + TIMING.count.duration : TIMING.waitAt;
      if (reducedMotion || timeline.time() < TIMING.waitAt) timeline.time(from, true);
      drawAmount();
      timeline.play();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelPendingStart();
      timeline.kill();
      scratch.destroy();
      stopSizing();
      shell.remove();
    },
    get duration() {
      return timeline.duration();
    },
    get revealed() {
      return revealed;
    },
  };

  timeline.time(reducedMotion ? TIMING.waitAt : 0, true);
  drawAmount();
  if (autoplay) controller.play();
  return controller;
}
