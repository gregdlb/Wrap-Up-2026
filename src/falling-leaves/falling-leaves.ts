import gsap from 'gsap';
import { DEFAULT_MAX_SCALE, observeSize } from '../shared/fit';
import { createStartGate, decodeImage, LATE_FADE_SECONDS } from '../shared/images';
import { placeFrameAtBottom, placeFrameIn } from '../shared/screen-05';
import { ensureStyles } from '../shared/styles';
import { ASSET_URLS, type AssetName } from './assets';
import { MONTH_PIECES, SNOW_FLAKES, SNOW_MONTHS, type Flake, type Piece } from './pieces';

export interface FallingLeavesLayers {
  /** Goes under the card. Gets the pieces Figma paints below the card's pages, and the snow. */
  back: HTMLElement;
  /** Goes above the card and the text. Gets the pieces Figma paints over the card's pages. Ignores taps. */
  front: HTMLElement;
}

export interface FallingLeavesData {
  /** 1 = January … 12 = December. Each month has its own watercolor pieces. */
  month: number;
  /**
   * The element BusiestMonthCard is mounted in. The pieces are then arranged around the card as in Figma.
   * Without it the card is assumed to sit centred at the bottom of the layers, as on the Figma screen.
   */
  anchor?: HTMLElement;
}

export interface FallingLeavesOptions {
  /** Start right after mounting. Defaults to false. */
  autoplay?: boolean;
  /** Largest scale relative to the Figma size. Defaults to 1.15, the same as the card. */
  maxScale?: number;
  /** Folder with the sprites, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export interface FallingLeavesController {
  /** Resolves when all sprites of the month are downloaded and decoded. Await it before `play()`. */
  readonly ready: Promise<void>;
  /**
   * Starts or resumes the loop. Called before `ready`, it waits for the sprites (2 s at most);
   * one that is still missing after that fades in when it arrives.
   */
  play(): void;
  pause(): void;
  /** Jumps to `t` seconds after the start, in both layers. Keeps the current playing/paused state. */
  seek(t: number): void;
  /** Stops the loop and removes both layers from their host elements. */
  destroy(): void;
}

const STYLES = /* css */ `
.wu-falling-leaves {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
}

.wu-falling-leaves__piece {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  will-change: transform;
  -webkit-user-select: none;
  user-select: none;
}
`;

/** Seconds after `play()` at which the looping pieces pass through their Figma positions. */
const HOME_AT = 3;
const FADE_IN = 0.6;
const TAU = Math.PI * 2;

/**
 * Speeds are Figma px per second, angles degrees, times seconds.
 * Tuned to the reference video (reference/Demo_m1.mp4): leaves come down at 60–85 px/s, travel in wide slow
 * arcs of 40–80 px over 10–14 s, turn slowly and rock a little on the way.
 */
const MOTION = {
  tumbles: {
    speed: [60, 84],
    spin: [120, 220],
    rock: [8, 16],
    rockPeriod: [2.8, 3.8],
    meander: [36, 64],
    meanderPeriod: [10, 14],
    respawn: 40,
  },
  sways: {
    speed: [48, 60],
    tilt: [14, 22],
    flutter: [6, 10],
    flutterPeriod: [3.2, 4.2],
    meander: [30, 50],
    meanderPeriod: [7, 9],
    respawn: 40,
  },
  lands: { firstAt: 4.4, gap: 0.8, speed: 70, easePower: 1.6, swayAmp: [14, 22], swings: 1.5, spin: [50, 90] },
  bursts: { period: [4.8, 5.6], firstLead: 0.6, lead: 0.45, grow: 0.45, appear: 0.25, holdUntil: 0.55, goneBy: 0.8 },
  snow: { speedBase: 14, speedPerRadius: 8, swayAmp: [3, 8], swayPeriod: [4, 7], respawn: 30, softSize: 2.2 },
  /** How strongly a piece near a screen edge arcs towards the middle rather than off screen (0–1). */
  inwardBias: 0.7,
} as const;

interface Pose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
}

/** Where the Figma frame sits inside the layer, in layout px. */
interface Layout {
  width: number;
  height: number;
  scale: number;
  frameX: number;
  frameY: number;
}

interface Sprite {
  node: HTMLImageElement;
  /** When the image was decoded, in ms: null while loading, -Infinity when it does not need to fade in. */
  loadedAt: number | null;
  layer: Piece['layer'];
  /** Centre in the Figma frame, box size, rotation and opacity at rest. */
  x: number;
  y: number;
  size: number;
  rotate: number;
  opacity: number;
  blur: number;
  pose(elapsed: number, home: Pose, layout: Layout): Pose;
}

