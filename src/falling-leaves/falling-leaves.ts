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

/**
 * The pieces that are whole flowers, by their Figma layers: the snowdrops of March, the lilac florets of May
 * and the daisies of June. Petals (April, August) and leaves (September to November) are light and swing.
 */
const FLOWERS = /snowdrop|lilac-floret|daisy/;

/** Seconds after `play()` at which the looping pieces pass through their Figma positions. */
const HOME_AT = 3;
const FADE_IN = 0.6;
const TAU = Math.PI * 2;

/**
 * Speeds are Figma px per second, angles degrees, times seconds.
 * A falling piece swings like a pendulum (see `swing`): `period` is one swing there and back, `reach` how far
 * it goes to each side, `lean` how far it tips into its direction of travel, `stall` how much of its fall it
 * loses at the ends of a swing (and gains in the middle). `narrow` is the turn in depth it makes now and then:
 * every `every` seconds, for `seconds`, down to `to` of its width. On top of that it drifts in a wide slow arc.
 * Every piece draws its own values from these ranges, so no two move together.
 */
const MOTION = {
  tumbles: {
    speed: [50, 70],
    period: [2.5, 3.6],
    reach: [22, 38],
    lean: [20, 32],
    stall: [0.75, 1],
    narrow: { every: [3.6, 5.6], seconds: [0.8, 1.15], to: [0.12, 0.35] },
    heading: [10, 22],
    headingPeriod: [8, 12],
    meander: [16, 30],
    meanderPeriod: [10, 14],
    respawn: 40,
  },
  sways: {
    speed: [40, 54],
    period: [3, 4.2],
    reach: [16, 28],
    lean: [14, 24],
    stall: [0.65, 0.9],
    narrow: { every: [5.5, 8.5], seconds: [0.9, 1.3], to: [0.3, 0.55] },
    heading: [6, 14],
    headingPeriod: [9, 13],
    meander: [12, 24],
    meanderPeriod: [8, 11],
    respawn: 40,
  },
  lands: { firstAt: 4.4, gap: 0.8, speed: 70, easePower: 1.6, period: [1.9, 2.6], reach: [18, 30], lean: [18, 28], spin: [20, 45] },
  /**
   * A whole flower is heavier than a leaf or a petal: it comes straight down at an even speed, turning
   * slowly around itself (`spin`, degrees per second, either way), with only a slight slow drift sideways.
   * `landSpin` is how far a flower that lands still turns on its way down.
   */
  flowers: {
    speed: { tumbles: [58, 78], sways: [48, 62] },
    spin: [14, 38],
    drift: [5, 12],
    driftPeriod: [9, 14],
    respawn: 40,
    landSpin: [50, 120],
    landDrift: [4, 9],
  },
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
  /** Width as a share of the full width while the piece turns in depth; 1 when it faces the viewer. */
  narrow?: number;
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

/** One swing of a pendulum at a moment in time. */
interface Swing {
  /** Where it is between the ends of the swing, -1 to 1. Slow at the ends, fastest through the middle. */
  side: number;
  /** How fast it is moving sideways, -1 to 1: positive to the right. */
  pace: number;
  /** Extra fall so far, in swings: the piece drops fastest through the middle and almost hangs at the ends. */
  drop: number;
}

/**
 * A pendulum `time` seconds in: the sideways position is a sine, so the piece slows towards each end and
 * speeds up through the middle by itself; its pace is the cosine, a quarter turn ahead.
 */
function swing(time: number, period: number, phase: number): Swing {
  const angle = (TAU * time) / period + phase;
  return { side: Math.sin(angle), pace: Math.cos(angle), drop: Math.sin(2 * angle) };
}

interface FloatRanges {
  speed: Range;
  period: Range;
  reach: Range;
  lean: Range;
  stall: Range;
  narrow: { every: Range; seconds: Range; to: Range };
  heading: Range;
  headingPeriod: Range;
  meander: Range;
  meanderPeriod: Range;
  respawn: number;
}

/**
 * A piece that keeps floating down from above the layer to below it, swinging from side to side.
 * It leans into the direction it is travelling, loses most of its fall at the ends of each swing and makes
 * it up through the middle, and now and then turns in depth so that it narrows for a moment.
 * Its timing is set so that it is exactly at its Figma position, at its Figma angle, at HOME_AT.
 */
function floats(seed: number, size: number, ranges: FloatRanges): Sprite['pose'] {
  const random = createRandom(seed);
  const speed = random.between(ranges.speed);
  const period = random.between(ranges.period);
  const reach = random.between(ranges.reach);
  const lean = random.between(ranges.lean);
  // How far the fall is ahead or behind an even fall, at most: a share of the distance of half a swing.
  const stall = (random.between(ranges.stall) * speed * period) / (2 * TAU);
  // Where in its swing the piece is at HOME_AT: different for each, so they never move in step.
  const phase = random.between([0, TAU]);
  const heading = random.between(ranges.heading);
  const headingPeriod = random.between(ranges.headingPeriod);
  const headingPhase = random.between([0, TAU]);
  const meander = random.between(ranges.meander);
  const meanderPeriod = random.between(ranges.meanderPeriod);
  const meanderTurn = random.sign();
  const narrowEvery = random.between(ranges.narrow.every);
  const narrowSeconds = random.between(ranges.narrow.seconds);
  const narrowTo = random.between(ranges.narrow.to);
  // Never in the middle of a turn at HOME_AT, where the piece shows as Figma draws it.
  const narrowLead = random.between([narrowSeconds + 0.3, narrowEvery - 0.3]);
  const atHome = swing(0, period, phase);

  return (elapsed, home, layout) => {
    const sinceHome = elapsed - HOME_AT;
    const now = swing(sinceHome, period, phase);

    // The even fall, wrapping from the bottom of the layer back to the top.
    const pad = (size + stall + 12) * layout.scale;
    const span = layout.height + pad * 2;
    const duration = span / (speed * layout.scale);
    const homeFraction = (home.y + pad) / span;
    const trips = sinceHome / duration + homeFraction;
    const trip = Math.floor(trips);
    const column = trip === 0 ? 0 : tripOffset(seed, trip) * ranges.respawn;

    // A wide slow arc under the swinging, shifted so that it leans towards the middle of the screen.
    const centre = layout.width / 2;
    const bias = Math.min(Math.max((centre - home.x) / centre, -1), 1) * MOTION.inwardBias;
    const arcPhase = meanderTurn > 0 ? Math.asin(-bias) : Math.PI - Math.asin(-bias);
    const arc = Math.sin((TAU * sinceHome) / meanderPeriod + arcPhase) - Math.sin(arcPhase);
    const turned = Math.sin((TAU * sinceHome) / headingPeriod + headingPhase) - Math.sin(headingPhase);

    // Now and then it turns in depth and back: edge-on it is only a sliver wide.
    const sinceTurn = (((sinceHome + narrowLead) % narrowEvery) + narrowEvery) % narrowEvery;
    const turning = sinceTurn < narrowSeconds ? Math.sin((Math.PI * sinceTurn) / narrowSeconds) : 0;
    // And at the ends of a swing it shows a little less of its face.
    const facing = 1 - 0.1 * now.side * now.side;

    return {
      ...home,
      x: home.x + (column + arc * meander + (now.side - atHome.side) * reach) * layout.scale,
      y: -pad + (trips - trip) * span + (now.drop - atHome.drop) * stall * layout.scale,
      rotate: home.rotate + (now.pace - atHome.pace) * lean + turned * heading,
      narrow: facing * (1 - (1 - narrowTo) * turning * turning),
    };
  };
}

/**
 * A flower that keeps coming down from above the layer to below it: straight and even, without hanging
 * at the sides, turning slowly around itself in its own direction and at its own pace.
 * Like the leaves it is exactly at its Figma position, at its Figma angle, at HOME_AT.
 */
function drops(seed: number, size: number, speedRange: Range): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.flowers;
  const speed = random.between(speedRange);
  const spin = random.sign() * random.between(config.spin);
  const drift = random.between(config.drift);
  const driftPeriod = random.between(config.driftPeriod);
  const driftTurn = random.sign();

  return (elapsed, home, layout) => {
    const sinceHome = elapsed - HOME_AT;
    const pad = size * layout.scale;
    const span = layout.height + pad * 2;
    const trips = sinceHome / (span / (speed * layout.scale)) + (home.y + pad) / span;
    const trip = Math.floor(trips);
    const column = trip === 0 ? 0 : tripOffset(seed, trip) * config.respawn;

    // The slow drift leans towards the middle of the screen, as the leaves' arc does.
    const centre = layout.width / 2;
    const bias = Math.min(Math.max((centre - home.x) / centre, -1), 1) * MOTION.inwardBias;
    const phase = driftTurn > 0 ? Math.asin(-bias) : Math.PI - Math.asin(-bias);
    const drifted = Math.sin((TAU * sinceHome) / driftPeriod + phase) - Math.sin(phase);

    return {
      ...home,
      x: home.x + (column + drifted * drift) * layout.scale,
      y: -pad + (trips - trip) * span,
      rotate: home.rotate + spin * sinceHome,
    };
  };
}

