import gsap from 'gsap';
import { roundedRect } from '../shared/canvas';
import { DEFAULT_MAX_SCALE, observeSize } from '../shared/fit';
import { ensureStyles } from '../shared/styles';

export interface MoneyRainOptions {
  /**
   * The element the money bursts out from, e.g. the container of PayCard.
   * Without it the burst starts at the middle of the layer, 70 % down, where the amount is on the Figma screen.
   */
  origin?: HTMLElement;
  /** Start right after mounting. Defaults to false: call `play()` from PayCard's `onRevealed`. */
  autoplay?: boolean;
  /** Called when the last bill has left the layer, about 3 s after `play()`. */
  onComplete?: () => void;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
}

export interface MoneyRainController {
  /** Resolved from the start: the rain is drawn in code and has no images to wait for. */
  readonly ready: Promise<void>;
  /** Starts the burst, or resumes it when paused. After it has finished, starts a new one. */
  play(): void;
  pause(): void;
  /** Stops and removes the layer. */
  destroy(): void;
}

const STYLES = /* css */ `
.wu-money-rain {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
`;

/** Figma sizes: a bill is 39.2 x 19.6, a coin 21.74 across, both with the same drop shadow. */
const BILL = { width: 39.2, height: 19.6, radius: 2.1, inset: 2.6, frameRadius: 1.4, circle: 4.4, fontSize: 7 };
const COIN = { size: 21.74, inner: 7.544, fontSize: 9.783 };
const SHADOW = { offsetY: 4, blur: 8, color: 'rgba(0, 0, 0, 0.25)', padding: 14 };

/**
 * The 9 bills and 9 coins of the Figma frame "09 Pay · Revealed · Money rain" (360 x 782):
 * where each one is on the screen, and its scale (bills) or diameter (coins).
 */
const BILLS = [
  { x: 321.75, y: 215.7, scale: 0.96 },
  { x: 147.85, y: 427.8, scale: 1.74 },
  { x: 328.95, y: 389.7, scale: 1.25 },
  { x: 33.55, y: 493, scale: 1.19 },
  { x: 89.05, y: 664.4, scale: 1.37 },
  { x: 182.8, y: 38.85, scale: 1.45 },
  { x: 343.95, y: 447.3, scale: 1.19 },
  { x: 20.95, y: 591.85, scale: 1.35 },
  { x: 126.55, y: 61.85, scale: 1.5 },
];
const COINS = [
  { x: 313.15, y: 143.15, size: 21.7 },
  { x: 32.3, y: 402.3, size: 20.3 },
  { x: 191.4, y: 421.4, size: 18.8 },
  { x: 334.5, y: 494.5, size: 24 },
  { x: 301.5, y: 661.5, size: 19 },
  { x: 233.4, y: 133.4, size: 22.1 },
  { x: 340.4, y: 570.4, size: 17.2 },
  { x: 209.6, y: 769.6, size: 15.9 },
  { x: 280.1, y: 40.1, size: 16.7 },
];
const FIGMA_SCREEN = { width: 360, height: 782 };
const LARGEST_BILL = Math.max(...BILLS.map((bill) => bill.scale));

/**
 * The burst: every piece shoots from behind the amount to its place in the Figma frame, so for a moment the
 * whole screen looks like that frame, then flutters down at its own speed, turning and swaying like confetti,
 * and leaves through the bottom. Speeds in Figma px per second, angles in degrees.
 */
const MOTION = {
  /** Seconds a piece takes to reach its place, and how much later some start than others. */
  reach: [0.55, 0.85],
  stagger: 0.15,
  /** Falling speed it settles into, by kind, and how quickly it gets there. */
  fall: { bill: [240, 320], coin: [330, 430] },
  drag: 2.2,
  spin: [90, 300],
  flip: [2.5, 6],
  sway: [8, 22],
  swayPeriod: [1.1, 1.9],
  fadeIn: 0.12,
  /** Everything has left the screen by now. */
  seconds: 3.4,
  /** A piece is off screen once it is this far below the bottom edge. */
  exit: 60,
} as const;

type Range = readonly [number, number];

interface Piece {
  kind: 'bill' | 'coin';
  /** Scale relative to the sprite. */
  scale: number;
  /** Its place in the Figma frame. */
  x: number;
  y: number;
  delay: number;
  reach: number;
  fall: number;
  rotate: number;
  spin: number;
  flipPhase: number;
  flipSpeed: number;
  sway: number;
  swayPeriod: number;
  swayPhase: number;
}

