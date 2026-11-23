import { roundedRect } from '../shared/canvas';

/**
 * The scratch-off layer of PayCard: a canvas painted like the Figma "Scratch card" that the user rubs away
 * with a finger or the mouse. Drawn in the canvas' own pixels; `unit` is one Figma px.
 */

/** The Brevy mark of the cover pattern, drawn in a 20 x 20 box (path from Figma). */
const MARK_PATH =
  'M8.89 8.889V11.1115H8.8885V16.4445C8.88857 16.9114 8.79666 17.3737 8.61804 17.8051C8.43941 18.2365 8.17756 18.6284 7.84744 18.9586C7.51732 19.2888 7.1254 19.5507 6.69406 19.7293C6.26271 19.908 5.80039 20 5.3335 20H0V14.6665C-0.0000656 14.1996 0.0918552 13.7372 0.270513 13.3058C0.44917 12.8744 0.711064 12.4824 1.04124 12.1522C1.37141 11.8221 1.76339 11.5602 2.19479 11.3815C2.62619 11.2029 3.08857 11.1109 3.5555 11.111H6.668V8.889H8.89ZM13.3315 11.111H16.443C16.9099 11.111 17.3722 11.203 17.8036 11.3817C18.2349 11.5603 18.6268 11.8222 18.9569 12.1524C19.2871 12.4826 19.5489 12.8745 19.7275 13.3059C19.9062 13.7373 19.9981 14.1996 19.998 14.6665V20H14.665C14.1981 20.0001 13.7357 19.9081 13.3043 19.7295C12.8729 19.5508 12.4809 19.2889 12.1507 18.9588C11.8206 18.6286 11.5587 18.2366 11.38 17.8052C11.2014 17.3738 11.1094 16.9114 11.1095 16.4445V8.8895H13.3315V11.111ZM5.3335 0C5.80039 0 6.26271 0.0919694 6.69406 0.270656C7.1254 0.449343 7.51732 0.711247 7.84744 1.04141C8.17756 1.37158 8.43941 1.76354 8.61804 2.19491C8.79666 2.62628 8.88857 3.08861 8.8885 3.5555V8.8885H3.5555C3.08861 8.88857 2.62628 8.79666 2.19491 8.61804C1.76354 8.43941 1.37158 8.17756 1.04141 7.84744C0.711247 7.51732 0.449343 7.1254 0.270656 6.69406C0.0919694 6.26271 0 5.80039 0 5.3335V0H5.3335ZM19.9985 5.3335C19.9985 5.80039 19.9065 6.26271 19.7278 6.69406C19.5492 7.1254 19.2873 7.51732 18.9571 7.84744C18.6269 8.17756 18.235 8.43941 17.8036 8.61804C17.3722 8.79666 16.9099 8.88857 16.443 8.8885H11.1095V3.5555C11.1094 3.08857 11.2014 2.62619 11.38 2.19479C11.5587 1.76339 11.8206 1.37141 12.1507 1.04124C12.4809 0.711064 12.8729 0.44917 13.3043 0.270513C13.7357 0.0918552 14.1981 -0.0000656 14.665 0H19.998L19.9985 5.3335Z';

/** Figma geometry of the cover, in a 328 x 220 card. */
const COVER = {
  width: 328,
  height: 220,
  pattern: { size: 20, pitch: 46, firstY: 10, evenX: 4, oddX: 23, opacity: 0.12, rows: 5, columns: 8 },
  pill: { paddingX: 16, height: 40, fontSize: 15 },
};

/**
 * The brush: a soft round tip, stamped along the finger's path. Every stamp varies a little in size and
 * drags a few small specks along its rim, which gives the wiped edge its slight irregularity.
 */
const BRUSH = { radius: 20, spacing: 6, jitter: 0.15, hardness: 0.55, specks: 2, speckSize: 0.35 };

/** Coverage is tracked on a coarse grid instead of reading pixels back from the canvas. */
const GRID = { cell: 8, reach: 0.85 };

/** A press that moves less than this and ends sooner than this counts as a tap. */
const TAP = { distance: 8, milliseconds: 350 };

export interface ScratchColors {
  cover: string;
  pill: string;
  pillText: string;
}

interface ScratchConfig {
  canvas: HTMLCanvasElement;
  text: string;
  fontFamily: string;
  colors: ScratchColors;
  /** Share of the cover (0–1) that has to be wiped before the rest is revealed. */
  threshold: number;
  /** Called once, when the threshold is reached or the cover is tapped. */
  onReveal(): void;
}

export interface Scratch {
  /** Paints a fresh cover and forgets what was wiped. */
  reset(): void;
  /** Stops reacting to the pointer. */
  lock(): void;
  /** Share of the cover wiped so far, 0–1. */
  readonly progress: number;
  destroy(): void;
}

