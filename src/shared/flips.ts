import { element } from './card';
import { FRONT_PAGE } from './pages';
import { ensureStyles } from './styles';

/**
 * Sheets of paper that turn up over a hinge at their top edge, as on a tear-off calendar.
 * The motion of one sheet is taken from the reference video (`reference/Demo_m1.mp4`, screen 02):
 * its free edge first swings out towards the viewer, so the sheet grows a little into a trapezoid;
 * then it folds up, flattens against the hinge and fades. The next sheet starts before the one above it
 * is gone, but never more than two are in the air.
 * On request the flip is slower than in the reference, and the swing towards the viewer and the shadows
 * are about half as strong.
 */
const SHEET_STYLES = /* css */ `
/* Everything below the hinge. The camera is close, so a lifted sheet visibly comes towards the viewer. */
.wu-sheets {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: calc(var(--wu-hinge, 0) * var(--wu-u));
  perspective: calc(var(--wu-sheet-distance) * var(--wu-u));
  perspective-origin: 50% 0;
  pointer-events: none;
}

.wu-sheet {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--wu-sheet-radius, calc(14 * var(--wu-u)));
  background: var(--beige-50, #fefdfc);
  box-shadow: 0 calc(8 * var(--wu-u)) calc(20 * var(--wu-u)) rgba(3, 26, 13, calc(var(--wu-lift, 0) * 0.14));
  transform-origin: 50% 0;
  transform: rotateX(calc(var(--wu-flip, 0) * 1deg)) scale(var(--wu-swell, 1));
  backface-visibility: hidden;
}

/* A lifted sheet shades the one below it, strongest at the hinge. */
.wu-sheets__shadow {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(56 * var(--wu-u));
  border-radius: var(--wu-sheet-radius, calc(14 * var(--wu-u)));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.09), rgba(3, 26, 13, 0));
}
`;

/**
 * One sheet. How the angle grows over a flip is measured frame by frame on the reference; the flip itself
 * is slower, 0.55 s instead of 0.43 s. The next sheet starts `follow` of that later when there is room and
 * never sooner than `soonest` of it, which is just over half: at most two sheets are in the air at once.
 * The swing towards the viewer is half as strong as in the reference: the camera is 4.5 sheet heights away
 * and the sheet grows by `swell` at the start of the flip, to about 1.09x in all (the reference reaches 1.16x).
 */
export const SHEET = { seconds: 0.55, distance: 4.5, follow: 0.77, soonest: 0.52, swell: 0.062, swellUntil: 0.36 };

/** Degrees around the hinge over a flip, read off the reference: a soft start, an even swing, a soft landing. */
const TURN = [
  [0, 0],
  [0.08, 5.5],
  [0.16, 14.5],
  [0.24, 26],
  [0.32, 34.5],
  [0.4, 43],
  [0.48, 52],
  [0.56, 57.5],
  [0.64, 64],
  [0.72, 71.5],
  [0.8, 78],
  [0.88, 84],
  [0.94, 87],
  [1, 90],
] as const;

export interface SheetPose {
  /** Degrees around the hinge: 0 lies flat, 90 is edge-on. */
  angle: number;
  opacity: number;
  /** How far the free edge is off the page, 0–1: drives the shadows. */
  lift: number;
  /** Size of the sheet in its own plane: a little over 1 while it swings out towards the viewer. */
  swell: number;
}

/** Opacity of the paper over a flip: solid while it swings out, see-through on the way up, gone at the hinge. */
const PAPER = [
  [0, 1],
  [0.23, 1],
  [0.47, 0.6],
  [0.78, 0.45],
  [1, 0],
] as const;

/** The value of a keyframe table at `p`, between its two nearest rows. */
function along(table: readonly (readonly [number, number])[], p: number): number {
  const next = table.findIndex(([at]) => p <= at);
  const [fromAt, from] = table[Math.max(next - 1, 0)]!;
  const [toAt, to] = table[next]!;
  return toAt === fromAt ? to : from + ((p - fromAt) / (toAt - fromAt)) * (to - from);
}

/**
 * Where a sheet is at `progress` (0–1) of its flip. In this perspective the turn reads as the sheet
 * swinging out towards the viewer, hanging there for a moment, then dropping onto the hinge.
 */