/** Small deterministic generator, so every burst looks the same. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: ([min, max]: Range) => min + next() * (max - min),
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

function createPieces(): Piece[] {
  const random = createRandom(9);
  const piece = (kind: Piece['kind'], x: number, y: number, scale: number): Piece => ({
    kind,
    scale,
    x,
    y,
    delay: random.next() * MOTION.stagger,
    reach: random.between(MOTION.reach),
    fall: random.between(MOTION.fall[kind]),
    rotate: random.next() * 360,
    spin: random.sign() * random.between(MOTION.spin),
    flipPhase: random.next() * Math.PI * 2,
    flipSpeed: random.between(MOTION.flip),
    sway: random.between(MOTION.sway),
    swayPeriod: random.between(MOTION.swayPeriod),
    swayPhase: random.next() * Math.PI * 2,
  });
  return [
    ...BILLS.map((bill) => piece('bill', bill.x, bill.y, bill.scale)),
    ...COINS.map((coin) => piece('coin', coin.x, coin.y, coin.size / COIN.size)),
  ];
}

interface Sprite {
  image: HTMLCanvasElement;
  /** Size of the sprite, shadow included, in Figma px. */
  width: number;
  height: number;
}

interface Palette {
  bill: string;
  billInk: string;
  billCircle: string;
  coin: string;
  coinInner: string;
  coinRim: string;
  coinInk: string;
}

/** Draws a piece once, shadow included, so that every frame is only a handful of image blits. */
function createSprite(width: number, height: number, pixelsPerUnit: number, draw: (context: CanvasRenderingContext2D) => void): Sprite {
  const image = document.createElement('canvas');
  const fullWidth = width + SHADOW.padding * 2;
  const fullHeight = height + SHADOW.padding * 2;
  image.width = Math.ceil(fullWidth * pixelsPerUnit);
  image.height = Math.ceil(fullHeight * pixelsPerUnit);
  const context = image.getContext('2d')!;
  context.scale(pixelsPerUnit, pixelsPerUnit);
  context.translate(SHADOW.padding, SHADOW.padding);
  draw(context);
  return { image, width: fullWidth, height: fullHeight };
}

function withShadow(context: CanvasRenderingContext2D, pixelsPerUnit: number, fill: () => void) {
  context.save();
  // Canvas shadows ignore the transform, so they are given in real pixels.
  context.shadowColor = SHADOW.color;
  context.shadowBlur = SHADOW.blur * pixelsPerUnit;
  context.shadowOffsetY = SHADOW.offsetY * pixelsPerUnit;
  fill();
  context.restore();
}