type Range = readonly [number, number];

/** Small deterministic generator, so a month looks the same every time it is shown. */
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
    between: ([min, max]: Range) => min + next() * (max - min),
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

/** A repeatable value in [-1, 1] for the n-th trip of a piece down the screen. */
function tripOffset(seed: number, trip: number): number {
  const value = Math.sin(seed * 12.9898 + trip * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

interface FallMotion {
  seed: number;
  speed: number;
  /** Wide slow arc. */
  meander: number;
  meanderPeriod: number;
  /** +1 or -1: which way the arc is heading at the Figma position. */
  meanderTurn: number;
  /** Small quick side to side movement on top of the arc. */
  flutter: number;
  flutterPeriod: number;
  respawn: number;
}

/**
 * A piece that keeps falling from above the layer to below it.
 * Its timing is set so that it is exactly at its Figma position at HOME_AT.
 */
function fallingPose(elapsed: number, home: Pose, layout: Layout, pad: number, motion: FallMotion) {
  const sinceHome = elapsed - HOME_AT;
  const span = layout.height + pad * 2;
  const duration = span / (motion.speed * layout.scale);
  const homeFraction = (home.y + pad) / span;
  const trips = sinceHome / duration + homeFraction;
  const trip = Math.floor(trips);
  const fraction = trips - trip;
  const column = trip === 0 ? 0 : tripOffset(motion.seed, trip) * motion.respawn;

  // The arc is shifted so that it passes through the Figma position and leans towards the middle of the screen.
  const centre = layout.width / 2;
  const bias = Math.min(Math.max((centre - home.x) / centre, -1), 1) * MOTION.inwardBias;
  const phase = motion.meanderTurn > 0 ? Math.asin(-bias) : Math.PI - Math.asin(-bias);
  const arc = motion.meander ? Math.sin((TAU * sinceHome) / motion.meanderPeriod + phase) - Math.sin(phase) : 0;
  const flutter = Math.sin((TAU * sinceHome) / motion.flutterPeriod);

  return {
    fraction: fraction - homeFraction,
    flutter,
    x: home.x + (column + arc * motion.meander + flutter * motion.flutter) * layout.scale,
    y: -pad + fraction * span,
  };
}

function tumbles(seed: number, size: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.tumbles;
  const rockPeriod = random.between(config.rockPeriod);
  const motion: FallMotion = {
    seed,
    speed: random.between(config.speed),
    meander: random.between(config.meander),
    meanderPeriod: random.between(config.meanderPeriod),
    meanderTurn: random.sign(),
    flutter: 0,
    flutterPeriod: rockPeriod,
    respawn: config.respawn,
  };
  const spin = random.sign() * random.between(config.spin);
  const rock = random.between(config.rock);

  return (elapsed, home, layout) => {
    const fall = fallingPose(elapsed, home, layout, size * layout.scale, motion);
    return { ...home, x: fall.x, y: fall.y, rotate: home.rotate + spin * fall.fraction + rock * fall.flutter };
  };
}

function sways(seed: number, size: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.sways;
  const motion: FallMotion = {
    seed,
    speed: random.between(config.speed),
    meander: random.between(config.meander),
    meanderPeriod: random.between(config.meanderPeriod),
    meanderTurn: random.sign(),
    flutter: random.between(config.flutter),
    flutterPeriod: random.between(config.flutterPeriod),
    respawn: config.respawn,
  };
  const tilt = random.between(config.tilt);

  return (elapsed, home, layout) => {
    const fall = fallingPose(elapsed, home, layout, size * layout.scale, motion);
    return { ...home, x: fall.x, y: fall.y, rotate: home.rotate + fall.flutter * tilt };
  };
}

/** Comes down after the others, slows and settles on its Figma position, then stays. */
function lands(seed: number, order: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.lands;
  const landAt = config.firstAt + order * config.gap;
  const distance = (config.speed * landAt) / config.easePower;
  const swayAmp = random.between(config.swayAmp);
  const spin = random.sign() * random.between(config.spin);

  return (elapsed, home, layout) => {
    const progress = Math.min(Math.max(elapsed / landAt, 0), 1);
    const remaining = Math.pow(1 - progress, config.easePower);
    return {
      ...home,
      x: home.x + Math.sin(progress * Math.PI * config.swings) * swayAmp * remaining * layout.scale,
      y: home.y - distance * remaining * layout.scale,
      rotate: home.rotate + spin * remaining,
    };
  };
}

/** Pops open in place, holds, fades and comes back (the July fireworks). */
function bursts(seed: number, order: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.bursts;
  const period = random.between(config.period);
  const lead = config.firstLead + order * config.lead;

  return (elapsed, home) => {
    const time = (((elapsed - HOME_AT + lead) % period) + period) % period;
    const grown = 1 - Math.pow(1 - Math.min(time / config.grow, 1), 3);
    const fading = Math.min(Math.max((time / period - config.holdUntil) / (config.goneBy - config.holdUntil), 0), 1);
    return {
      ...home,
      scale: 0.35 + 0.65 * grown + 0.1 * fading,
      opacity: home.opacity * Math.min(time / config.appear, 1) * (1 - fading),
    };
  };
}

function drifts(seed: number, flake: Flake, size: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.snow;
  const motion: FallMotion = {
    seed,
    speed: config.speedBase + flake.r * config.speedPerRadius,
    meander: 0,
    meanderPeriod: 1,
    meanderTurn: 1,
    flutter: random.between(config.swayAmp),
    flutterPeriod: random.between(config.swayPeriod),
    respawn: config.respawn,
  };

  return (elapsed, home, layout) => {
    const fall = fallingPose(elapsed, home, layout, size * layout.scale, motion);
    return { ...home, x: fall.x, y: fall.y };
  };
}

function createImage(asset: AssetName, assetBaseUrl: string | undefined): HTMLImageElement {
  const node = document.createElement('img');
  node.className = 'wu-falling-leaves__piece';
  node.alt = '';
  node.decoding = 'async';
  node.draggable = false;
  node.src = assetBaseUrl ? `${assetBaseUrl}${asset}.png` : ASSET_URLS[asset];
  return node;
}

function pieceSprite(piece: Piece, index: number, order: number, month: number, assetBaseUrl?: string): Sprite {
  const seed = month * 100 + index;
  const poses = {
    tumbles: () => tumbles(seed, piece.size),
    sways: () => sways(seed, piece.size),
    lands: () => lands(seed, order),
    bursts: () => bursts(seed, order),
  };
  return {
    node: createImage(piece.asset, assetBaseUrl),
    loadedAt: null,
    layer: piece.layer,
    x: piece.x,
    y: piece.y,
    size: piece.size,
    rotate: piece.rotate,
    opacity: 1,
    blur: piece.blur,
    pose: poses[piece.motion](),
  };
}

function flakeSprite(flake: Flake, index: number, assetBaseUrl?: string): Sprite {
  const size = flake.r * 2 * (flake.soft ? MOTION.snow.softSize : 1);
  return {
    node: createImage(flake.soft ? 'snowflake-soft' : 'snowflake', assetBaseUrl),
    loadedAt: null,
    layer: 'back',
    x: flake.x,
    y: flake.y,
    size,
    rotate: 0,
    opacity: flake.opacity,
    blur: 0,
    pose: drifts(1000 + index, flake, size),
  };
}

function createSprites(month: number, assetBaseUrl?: string): Sprite[] {
  if (SNOW_MONTHS.includes(month)) {
    return SNOW_FLAKES.map((flake, index) => flakeSprite(flake, index, assetBaseUrl));
  }
  // Pieces of the same kind take turns: the n-th "lands last" lands n steps later.
  const seen: Record<string, number> = {};
  return (MONTH_PIECES[month] ?? []).map((piece, index) => {
    const order = seen[piece.motion] ?? 0;
    seen[piece.motion] = order + 1;
    return pieceSprite(piece, index, order, month, assetBaseUrl);
  });
}

/** Finds the Figma frame inside the layer: fitted into the anchor like the card, or at the layer's bottom. */
function measureLayout(root: HTMLElement, anchor: HTMLElement | undefined, maxScale: number): Layout | null {
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  if (width === 0 || height === 0) return null;

  const frame = anchor ? placeFrameIn(root, anchor, maxScale) : placeFrameAtBottom({ width, height }, maxScale);
  return frame && { width, height, scale: frame.scale, frameX: frame.x, frameY: frame.y };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** One of the two layers: its element, the pieces painted in it and where the Figma frame sits inside it. */
interface Stage {
  root: HTMLElement;
  sprites: Sprite[];
  layout: Layout | null;
}

function createStage(host: HTMLElement, sprites: Sprite[]): Stage {
  const root = document.createElement('div');
  root.className = 'wu-falling-leaves';
  root.setAttribute('aria-hidden', 'true');
  root.append(...sprites.map((sprite) => sprite.node));
  host.append(root);
  return { root, sprites, layout: null };
}

/**
 * Mounts the month's falling watercolor pieces as two layers with one shared clock:
 * `layers.back` goes under the card, `layers.front` above it, following the layer order in Figma.
 * Each layer fills its element. Independent of BusiestMonthCard.
 */
export function mountFallingLeaves(
  layers: FallingLeavesLayers,
  data: FallingLeavesData,
  options: FallingLeavesOptions = {},
): FallingLeavesController {
  const { autoplay = false, maxScale = DEFAULT_MAX_SCALE, assetBaseUrl } = options;
  const { month, anchor } = data;
  const reducedMotion = prefersReducedMotion();

  ensureStyles('falling-leaves', STYLES);
  const sprites = createSprites(month, assetBaseUrl);
  const stages = (['back', 'front'] as const).map((name) =>
    createStage(
      layers[name],
      sprites.filter((sprite) => sprite.layer === name),
    ),
  );

  let elapsed = 0;
  let destroyed = false;

  const draw = (stage: Stage) => {
    const { layout } = stage;
    if (!layout) return;
    stage.root.style.opacity = String(reducedMotion ? 1 : Math.min(elapsed / FADE_IN, 1));
    for (const sprite of stage.sprites) {
      const home: Pose = {
        x: layout.frameX + sprite.x * layout.scale,
        y: layout.frameY + sprite.y * layout.scale,
        rotate: sprite.rotate,
        scale: 1,
        opacity: sprite.opacity,
      };
      // With reduced motion every piece rests where Figma places it.
      const pose = reducedMotion ? home : sprite.pose(elapsed, home, layout);
      // Invisible until decoded; a sprite that arrives after the start fades in instead of jumping in.
      const sinceLoad = sprite.loadedAt === null ? 0 : (performance.now() - sprite.loadedAt) / 1000;
      const loaded = Math.min(sinceLoad / LATE_FADE_SECONDS, 1);
      sprite.node.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale})`;
      sprite.node.style.opacity = String(pose.opacity * loaded);
    }
  };

  const relayout = (stage: Stage) => {
    stage.layout = measureLayout(stage.root, anchor, maxScale);
    if (!stage.layout) return;
    for (const sprite of stage.sprites) {
      const size = sprite.size * stage.layout.scale;
      sprite.node.style.width = `${size}px`;
      sprite.node.style.height = `${size}px`;
      sprite.node.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      sprite.node.style.filter = sprite.blur ? `blur(${sprite.blur * stage.layout.scale}px)` : '';
    }
    draw(stage);
  };

  const stopObserving = [
    ...stages.map((stage) => observeSize(stage.root, () => relayout(stage))),
    anchor ? observeSize(anchor, () => stages.forEach(relayout)) : () => {},
  ];

  const clock = gsap.to(
    {},
    {
      duration: 1,
      ease: 'none',
      repeat: -1,
      paused: true,
      onUpdate() {
        elapsed = clock.totalTime();
        stages.forEach(draw);
      },
    },
  );

  // A sprite that arrives while the pieces are already moving fades in; otherwise it is simply there.
  const ready = Promise.all(
    sprites.map((sprite) =>
      decodeImage(sprite.node).then(() => {
        if (destroyed) return;
        sprite.loadedAt = clock.isActive() ? performance.now() : -Infinity;
        stages.forEach(draw);
      }),
    ),
  ).then(() => undefined);
  const gate = createStartGate(ready);

  const controller: FallingLeavesController = {
    ready,
    play() {
      if (destroyed || reducedMotion) return;
      gate.whenOpen(() => {
        if (!destroyed) clock.play();
      });
    },
    pause() {
      gate.cancel();
      clock.pause();
    },
    seek(t) {
      if (destroyed || reducedMotion) return;
      clock.totalTime(Math.max(t, 0), true);
      elapsed = clock.totalTime();
      stages.forEach(draw);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gate.cancel();
      clock.kill();
      stopObserving.forEach((stop) => stop());
      stages.forEach((stage) => stage.root.remove());
    },
  };

  if (autoplay) controller.play();
  return controller;
}
