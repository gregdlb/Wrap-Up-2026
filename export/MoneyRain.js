// src/money-rain/money-rain.ts
import gsap from "gsap";

// src/shared/canvas.ts
function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

// src/shared/fit.ts
var DEFAULT_MAX_SCALE = 1.15;
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

// src/money-rain/money-rain.ts
var STYLES = `
.wu-money-rain {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
`;
var BILL = { width: 39.2, height: 19.6, radius: 2.1, inset: 2.6, frameRadius: 1.4, circle: 4.4, fontSize: 7 };
var COIN = { size: 21.74, inner: 7.544, fontSize: 9.783 };
var SHADOW = { offsetY: 4, blur: 8, color: "rgba(0, 0, 0, 0.25)", padding: 14 };
var BILLS = [
  { x: 321.75, y: 215.7, scale: 0.96 },
  { x: 147.85, y: 427.8, scale: 1.74 },
  { x: 328.95, y: 389.7, scale: 1.25 },
  { x: 33.55, y: 493, scale: 1.19 },
  { x: 89.05, y: 664.4, scale: 1.37 },
  { x: 182.8, y: 38.85, scale: 1.45 },
  { x: 343.95, y: 447.3, scale: 1.19 },
  { x: 20.95, y: 591.85, scale: 1.35 },
  { x: 126.55, y: 61.85, scale: 1.5 }
];
var COINS = [
  { x: 313.15, y: 143.15, size: 21.7 },
  { x: 32.3, y: 402.3, size: 20.3 },
  { x: 191.4, y: 421.4, size: 18.8 },
  { x: 334.5, y: 494.5, size: 24 },
  { x: 301.5, y: 661.5, size: 19 },
  { x: 233.4, y: 133.4, size: 22.1 },
  { x: 340.4, y: 570.4, size: 17.2 },
  { x: 209.6, y: 769.6, size: 15.9 },
  { x: 280.1, y: 40.1, size: 16.7 }
];
var FIGMA_SCREEN = { width: 360, height: 782 };
var LARGEST_BILL = Math.max(...BILLS.map((bill) => bill.scale));
var MOTION = {
  reach: [0.55, 0.85],
  stagger: 0.15,
  fall: { bill: [240, 320], coin: [330, 430] },
  drag: 2.2,
  spin: [90, 300],
  flip: [2.5, 6],
  sway: [8, 22],
  swayPeriod: [1.1, 1.9],
  fadeIn: 0.12,
  seconds: 3.4,
  exit: 60
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
    next,
    between: ([min, max]) => min + next() * (max - min),
    sign: () => next() < 0.5 ? -1 : 1
  };
}
function createPieces() {
  const random = createRandom(9);
  const piece = (kind, x, y, scale) => ({
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
    swayPhase: random.next() * Math.PI * 2
  });
  return [
    ...BILLS.map((bill) => piece("bill", bill.x, bill.y, bill.scale)),
    ...COINS.map((coin) => piece("coin", coin.x, coin.y, coin.size / COIN.size))
  ];
}
function createSprite(width, height, pixelsPerUnit, draw) {
  const image = document.createElement("canvas");
  const fullWidth = width + SHADOW.padding * 2;
  const fullHeight = height + SHADOW.padding * 2;
  image.width = Math.ceil(fullWidth * pixelsPerUnit);
  image.height = Math.ceil(fullHeight * pixelsPerUnit);
  const context = image.getContext("2d");
  context.scale(pixelsPerUnit, pixelsPerUnit);
  context.translate(SHADOW.padding, SHADOW.padding);
  draw(context);
  return { image, width: fullWidth, height: fullHeight };
}
function withShadow(context, pixelsPerUnit, fill) {
  context.save();
  context.shadowColor = SHADOW.color;
  context.shadowBlur = SHADOW.blur * pixelsPerUnit;
  context.shadowOffsetY = SHADOW.offsetY * pixelsPerUnit;
  fill();
  context.restore();
}
function dollar(context, x, y, weight, size, color, fontFamily) {
  context.font = `${weight} ${size}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText("$", x, y + size * 0.04);
}
function billSprite(palette, pixelsPerUnit, fontFamily) {
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
function coinSprite(palette, pixelsPerUnit, fontFamily) {
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
function readPalette(node) {
  const style = getComputedStyle(node);
  const token = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    bill: token("--olive-300", "#dce7cf"),
    billInk: token("--brand-500", "#066e3d"),
    billCircle: token("--green-200", "#c8ebd3"),
    coin: token("--yellow-400", "#f7c468"),
    coinInner: token("--yellow-300", "#fbd48a"),
    coinRim: token("--yellow-500", "#dba145"),
    coinInk: token("--yellow-700", "#be8735")
  };
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
function mountMoneyRain(el, options = {}) {
  const { origin, autoplay = false, onComplete, maxScale = DEFAULT_MAX_SCALE } = options;
  const reducedMotion = prefersReducedMotion();
  ensureStyles("money-rain", STYLES);
  const canvas = document.createElement("canvas");
  canvas.className = "wu-money-rain";
  canvas.setAttribute("aria-hidden", "true");
  el.append(canvas);
  const context = canvas.getContext("2d");
  const fontFamily = getComputedStyle(canvas).fontFamily;
  const palette = readPalette(canvas);
  const pieces = createPieces();
  let unit = 1;
  let ratio = 1;
  let sprites = null;
  let destroyed = false;
  const start = () => {
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    if (!origin)
      return { x: width / 2, y: height * 0.7 };
    const canvasRect = canvas.getBoundingClientRect();
    const originRect = origin.getBoundingClientRect();
    const zoom = canvasRect.width / width || 1;
    return {
      x: (originRect.left + originRect.width / 2 - canvasRect.left) / zoom,
      y: (originRect.top + originRect.height / 2 - canvasRect.top) / zoom
    };
  };
  function draw(elapsed) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprites || elapsed <= 0 || elapsed >= MOTION.seconds)
      return;
    const from = start();
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    for (const piece of pieces) {
      const time = elapsed - piece.delay;
      if (time <= 0)
        continue;
      const homeX = piece.x / FIGMA_SCREEN.width * width;
      const homeY = piece.y / FIGMA_SCREEN.height * height;
      const flight = Math.min(time / piece.reach, 1);
      const arrived = 1 - Math.pow(1 - flight, 3);
      const falling = Math.max(time - piece.reach, 0);
      const left = MOTION.seconds - piece.delay - piece.reach - 1 / MOTION.drag;
      const pace = Math.max(piece.fall * unit, (height - homeY + MOTION.exit * unit) / left);
      const dropped = pace * (falling - (1 - Math.exp(-MOTION.drag * falling)) / MOTION.drag);
      const sway = Math.sin(Math.PI * 2 * time / piece.swayPeriod + piece.swayPhase) * piece.sway * unit * flight;
      const x = from.x + (homeX - from.x) * arrived + sway;
      const y = from.y + (homeY - from.y) * arrived + dropped;
      const flip = Math.cos(piece.flipPhase + piece.flipSpeed * time);
      const sprite = sprites[piece.kind];
      const pixels = piece.scale * unit * ratio;
      context.setTransform(1, 0, 0, 1, x * ratio, y * ratio);
      context.rotate((piece.rotate + piece.spin * time) * Math.PI / 180);
      context.scale(piece.kind === "coin" ? flip : 1, piece.kind === "bill" ? flip : 1);
      context.globalAlpha = Math.min(time / MOTION.fadeIn, 1);
      context.drawImage(sprite.image, -sprite.width * pixels / 2, -sprite.height * pixels / 2, sprite.width * pixels, sprite.height * pixels);
    }
    context.globalAlpha = 1;
  }
  const clock = gsap.to({}, {
    duration: MOTION.seconds,
    ease: "none",
    paused: true,
    onUpdate: () => draw(clock.time()),
    onComplete: () => {
      draw(MOTION.seconds);
      onComplete?.();
    }
  });
  const stopSizing = observeSize(canvas, ({ width, height }) => {
    if (width === 0 || height === 0)
      return;
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    unit = Math.min(width / 360, maxScale);
    const pixelsPerUnit = unit * ratio * LARGEST_BILL;
    sprites = {
      bill: billSprite(palette, pixelsPerUnit, fontFamily),
      coin: coinSprite(palette, pixelsPerUnit, fontFamily)
    };
    draw(clock.time());
  });
  const controller = {
    ready: Promise.resolve(),
    play() {
      if (destroyed)
        return;
      if (reducedMotion) {
        onComplete?.();
        return;
      }
      if (clock.progress() === 1)
        clock.restart();
      else
        clock.play();
    },
    pause() {
      clock.pause();
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      clock.kill();
      stopSizing();
      canvas.remove();
    }
  };
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountMoneyRain
};