export function sheetPose(progress: number): SheetPose {
  const p = Math.min(Math.max(progress, 0), 1);
  const angle = along(TURN, p);
  const swell = 1 + (p < SHEET.swellUntil ? SHEET.swell * Math.sin((Math.PI * p) / SHEET.swellUntil) : 0);
  return { angle, opacity: along(PAPER, p), lift: Math.sin((angle * Math.PI) / 180), swell };
}

/**
 * When each of `count` flips starts, in seconds after the first one, so that all are done within `window`.
 * Evenly paced; with room to spare a flip still follows the one before it closely. A window that is too
 * short for `count` flips is overrun rather than letting a third sheet into the air.
 */
export function flipStarts(count: number, window: number): number[] {
  const fitted = count > 1 ? Math.max(window - SHEET.seconds, 0) / (count - 1) : 0;
  const step = Math.max(Math.min(SHEET.seconds * SHEET.follow, fitted), SHEET.seconds * SHEET.soonest);
  return Array.from({ length: count }, (_, index) => index * step);
}

export interface Sheets {
  /** The element that holds the sheets; add it to the page they lie on. */
  node: HTMLElement;
  /** The sheets from the top one down. Fill them before the first `show`. */
  sheets: HTMLElement[];
  /** Seconds the whole flipping takes. */
  seconds: number;
  /** Poses every sheet `seconds` into the flipping. Returns the index of the sheet on top (`count` when all are gone). */
  show(seconds: number): number;
}

/**
 * Builds `count` sheets hinged `hinge` Figma px below the top of a page that is `height` px tall,
 * flipping one after the other within `window` seconds.
 */
export function createSheets(config: { count: number; hinge: number; height: number; window: number }): Sheets {
  ensureStyles('sheets', SHEET_STYLES);
  const { count, hinge, height, window } = config;
  const starts = flipStarts(count, window);
  const node = element('wu-sheets');
  node.style.setProperty('--wu-hinge', String(hinge));
  node.style.setProperty('--wu-sheet-distance', String((height - hinge) * SHEET.distance));
  const shadow = element('wu-sheets__shadow');
  const sheets = Array.from({ length: count }, () => element('wu-sheet'));
  // The first sheet is the one on top, so it is painted last.
  node.append(shadow, ...[...sheets].reverse());

  const show = (seconds: number) => {
    let top = count;
    let lifted = 0;
    sheets.forEach((sheet, index) => {
      const progress = (seconds - starts[index]!) / SHEET.seconds;
      // A hair short of 1 counts as done: the last step of the timeline may land just under it.
      if (progress > 0.9999) {
        sheet.style.visibility = 'hidden';
        return;
      }
      const pose = sheetPose(progress);
      sheet.style.visibility = '';
      sheet.style.opacity = String(pose.opacity);
      sheet.style.setProperty('--wu-flip', pose.angle.toFixed(2));
      sheet.style.setProperty('--wu-lift', pose.lift.toFixed(3));
      sheet.style.setProperty('--wu-swell', pose.swell.toFixed(4));
      lifted = Math.max(lifted, pose.lift * pose.opacity);
      // A sheet counts as the one on top until the one below shows through it.
      if (top === count && progress < 0.45) top = index;
    });
    shadow.style.opacity = String(lifted);
    return top;
  };

  return { node, sheets, seconds: (starts.at(-1) ?? 0) + SHEET.seconds, show };
}

/** Seconds from `play()`: three blank sheets flip off a card's front page while it slides in. */
const BLANK_FLIPS = { count: 3, at: 0.2, endAt: 1.35 };

/**
 * Adds blank sheets to `frontPage` (after its content) and their flipping to the timeline.
 * Until the last sheet lifts, the page's content stays covered.
 */
export function addBlankFlips(timeline: gsap.core.Timeline, frontPage: HTMLElement): void {
  const { count, at, endAt } = BLANK_FLIPS;
  const sheets = createSheets({ count, hinge: 0, height: FRONT_PAGE.height, window: endAt - at });
  frontPage.append(sheets.node);

  // GSAP writes through the setter on every render, so the sheets also follow seek() and rewinds.
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next: number) {
      flipped = next;
      sheets.show(next);
    },
  };
  timeline.fromTo(flipping, { seconds: 0 }, { seconds: sheets.seconds, duration: sheets.seconds, ease: 'none' }, at);
}