export function createScratch({ canvas, text, fontFamily, colors, threshold, onReveal }: ScratchConfig): Scratch {
  const context = canvas.getContext('2d')!;
  const mark = new Path2D(MARK_PATH);
  let unit = 1;
  let columns = 0;
  let wiped = new Uint8Array(0);
  let wipedCount = 0;
  let locked = false;
  let press: { x: number; y: number; startX: number; startY: number; at: number; moved: number } | null = null;

  const paint = () => {
    unit = canvas.width / COVER.width;
    context.globalCompositeOperation = 'source-over';
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colors.cover;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const { size, pitch, firstY, evenX, oddX, opacity, rows, columns: perRow } = COVER.pattern;
    context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < perRow; column++) {
        const x = (row % 2 === 0 ? evenX : oddX) + pitch * column;
        context.setTransform(unit, 0, 0, unit, x * unit, (firstY + pitch * row) * unit);
        context.scale(size / 20, size / 20);
        context.fill(mark);
      }
    }

    context.setTransform(unit, 0, 0, unit, 0, 0);
    context.font = `600 ${COVER.pill.fontSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const pillWidth = context.measureText(text).width + COVER.pill.paddingX * 2;
    const pillX = (COVER.width - pillWidth) / 2;
    const pillY = (COVER.height - COVER.pill.height) / 2;
    context.fillStyle = colors.pill;
    context.beginPath();
    roundedRect(context, pillX, pillY, pillWidth, COVER.pill.height, COVER.pill.height / 2);
    context.fill();
    context.fillStyle = colors.pillText;
    context.fillText(text, COVER.width / 2, COVER.height / 2 + 1);

    columns = Math.ceil(COVER.width / GRID.cell);
    wiped = new Uint8Array(columns * Math.ceil(COVER.height / GRID.cell));
    wipedCount = 0;
  };

  /** One soft dab of the brush at a point given in Figma px. */
  const dab = (x: number, y: number, radius: number) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(BRUSH.hardness, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const stamp = (x: number, y: number) => {
    const radius = BRUSH.radius * (1 + (Math.random() * 2 - 1) * BRUSH.jitter);
    dab(x, y, radius);
    for (let speck = 0; speck < BRUSH.specks; speck++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (0.8 + Math.random() * 0.25);
      dab(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, radius * BRUSH.speckSize);
    }

    const reach = radius * GRID.reach;
    const rows = wiped.length / columns;
    for (let row = Math.max(0, Math.floor((y - reach) / GRID.cell)); row <= Math.min(rows - 1, Math.floor((y + reach) / GRID.cell)); row++) {
      for (let column = Math.max(0, Math.floor((x - reach) / GRID.cell)); column <= Math.min(columns - 1, Math.floor((x + reach) / GRID.cell)); column++) {
        const index = row * columns + column;
        const dx = (column + 0.5) * GRID.cell - x;
        const dy = (row + 0.5) * GRID.cell - y;
        if (wiped[index] === 0 && dx * dx + dy * dy <= reach * reach) {
          wiped[index] = 1;
          wipedCount++;
        }
      }
    }
  };

  /** Wipes from the last point to the new one, stamping the brush every few px. */
  const wipe = (fromX: number, fromY: number, toX: number, toY: number) => {
    context.globalCompositeOperation = 'destination-out';
    context.setTransform(unit, 0, 0, unit, 0, 0);
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(1, Math.ceil(distance / BRUSH.spacing));
    for (let step = 1; step <= steps; step++) {
      stamp(fromX + ((toX - fromX) * step) / steps, fromY + ((toY - fromY) * step) / steps);
    }
  };

  /** Pointer position in Figma px, correct inside scaled or transformed ancestors too. */
  const locate = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * COVER.width,
      y: ((event.clientY - rect.top) / rect.height) * COVER.height,
    };
  };

  const reveal = () => {
    if (locked) return;
    locked = true;
    press = null;
    onReveal();
  };

  const onDown = (event: PointerEvent) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // No capture (the pointer is already gone, or the event is synthetic): moves still arrive while over the card.
    }
    const point = locate(event);
    press = { ...point, startX: point.x, startY: point.y, at: performance.now(), moved: 0 };
    wipe(point.x, point.y, point.x, point.y);
  };

  const onMove = (event: PointerEvent) => {
    if (locked || !press) return;
    event.preventDefault();
    const point = locate(event);
    wipe(press.x, press.y, point.x, point.y);
    press.moved = Math.max(press.moved, Math.hypot(point.x - press.startX, point.y - press.startY));
    press.x = point.x;
    press.y = point.y;
    if (wipedCount / wiped.length >= threshold) reveal();
  };

  const onUp = (event: PointerEvent) => {
    if (locked || !press) return;
    event.stopPropagation();
    const tapped = press.moved < TAP.distance && performance.now() - press.at < TAP.milliseconds;
    press = null;
    if (tapped) reveal();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    reveal();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('keydown', onKey);
  // A click after scratching must not reach the story underneath as a "next screen" tap.
  const swallow = (event: Event) => event.stopPropagation();
  canvas.addEventListener('click', swallow);
  paint();

  return {
    reset() {
      locked = false;
      press = null;
      paint();
    },
    lock() {
      locked = true;
      press = null;
    },
    get progress() {
      return wiped.length > 0 ? wipedCount / wiped.length : 0;
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', swallow);
    },
  };
}