/** A flower that comes down after the others: straight, turning ever more slowly, and stays on its Figma position. */
function settles(seed: number, order: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.lands;
  const landAt = config.firstAt + order * config.gap;
  const distance = (config.speed * landAt) / config.easePower;
  const spin = random.sign() * random.between(MOTION.flowers.landSpin);
  const drift = random.sign() * random.between(MOTION.flowers.landDrift);

  return (elapsed, home, layout) => {
    const progress = Math.min(Math.max(elapsed / landAt, 0), 1);
    const remaining = Math.pow(1 - progress, config.easePower);
    return {
      ...home,
      x: home.x + drift * remaining * layout.scale,
      y: home.y - distance * remaining * layout.scale,
      rotate: home.rotate + spin * remaining,
    };
  };
}

/**
 * Comes down after the others, swinging like them; the swings die away as it slows,
 * and it settles on its Figma position, then stays.
 */
function lands(seed: number, order: number): Sprite['pose'] {
  const random = createRandom(seed);
  const config = MOTION.lands;
  const landAt = config.firstAt + order * config.gap;
  const distance = (config.speed * landAt) / config.easePower;
  const period = random.between(config.period);
  const reach = random.between(config.reach);
  const lean = random.between(config.lean);
  const spin = random.sign() * random.between(config.spin);
  const phase = random.between([0, TAU]);

  return (elapsed, home, layout) => {
    const progress = Math.min(Math.max(elapsed / landAt, 0), 1);
    const remaining = Math.pow(1 - progress, config.easePower);
    // Counted back from the landing, so the last swing always ends on the spot.
    const now = swing(Math.min(elapsed, landAt) - landAt, period, phase);
    const still = swing(0, period, phase);
    return {
      ...home,
      x: home.x + (now.side - still.side) * reach * remaining * layout.scale,
      y: home.y - distance * remaining * layout.scale,
      rotate: home.rotate + spin * remaining + (now.pace - still.pace) * lean * remaining,
      narrow: 1 - 0.14 * now.side * now.side * remaining,
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
  const speed = config.speedBase + flake.r * config.speedPerRadius;
  const sway = random.between(config.swayAmp);
  const swayPeriod = random.between(config.swayPeriod);

  return (elapsed, home, layout) => {
    const sinceHome = elapsed - HOME_AT;
    const pad = size * layout.scale;
    const span = layout.height + pad * 2;
    const trips = sinceHome / (span / (speed * layout.scale)) + (home.y + pad) / span;
    const trip = Math.floor(trips);
    const column = trip === 0 ? 0 : tripOffset(seed, trip) * config.respawn;
    const drift = Math.sin((TAU * sinceHome) / swayPeriod);
    return { ...home, x: home.x + (column + drift * sway) * layout.scale, y: -pad + (trips - trip) * span };
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
  // Whole flowers are heavier than leaves and petals and fall differently.
  const flower = FLOWERS.test(piece.asset);
  const poses = {
    tumbles: () => (flower ? drops(seed, piece.size, MOTION.flowers.speed.tumbles) : floats(seed, piece.size, MOTION.tumbles)),
    sways: () => (flower ? drops(seed, piece.size, MOTION.flowers.speed.sways) : floats(seed, piece.size, MOTION.sways)),
    lands: () => (flower ? settles(seed, order) : lands(seed, order)),
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
      const narrow = pose.narrow ?? 1;
      sprite.node.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale * narrow}, ${pose.scale})`;
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