function dollar(context: CanvasRenderingContext2D, x: number, y: number, weight: number, size: number, color: string, fontFamily: string) {
  context.font = `${weight} ${size}px ${fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText('$', x, y + size * 0.04);
}

function billSprite(palette: Palette, pixelsPerUnit: number, fontFamily: string): Sprite {
  return createSprite(BILL.width, BILL.height, pixelsPerUnit, (context) => {
    withShadow(context, pixelsPerUnit, () => {
      context.fillStyle = palette.bill;
      context.beginPath();
      roundedRect(context, 0, 0, BILL.width, BILL.height, BILL.radius);
      context.fill();
    });
    context.strokeStyle = palette.billInk;
    context.lineWidth = 1;
    context.beginPath();
    roundedRect(context, BILL.inset, BILL.inset, BILL.width - BILL.inset * 2, BILL.height - BILL.inset * 2, BILL.frameRadius);
    context.stroke();
    context.fillStyle = palette.billCircle;
    context.beginPath();
    context.arc(BILL.width / 2, BILL.height / 2, BILL.circle, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    dollar(context, BILL.width / 2, BILL.height / 2, 700, BILL.fontSize, palette.billInk, fontFamily);
  });
}

function coinSprite(palette: Palette, pixelsPerUnit: number, fontFamily: string): Sprite {
  const centre = COIN.size / 2;
  return createSprite(COIN.size, COIN.size, pixelsPerUnit, (context) => {
    withShadow(context, pixelsPerUnit, () => {
      context.fillStyle = palette.coin;
      context.beginPath();
      context.arc(centre, centre, centre, 0, Math.PI * 2);
      context.fill();
    });
    context.fillStyle = palette.coinInner;
    context.strokeStyle = palette.coinRim;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(centre, centre, COIN.inner, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    dollar(context, centre, centre, 800, COIN.fontSize, palette.coinInk, fontFamily);
  });
}

function readPalette(node: HTMLElement): Palette {
  const style = getComputedStyle(node);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bill: token('--olive-300', '#dce7cf'),
    billInk: token('--brand-500', '#066e3d'),
    billCircle: token('--green-200', '#c8ebd3'),
    coin: token('--yellow-400', '#f7c468'),
    coinInner: token('--yellow-300', '#fbd48a'),
    coinRim: token('--yellow-500', '#dba145'),
    coinInk: token('--yellow-700', '#be8735'),
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Mounts the 09 money rain as a canvas that fills `el`: bills and coins burst out from behind the amount
 * across the whole layer, into the arrangement of the Figma frame, then fall like confetti and leave through
 * the bottom, about 3 s in all. Drawn in code, no images.
 * Put the layer over the whole screen, above the card, and call `play()` from PayCard's `onRevealed`.
 * With the system's reduced motion there is no rain.
 */
export function mountMoneyRain(el: HTMLElement, options: MoneyRainOptions = {}): MoneyRainController {
  const { origin, autoplay = false, onComplete, maxScale = DEFAULT_MAX_SCALE } = options;
  const reducedMotion = prefersReducedMotion();

  ensureStyles('money-rain', STYLES);
  const canvas = document.createElement('canvas');
  canvas.className = 'wu-money-rain';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  const context = canvas.getContext('2d')!;
  const fontFamily = getComputedStyle(canvas).fontFamily;
  const palette = readPalette(canvas);
  const pieces = createPieces();

  let unit = 1;
  let ratio = 1;
  let sprites: Record<Piece['kind'], Sprite> | null = null;
  let destroyed = false;

  /** Where the burst starts, in layout px of the canvas. */
  const start = () => {
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    if (!origin) return { x: width / 2, y: height * 0.7 };
    const canvasRect = canvas.getBoundingClientRect();
    const originRect = origin.getBoundingClientRect();
    const zoom = canvasRect.width / width || 1;
    return {
      x: (originRect.left + originRect.width / 2 - canvasRect.left) / zoom,
      y: (originRect.top + originRect.height / 2 - canvasRect.top) / zoom,
    };
  };

  function draw(elapsed: number) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprites || elapsed <= 0 || elapsed >= MOTION.seconds) return;
    const from = start();

    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    for (const piece of pieces) {
      const time = elapsed - piece.delay;
      if (time <= 0) continue;
      // The Figma frame is stretched over the whole layer, whatever the phone's proportions.
      const homeX = (piece.x / FIGMA_SCREEN.width) * width;
      const homeY = (piece.y / FIGMA_SCREEN.height) * height;
      const flight = Math.min(time / piece.reach, 1);
      const arrived = 1 - Math.pow(1 - flight, 3);
      // Falling: from rest it speeds up to its own pace, fast enough to be gone when the rain ends.
      const falling = Math.max(time - piece.reach, 0);
      const left = MOTION.seconds - piece.delay - piece.reach - 1 / MOTION.drag;
      const pace = Math.max(piece.fall * unit, (height - homeY + MOTION.exit * unit) / left);
      const dropped = pace * (falling - (1 - Math.exp(-MOTION.drag * falling)) / MOTION.drag);
      const sway = Math.sin((Math.PI * 2 * time) / piece.swayPeriod + piece.swayPhase) * piece.sway * unit * flight;
      const x = from.x + (homeX - from.x) * arrived + sway;
      const y = from.y + (homeY - from.y) * arrived + dropped;
      // A bill tumbles end over end, a coin spins around its upright axis.
      const flip = Math.cos(piece.flipPhase + piece.flipSpeed * time);
      const sprite = sprites[piece.kind];
      const pixels = piece.scale * unit * ratio;

      context.setTransform(1, 0, 0, 1, x * ratio, y * ratio);
      context.rotate(((piece.rotate + piece.spin * time) * Math.PI) / 180);
      context.scale(piece.kind === 'coin' ? flip : 1, piece.kind === 'bill' ? flip : 1);
      context.globalAlpha = Math.min(time / MOTION.fadeIn, 1);
      context.drawImage(sprite.image, (-sprite.width * pixels) / 2, (-sprite.height * pixels) / 2, sprite.width * pixels, sprite.height * pixels);
    }
    context.globalAlpha = 1;
  }

  const clock = gsap.to(
    {},
    {
      duration: MOTION.seconds,
      ease: 'none',
      paused: true,
      onUpdate: () => draw(clock.time()),
      onComplete: () => {
        draw(MOTION.seconds);
        onComplete?.();
      },
    },
  );

  const stopSizing = observeSize(canvas, ({ width, height }) => {
    if (width === 0 || height === 0) return;
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    unit = Math.min(width / 360, maxScale);
    // Sprites are drawn for the largest piece, so scaling one down never blurs it.
    const pixelsPerUnit = unit * ratio * LARGEST_BILL;
    sprites = {
      bill: billSprite(palette, pixelsPerUnit, fontFamily),
      coin: coinSprite(palette, pixelsPerUnit, fontFamily),
    };
    draw(clock.time());
  });

  const controller: MoneyRainController = {
    ready: Promise.resolve(),
    play() {
      if (destroyed) return;
      if (reducedMotion) {
        onComplete?.();
        return;
      }
      if (clock.progress() === 1) clock.restart();
      else clock.play();
    },
    pause() {
      clock.pause();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clock.kill();
      stopSizing();
      canvas.remove();
    },
  };

  if (autoplay) controller.play();
  return controller;
}
