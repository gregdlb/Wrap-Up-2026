// src/falling-leaves/falling-leaves.ts
import gsap from "gsap";

// src/shared/fit.ts
var DEFAULT_MAX_SCALE = 1.15;
function containScale(box, design, maxScale) {
  return Math.min(box.width / design.width, box.height / design.height, maxScale);
}
function observeSize(element, onSize) {
  onSize({ width: element.clientWidth, height: element.clientHeight });
  if (typeof ResizeObserver === "undefined")
    return () => {};
  const observer = new ResizeObserver(([entry]) => {
    if (entry)
      onSize({ width: entry.contentRect.width, height: entry.contentRect.height });
  });
  observer.observe(element);
  return () => observer.disconnect();
}

// src/shared/styles.ts
function ensureStyles(id, css) {
  if (document.querySelector(`style[data-wrap-up="${id}"]`))
    return;
  const style = document.createElement("style");
  style.dataset.wrapUp = id;
  style.textContent = css;
  document.head.append(style);
}

// src/shared/images.ts
var READY_TIMEOUT_SECONDS = 2;
var LATE_FADE_SECONDS = 0.2;
function decodeImage(image) {
  if (!image.src)
    return Promise.resolve();
  if (typeof image.decode === "function")
    return image.decode().catch(() => {
      return;
    });
  if (image.complete)
    return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}
function createStartGate(ready) {
  let open = ready === undefined;
  let pending = null;
  let waiting = null;
  ready?.then(() => {
    open = true;
  });
  return {
    whenOpen(start) {
      if (open)
        return start();
      pending = start;
      waiting ??= Promise.race([
        ready,
        new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT_SECONDS * 1000))
      ]).then(() => {
        open = true;
        const run = pending;
        pending = null;
        run?.();
      });
    },
    cancel() {
      pending = null;
    }
  };
}

// src/shared/screen-05.ts
var MONTHS_CARD_FRAME = { width: 360, height: 350 };
var MONTHS_CARD_BOTTOM_GAP = 19;
function placeFrameIn(layer, box, maxScale) {
  const width = box.offsetWidth;
  const height = box.offsetHeight;
  if (width === 0)
    return null;
  const scale = containScale({ width, height: height > 0 ? height : Infinity }, MONTHS_CARD_FRAME, maxScale);
  const fittedHeight = height > 0 ? height : MONTHS_CARD_FRAME.height * scale;
  const inside = {
    x: (width - MONTHS_CARD_FRAME.width * scale) / 2,
    y: (fittedHeight - MONTHS_CARD_FRAME.height * scale) / 2
  };
  if (box === layer)
    return { scale, ...inside };
  const boxRect = box.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const zoom = boxRect.width / width || 1;
  return {
    scale,
    x: (boxRect.left - layerRect.left) / zoom + inside.x,
    y: (boxRect.top - layerRect.top) / zoom + inside.y
  };
}
function placeFrameAtBottom(layer, maxScale) {
  const scale = Math.min(layer.width / MONTHS_CARD_FRAME.width, maxScale);
  return {
    scale,
    x: (layer.width - MONTHS_CARD_FRAME.width * scale) / 2,
    y: layer.height - (MONTHS_CARD_FRAME.height + MONTHS_CARD_BOTTOM_GAP) * scale
  };
}

// src/falling-leaves/assets.ts
var ASSET_URLS = {
  "april-petal-1": new URL("./assets/april-petal-1.png", import.meta.url).href,
  "april-petal-2": new URL("./assets/april-petal-2.png", import.meta.url).href,
  "april-petal-3": new URL("./assets/april-petal-3.png", import.meta.url).href,
  "august-petal-1": new URL("./assets/august-petal-1.png", import.meta.url).href,
  "august-petal-2": new URL("./assets/august-petal-2.png", import.meta.url).href,
  "august-petal-3": new URL("./assets/august-petal-3.png", import.meta.url).href,
  "july-firework-1": new URL("./assets/july-firework-1.png", import.meta.url).href,
  "july-firework-2": new URL("./assets/july-firework-2.png", import.meta.url).href,
  "july-firework-3": new URL("./assets/july-firework-3.png", import.meta.url).href,
  "june-daisy-1": new URL("./assets/june-daisy-1.png", import.meta.url).href,
  "june-daisy-2": new URL("./assets/june-daisy-2.png", import.meta.url).href,
  "june-daisy-3": new URL("./assets/june-daisy-3.png", import.meta.url).href,
  "march-snowdrop-1": new URL("./assets/march-snowdrop-1.png", import.meta.url).href,
  "march-snowdrop-2": new URL("./assets/march-snowdrop-2.png", import.meta.url).href,
  "may-lilac-floret-1": new URL("./assets/may-lilac-floret-1.png", import.meta.url).href,
  "may-lilac-floret-2": new URL("./assets/may-lilac-floret-2.png", import.meta.url).href,
  "may-lilac-floret-3": new URL("./assets/may-lilac-floret-3.png", import.meta.url).href,
  "november-leaf-1-oak": new URL("./assets/november-leaf-1-oak.png", import.meta.url).href,
  "november-leaf-2-ochre": new URL("./assets/november-leaf-2-ochre.png", import.meta.url).href,
  "november-leaf-3-rust": new URL("./assets/november-leaf-3-rust.png", import.meta.url).href,
  "october-leaf-1": new URL("./assets/october-leaf-1.png", import.meta.url).href,
  "october-leaf-2": new URL("./assets/october-leaf-2.png", import.meta.url).href,
  "october-leaf-3": new URL("./assets/october-leaf-3.png", import.meta.url).href,
  "september-leaf-1": new URL("./assets/september-leaf-1.png", import.meta.url).href,
  "september-leaf-2": new URL("./assets/september-leaf-2.png", import.meta.url).href,
  "september-leaf-3": new URL("./assets/september-leaf-3.png", import.meta.url).href,
  snowflake: new URL("./assets/snowflake.png", import.meta.url).href,
  "snowflake-soft": new URL("./assets/snowflake-soft.png", import.meta.url).href
};

// src/falling-leaves/pieces.ts
var SNOW_MONTHS = [1, 2, 12];
var MONTH_PIECES = {
  1: [],
  2: [],
  3: [
    { asset: "march-snowdrop-1", motion: "tumbles", x: 55.616, y: 227.616, size: 56.527, rotate: 75, blur: 0, layer: "back" },
    { asset: "march-snowdrop-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "march-snowdrop-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "march-snowdrop-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" }
  ],
  4: [
    { asset: "april-petal-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "april-petal-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "april-petal-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "april-petal-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "april-petal-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  5: [
    { asset: "may-lilac-floret-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "may-lilac-floret-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "may-lilac-floret-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "may-lilac-floret-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "may-lilac-floret-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  6: [
    { asset: "june-daisy-3", motion: "lands", x: 70.041, y: 197.542, size: 46.077, rotate: 135, blur: 0, layer: "back" },
    { asset: "june-daisy-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "june-daisy-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "june-daisy-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "june-daisy-3", motion: "lands", x: 137.902, y: -13.098, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  7: [
    { asset: "july-firework-3", motion: "bursts", x: 67.041, y: 197.542, size: 50.32, rotate: 135, blur: 0, layer: "back" },
    { asset: "july-firework-1", motion: "bursts", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "july-firework-1", motion: "bursts", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "july-firework-2", motion: "bursts", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "july-firework-3", motion: "bursts", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  8: [
    { asset: "august-petal-3", motion: "lands", x: 68.579, y: 191.579, size: 41.835, rotate: 165, blur: 0, layer: "back" },
    { asset: "august-petal-1", motion: "tumbles", x: 41.608, y: 36.228, size: 17.611, rotate: 28, blur: 0, layer: "front" },
    { asset: "august-petal-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "august-petal-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "august-petal-3", motion: "lands", x: 104.136, y: 16.675, size: 14.974, rotate: -118, blur: 0, layer: "front" }
  ],
  9: [
    { asset: "september-leaf-3", motion: "lands", x: 64.584, y: 197.544, size: 53.797, rotate: 165, blur: 0, layer: "back" },
    { asset: "september-leaf-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "september-leaf-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "september-leaf-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "september-leaf-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  10: [
    { asset: "october-leaf-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "october-leaf-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "october-leaf-1", motion: "tumbles", x: 219.15, y: 322.4, size: 77.18, rotate: 28, blur: 0, layer: "front" },
    { asset: "october-leaf-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "october-leaf-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "october-leaf-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  11: [
    { asset: "november-leaf-3-rust", motion: "lands", x: 67.778, y: 193.067, size: 53.895, rotate: 180, blur: 0, layer: "back" },
    { asset: "november-leaf-1-oak", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "november-leaf-1-oak", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "november-leaf-2-ochre", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "november-leaf-3-rust", motion: "lands", x: 134.902, y: -5.098, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  12: []
};
var SNOW_FLAKES = [
  { x: 43.818, y: 31.036, r: 2.247, opacity: 0.703, soft: false },
  { x: 30.857, y: 317.068, r: 2.576, opacity: 0.655, soft: true },
  { x: 86.234, y: 222.99, r: 1.605, opacity: 0.73, soft: false },
  { x: 339.605, y: 356.971, r: 1.522, opacity: 0.672, soft: false },
  { x: 346.246, y: 6.307, r: 2.193, opacity: 0.725, soft: false },
  { x: 356.596, y: 121.318, r: 1.773, opacity: 0.724, soft: false },
  { x: 120.981, y: -9.841, r: 2.041, opacity: 0.625, soft: false },
  { x: 30.457, y: 337.598, r: 1.787, opacity: 0.892, soft: false },
  { x: 171.608, y: 27.371, r: 2.154, opacity: 0.829, soft: false },
  { x: 304.073, y: 124.066, r: 2.238, opacity: 0.582, soft: false },
  { x: 86.758, y: 254.91, r: 1.547, opacity: 0.585, soft: false },
  { x: 351.795, y: 339.27, r: 3.186, opacity: 0.824, soft: true },
  { x: 10.729, y: 66.691, r: 2.054, opacity: 0.558, soft: false },
  { x: 266.672, y: 40.289, r: 1.266, opacity: 0.63, soft: false },
  { x: 34.471, y: 367.03, r: 2.277, opacity: 0.886, soft: false },
  { x: 48.304, y: 279.214, r: 3.267, opacity: 0.582, soft: true },
  { x: 11.625, y: -8.659, r: 2.841, opacity: 0.799, soft: true },
  { x: 84.367, y: 294.378, r: 1.63, opacity: 0.469, soft: false },
  { x: 300.641, y: 300.033, r: 1.578, opacity: 0.697, soft: false },
  { x: 21.085, y: 47.155, r: 2.349, opacity: 0.482, soft: false },
  { x: 286.219, y: -17.889, r: 1.62, opacity: 0.45, soft: false },
  { x: 41.441, y: 136.298, r: 2.183, opacity: 0.454, soft: false },
  { x: 268.852, y: 73.865, r: 2.863, opacity: 0.77, soft: true },
  { x: 68.397, y: 57.131, r: 1.316, opacity: 0.75, soft: false },
  { x: 46.039, y: 326.282, r: 2.74, opacity: 0.699, soft: true },
  { x: 328.587, y: 226.342, r: 2.281, opacity: 0.934, soft: false },
  { x: 321.311, y: 108.428, r: 2.37, opacity: 0.801, soft: false },
  { x: 285.905, y: 333.125, r: 2.476, opacity: 0.945, soft: false },
  { x: 319.042, y: 245.195, r: 1.366, opacity: 0.635, soft: false },
  { x: 238.814, y: -10.017, r: 1.629, opacity: 0.55, soft: false },
  { x: 346.749, y: 151.827, r: 1.329, opacity: 0.644, soft: false },
  { x: 67.978, y: 216.678, r: 1.774, opacity: 0.82, soft: false },
  { x: 300.907, y: 1.296, r: 2.024, opacity: 0.659, soft: false },
  { x: 323.33, y: 176.23, r: 1.441, opacity: 0.532, soft: false },
  { x: 24.088, y: 254.978, r: 2.276, opacity: 0.727, soft: false },
  { x: 81.681, y: 95.843, r: 1.322, opacity: 0.514, soft: false },
  { x: 12.302, y: 162.452, r: 1.878, opacity: 0.623, soft: false },
  { x: 85.788, y: 250.949, r: 2.357, opacity: 0.565, soft: false },
  { x: 85.788, y: 242.947, r: 2.357, opacity: 0.565, soft: false },
  { x: 344.652, y: 94.412, r: 3.378, opacity: 0.851, soft: true },
  { x: 344.652, y: 86.412, r: 3.378, opacity: 0.851, soft: true },
  { x: 50.821, y: 247.347, r: 2.574, opacity: 0.932, soft: true },
  { x: 50.821, y: 239.347, r: 2.574, opacity: 0.932, soft: true },
  { x: 59.994, y: 335.764, r: 2.643, opacity: 0.845, soft: true },
  { x: 59.994, y: 327.764, r: 2.643, opacity: 0.845, soft: true },
  { x: 35.414, y: 235.414, r: 3.414, opacity: 0.755, soft: true },
  { x: 43.414, y: 203.414, r: 3.414, opacity: 0.755, soft: true },
  { x: 299.831, y: 255.868, r: 2.436, opacity: 0.714, soft: false },
  { x: 299.831, y: 247.868, r: 2.436, opacity: 0.714, soft: false },
  { x: 33.449, y: -15.222, r: 2.1, opacity: 0.911, soft: false },
  { x: 33.449, y: -23.22, r: 2.1, opacity: 0.911, soft: false },
  { x: 90.621, y: 30.039, r: 1.365, opacity: 0.626, soft: false },
  { x: 90.621, y: 22.039, r: 1.365, opacity: 0.626, soft: false },
  { x: 295.676, y: 197.887, r: 2.466, opacity: 0.476, soft: false },
  { x: 295.676, y: 189.888, r: 2.466, opacity: 0.476, soft: false }
];

// src/falling-leaves/falling-leaves.ts
var STYLES = `
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
var FLOWERS = /snowdrop|lilac-floret|daisy/;
var HOME_AT = 3;
var FADE_IN = 0.6;
var TAU = Math.PI * 2;
var MOTION = {
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
    respawn: 40
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
    respawn: 40
  },
  lands: { firstAt: 4.4, gap: 0.8, speed: 70, easePower: 1.6, period: [1.9, 2.6], reach: [18, 30], lean: [18, 28], spin: [20, 45] },
  flowers: {
    speed: { tumbles: [58, 78], sways: [48, 62] },
    spin: [14, 38],
    drift: [5, 12],
    driftPeriod: [9, 14],
    respawn: 40,
    landSpin: [50, 120],
    landDrift: [4, 9]
  },
  bursts: { period: [4.8, 5.6], firstLead: 0.6, lead: 0.45, grow: 0.45, appear: 0.25, holdUntil: 0.55, goneBy: 0.8 },
  snow: { speedBase: 14, speedPerRadius: 8, swayAmp: [3, 8], swayPeriod: [4, 7], respawn: 30, softSize: 2.2 },
  inwardBias: 0.7
};
function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = state + 1831565813 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    between: ([min, max]) => min + next() * (max - min),
    sign: () => next() < 0.5 ? -1 : 1
  };
}
function tripOffset(seed, trip) {
  const value = Math.sin(seed * 12.9898 + trip * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}
function swing(time, period, phase) {
  const angle = TAU * time / period + phase;
  return { side: Math.sin(angle), pace: Math.cos(angle), drop: Math.sin(2 * angle) };
}
function floats(seed, size, ranges) {
  const random = createRandom(seed);
  const speed = random.between(ranges.speed);
  const period = random.between(ranges.period);
  const reach = random.between(ranges.reach);
  const lean = random.between(ranges.lean);
  const stall = random.between(ranges.stall) * speed * period / (2 * TAU);
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
  const narrowLead = random.between([narrowSeconds + 0.3, narrowEvery - 0.3]);
  const atHome = swing(0, period, phase);
  return (elapsed, home, layout) => {
    const sinceHome = elapsed - HOME_AT;
    const now = swing(sinceHome, period, phase);
    const pad = (size + stall + 12) * layout.scale;
    const span = layout.height + pad * 2;
    const duration = span / (speed * layout.scale);
    const homeFraction = (home.y + pad) / span;
    const trips = sinceHome / duration + homeFraction;
    const trip = Math.floor(trips);
    const column = trip === 0 ? 0 : tripOffset(seed, trip) * ranges.respawn;
    const centre = layout.width / 2;
    const bias = Math.min(Math.max((centre - home.x) / centre, -1), 1) * MOTION.inwardBias;
    const arcPhase = meanderTurn > 0 ? Math.asin(-bias) : Math.PI - Math.asin(-bias);
    const arc = Math.sin(TAU * sinceHome / meanderPeriod + arcPhase) - Math.sin(arcPhase);
    const turned = Math.sin(TAU * sinceHome / headingPeriod + headingPhase) - Math.sin(headingPhase);
    const sinceTurn = ((sinceHome + narrowLead) % narrowEvery + narrowEvery) % narrowEvery;
    const turning = sinceTurn < narrowSeconds ? Math.sin(Math.PI * sinceTurn / narrowSeconds) : 0;
    const facing = 1 - 0.1 * now.side * now.side;
    return {
      ...home,
      x: home.x + (column + arc * meander + (now.side - atHome.side) * reach) * layout.scale,
      y: -pad + (trips - trip) * span + (now.drop - atHome.drop) * stall * layout.scale,
      rotate: home.rotate + (now.pace - atHome.pace) * lean + turned * heading,
      narrow: facing * (1 - (1 - narrowTo) * turning * turning)
    };
  };
}
function drops(seed, size, speedRange) {
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
    const centre = layout.width / 2;
    const bias = Math.min(Math.max((centre - home.x) / centre, -1), 1) * MOTION.inwardBias;
    const phase = driftTurn > 0 ? Math.asin(-bias) : Math.PI - Math.asin(-bias);
    const drifted = Math.sin(TAU * sinceHome / driftPeriod + phase) - Math.sin(phase);
    return {
      ...home,
      x: home.x + (column + drifted * drift) * layout.scale,
      y: -pad + (trips - trip) * span,
      rotate: home.rotate + spin * sinceHome
    };
  };
}
function settles(seed, order) {
  const random = createRandom(seed);
  const config = MOTION.lands;
  const landAt = config.firstAt + order * config.gap;
  const distance = config.speed * landAt / config.easePower;
  const spin = random.sign() * random.between(MOTION.flowers.landSpin);
  const drift = random.sign() * random.between(MOTION.flowers.landDrift);
  return (elapsed, home, layout) => {
    const progress = Math.min(Math.max(elapsed / landAt, 0), 1);
    const remaining = Math.pow(1 - progress, config.easePower);
    return {
      ...home,
      x: home.x + drift * remaining * layout.scale,
      y: home.y - distance * remaining * layout.scale,
      rotate: home.rotate + spin * remaining
    };
  };
}
function lands(seed, order) {
  const random = createRandom(seed);
  const config = MOTION.lands;
  const landAt = config.firstAt + order * config.gap;
  const distance = config.speed * landAt / config.easePower;
  const period = random.between(config.period);
  const reach = random.between(config.reach);
  const lean = random.between(config.lean);
  const spin = random.sign() * random.between(config.spin);
  const phase = random.between([0, TAU]);
  return (elapsed, home, layout) => {
    const progress = Math.min(Math.max(elapsed / landAt, 0), 1);
    const remaining = Math.pow(1 - progress, config.easePower);
    const now = swing(Math.min(elapsed, landAt) - landAt, period, phase);
    const still = swing(0, period, phase);
    return {
      ...home,
      x: home.x + (now.side - still.side) * reach * remaining * layout.scale,
      y: home.y - distance * remaining * layout.scale,
      rotate: home.rotate + spin * remaining + (now.pace - still.pace) * lean * remaining,
      narrow: 1 - 0.14 * now.side * now.side * remaining
    };
  };
}
function bursts(seed, order) {
  const random = createRandom(seed);
  const config = MOTION.bursts;
  const period = random.between(config.period);
  const lead = config.firstLead + order * config.lead;
  return (elapsed, home) => {
    const time = ((elapsed - HOME_AT + lead) % period + period) % period;
    const grown = 1 - Math.pow(1 - Math.min(time / config.grow, 1), 3);
    const fading = Math.min(Math.max((time / period - config.holdUntil) / (config.goneBy - config.holdUntil), 0), 1);
    return {
      ...home,
      scale: 0.35 + 0.65 * grown + 0.1 * fading,
      opacity: home.opacity * Math.min(time / config.appear, 1) * (1 - fading)
    };
  };
}
function drifts(seed, flake, size) {
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
    const drift = Math.sin(TAU * sinceHome / swayPeriod);
    return { ...home, x: home.x + (column + drift * sway) * layout.scale, y: -pad + (trips - trip) * span };
  };
}
function createImage(asset, assetBaseUrl) {
  const node = document.createElement("img");
  node.className = "wu-falling-leaves__piece";
  node.alt = "";
  node.decoding = "async";
  node.draggable = false;
  node.src = assetBaseUrl ? `${assetBaseUrl}${asset}.png` : ASSET_URLS[asset];
  return node;
}
function pieceSprite(piece, index, order, month, assetBaseUrl) {
  const seed = month * 100 + index;
  const flower = FLOWERS.test(piece.asset);
  const poses = {
    tumbles: () => flower ? drops(seed, piece.size, MOTION.flowers.speed.tumbles) : floats(seed, piece.size, MOTION.tumbles),
    sways: () => flower ? drops(seed, piece.size, MOTION.flowers.speed.sways) : floats(seed, piece.size, MOTION.sways),
    lands: () => flower ? settles(seed, order) : lands(seed, order),
    bursts: () => bursts(seed, order)
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
    pose: poses[piece.motion]()
  };
}
function flakeSprite(flake, index, assetBaseUrl) {
  const size = flake.r * 2 * (flake.soft ? MOTION.snow.softSize : 1);
  return {
    node: createImage(flake.soft ? "snowflake-soft" : "snowflake", assetBaseUrl),
    loadedAt: null,
    layer: "back",
    x: flake.x,
    y: flake.y,
    size,
    rotate: 0,
    opacity: flake.opacity,
    blur: 0,
    pose: drifts(1000 + index, flake, size)
  };
}
function createSprites(month, assetBaseUrl) {
  if (SNOW_MONTHS.includes(month)) {
    return SNOW_FLAKES.map((flake, index) => flakeSprite(flake, index, assetBaseUrl));
  }
  const seen = {};
  return (MONTH_PIECES[month] ?? []).map((piece, index) => {
    const order = seen[piece.motion] ?? 0;
    seen[piece.motion] = order + 1;
    return pieceSprite(piece, index, order, month, assetBaseUrl);
  });
}
function measureLayout(root, anchor, maxScale) {
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  if (width === 0 || height === 0)
    return null;
  const frame = anchor ? placeFrameIn(root, anchor, maxScale) : placeFrameAtBottom({ width, height }, maxScale);
  return frame && { width, height, scale: frame.scale, frameX: frame.x, frameY: frame.y };
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
function createStage(host, sprites) {
  const root = document.createElement("div");
  root.className = "wu-falling-leaves";
  root.setAttribute("aria-hidden", "true");
  root.append(...sprites.map((sprite) => sprite.node));
  host.append(root);
  return { root, sprites, layout: null };
}
function mountFallingLeaves(layers, data, options = {}) {
  const { autoplay = false, maxScale = DEFAULT_MAX_SCALE, assetBaseUrl } = options;
  const { month, anchor } = data;
  const reducedMotion = prefersReducedMotion();
  ensureStyles("falling-leaves", STYLES);
  const sprites = createSprites(month, assetBaseUrl);
  const stages = ["back", "front"].map((name) => createStage(layers[name], sprites.filter((sprite) => sprite.layer === name)));
  let elapsed = 0;
  let destroyed = false;
  const draw = (stage) => {
    const { layout } = stage;
    if (!layout)
      return;
    stage.root.style.opacity = String(reducedMotion ? 1 : Math.min(elapsed / FADE_IN, 1));
    for (const sprite of stage.sprites) {
      const home = {
        x: layout.frameX + sprite.x * layout.scale,
        y: layout.frameY + sprite.y * layout.scale,
        rotate: sprite.rotate,
        scale: 1,
        opacity: sprite.opacity
      };
      const pose = reducedMotion ? home : sprite.pose(elapsed, home, layout);
      const sinceLoad = sprite.loadedAt === null ? 0 : (performance.now() - sprite.loadedAt) / 1000;
      const loaded = Math.min(sinceLoad / LATE_FADE_SECONDS, 1);
      const narrow = pose.narrow ?? 1;
      sprite.node.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale * narrow}, ${pose.scale})`;
      sprite.node.style.opacity = String(pose.opacity * loaded);
    }
  };
  const relayout = (stage) => {
    stage.layout = measureLayout(stage.root, anchor, maxScale);
    if (!stage.layout)
      return;
    for (const sprite of stage.sprites) {
      const size = sprite.size * stage.layout.scale;
      sprite.node.style.width = `${size}px`;
      sprite.node.style.height = `${size}px`;
      sprite.node.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      sprite.node.style.filter = sprite.blur ? `blur(${sprite.blur * stage.layout.scale}px)` : "";
    }
    draw(stage);
  };
  const stopObserving = [
    ...stages.map((stage) => observeSize(stage.root, () => relayout(stage))),
    anchor ? observeSize(anchor, () => stages.forEach(relayout)) : () => {}
  ];
  const clock = gsap.to({}, {
    duration: 1,
    ease: "none",
    repeat: -1,
    paused: true,
    onUpdate() {
      elapsed = clock.totalTime();
      stages.forEach(draw);
    }
  });
  const ready = Promise.all(sprites.map((sprite) => decodeImage(sprite.node).then(() => {
    if (destroyed)
      return;
    sprite.loadedAt = clock.isActive() ? performance.now() : -Infinity;
    stages.forEach(draw);
  }))).then(() => {
    return;
  });
  const gate = createStartGate(ready);
  const controller = {
    ready,
    play() {
      if (destroyed || reducedMotion)
        return;
      gate.whenOpen(() => {
        if (!destroyed)
          clock.play();
      });
    },
    pause() {
      gate.cancel();
      clock.pause();
    },
    seek(t) {
      if (destroyed || reducedMotion)
        return;
      clock.totalTime(Math.max(t, 0), true);
      elapsed = clock.totalTime();
      stages.forEach(draw);
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      gate.cancel();
      clock.kill();
      stopObserving.forEach((stop) => stop());
      stages.forEach((stage) => stage.root.remove());
    }
  };
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountFallingLeaves
};
