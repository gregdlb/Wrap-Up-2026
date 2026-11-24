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

// src/shared/card.ts
var CARD_STYLES = `
.wu-card {
  --wu-u: 1px;

  position: relative;
  width: 100%;
  height: 100%;
  font-family: var(--wu-font-sans, 'Rethink Sans', system-ui, sans-serif);
  font-synthesis: none;
  -webkit-user-select: none;
  user-select: none;
}

/* The Figma frame, centred in the container. */
.wu-card__stage {
  position: absolute;
  inset: 0;
  width: calc(var(--wu-frame-w) * var(--wu-u));
  height: calc(var(--wu-frame-h) * var(--wu-u));
  margin: auto;
}

/* A box placed in Figma px: --x, --y, and optionally --w, --h. */
.wu-box {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-u));
}
`;
function element(className, text) {
  const node = document.createElement("div");
  node.className = className;
  if (text !== undefined)
    node.textContent = text;
  return node;
}
function place(node, box) {
  node.classList.add("wu-box");
  for (const [key, value] of Object.entries(box))
    node.style.setProperty(`--${key}`, String(value));
  return node;
}
function createCardShell(el, config) {
  const { className, frame, maxScale = DEFAULT_MAX_SCALE, ariaLabel } = config;
  ensureStyles("card", CARD_STYLES);
  const root = element(`wu-card ${className}`);
  root.style.setProperty("--wu-frame-w", String(frame.width));
  root.style.setProperty("--wu-frame-h", String(frame.height));
  if (ariaLabel) {
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", ariaLabel);
  }
  const stage = element("wu-card__stage");
  root.append(stage);
  el.append(root);
  let ownsHeight = null;
  const stopFitting = observeSize(root, (box) => {
    if (box.width === 0)
      return;
    if (ownsHeight === null)
      ownsHeight = box.height === 0;
    const scale = containScale(ownsHeight ? { ...box, height: Infinity } : box, frame, maxScale);
    if (ownsHeight)
      root.style.height = `${frame.height * scale}px`;
    root.style.setProperty("--wu-u", `${scale}px`);
  });
  return {
    root,
    stage,
    remove() {
      stopFitting();
      root.remove();
    }
  };
}

// src/shared/controller.ts
import gsap from "gsap";

// src/shared/images.ts
var IMAGE_STYLES = `
.wu-image {
  transition: opacity 0.2s linear;
}

.wu-image--loading {
  opacity: 0 !important;
}
`;
var READY_TIMEOUT_SECONDS = 2;
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
function trackImages(images) {
  ensureStyles("images", IMAGE_STYLES);
  const all = [...images].map((image) => {
    image.classList.add("wu-image", "wu-image--loading");
    return decodeImage(image).then(() => image.classList.remove("wu-image--loading"));
  });
  return Promise.all(all).then(() => {
    return;
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

// src/shared/controller.ts
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
function holdTimeline(seconds) {
  return gsap.timeline({ paused: true }).to({}, { duration: seconds }, 0);
}
function createController(config) {
  const { timeline: animation, ready, onComplete, onDestroy } = config;
  const gate = createStartGate(ready);
  let timeline = animation;
  if (prefersReducedMotion()) {
    const screenSeconds = animation.duration();
    animation.progress(1, true).kill();
    timeline = holdTimeline(screenSeconds);
  }
  let pendingStart = null;
  let destroyed = false;
  const cancelPendingStart = () => {
    pendingStart?.kill();
    pendingStart = null;
  };
  timeline.eventCallback("onComplete", () => onComplete?.());
  timeline.time(0, true);
  const start = (delay) => {
    if (destroyed)
      return;
    if (pendingStart) {
      pendingStart.resume();
      return;
    }
    if (timeline.progress() === 1)
      timeline.pause(0, true);
    if (delay <= 0 || timeline.time() > 0) {
      timeline.play();
      return;
    }
    pendingStart = gsap.delayedCall(delay, () => {
      pendingStart = null;
      timeline.play();
    });
  };
  return {
    ready: ready ?? Promise.resolve(),
    play(delay = 0) {
      if (destroyed)
        return;
      gate.whenOpen(() => start(delay));
    },
    pause() {
      gate.cancel();
      pendingStart?.pause();
      timeline.pause();
    },
    seek(t) {
      if (destroyed)
        return;
      cancelPendingStart();
      timeline.time(Math.min(Math.max(t, 0), timeline.duration()), true);
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      gate.cancel();
      cancelPendingStart();
      timeline.kill();
      onDestroy();
    },
    get duration() {
      return timeline.duration();
    }
  };
}

// src/shared/counter.ts
function addCounter(timeline, node, target, options) {
  const { at, duration, format = (value) => String(Math.round(value)), ease = "power1.out", from = 0 } = options;
  let current = from;
  const count = {
    get value() {
      return current;
    },
    set value(next) {
      current = next;
      node.textContent = format(next);
    }
  };
  timeline.fromTo(count, { value: from }, { value: target, duration, ease }, at);
}

// src/shared/pages.ts
var PAGES_IN = { at: 0.4, duration: 0.48, stagger: 0.06, offsetY: 24, endAt: 1 };

// src/shared/text.ts
var NBSP = " ";
function keepTogether(text) {
  return text.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`).replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`).replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`).replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`);
}

// src/shared/sticker.ts
var STICKER_STYLES = `
.wu-sticker {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  display: flex;
  align-items: center;
  gap: calc(6 * var(--wu-u));
  padding: calc(8 * var(--wu-u)) calc(14 * var(--wu-u)) calc(8 * var(--wu-u)) calc(12 * var(--wu-u));
  border-radius: 999px;
  background: var(--beige-50, #fefdfc);
  box-shadow: 0 calc(var(--wu-shadow-y, 14) * var(--wu-u)) calc(var(--wu-shadow-blur, 28) * var(--wu-u)) 0 rgba(3, 26, 13, 0.14);
  color: var(--emerald-500, #023620);
  font-size: calc(14 * var(--wu-u));
  font-weight: 600;
  line-height: calc(18 * var(--wu-u));
  white-space: nowrap;
  transform: rotate(calc(var(--wu-tilt, 0) * 1deg)) scale(var(--wu-pop, 1));
}

.wu-sticker img {
  display: block;
  width: calc(18 * var(--wu-u));
  height: calc(18 * var(--wu-u));
}
`;
var HEART_URL = new URL("./assets/sticker-heart.png", import.meta.url).href;
function heartUrl(assetBaseUrl) {
  return assetBaseUrl ? `${assetBaseUrl}sticker-heart.png` : HEART_URL;
}
function createSticker({ text, x, y, tilt, heart = true, shadow, assetBaseUrl }) {
  ensureStyles("sticker", STICKER_STYLES);
  const sticker = element("wu-sticker");
  sticker.style.setProperty("--x", String(x));
  sticker.style.setProperty("--y", String(y));
  sticker.style.setProperty("--wu-tilt", String(tilt));
  if (shadow) {
    sticker.style.setProperty("--wu-shadow-y", String(shadow.y));
    sticker.style.setProperty("--wu-shadow-blur", String(shadow.blur));
  }
  if (heart) {
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = heartUrl(assetBaseUrl);
    sticker.append(image);
  }
  sticker.append(keepTogether(text));
  return sticker;
}
function addStickerPop(timeline, sticker, at, { duration = 0.35, turn = 0 } = {}) {
  const tilt = Number(sticker.style.getPropertyValue("--wu-tilt")) || 0;
  timeline.fromTo(sticker, { "--wu-pop": 0.6 }, { "--wu-pop": 1, duration, ease: "back.out(2.2)" }, at).fromTo(sticker, { opacity: 0 }, { opacity: 1, duration: Math.min(0.15, duration), ease: "power1.out" }, at);
  if (turn !== 0) {
    timeline.fromTo(sticker, { "--wu-tilt": tilt - turn }, { "--wu-tilt": tilt, duration, ease: "back.out(2.2)" }, at);
  }
}

// src/visits-count/visits-count.ts
var DEFAULT_LABELS = { visits: "Visits", with: "With" };
var FRAME = { width: 360, height: 360 };
var PLAQUE = { x: 241.87, y: 154.81, w: 96, h: 74 };
var STICKER = { x: 37.9, y: 295.87, tilt: 6 };
var TIMING = { counter: { at: 1, duration: 1.5 }, sticker: 2.5 };
var SCREEN = { video: 7, hold: 1.5 };
var NUMBER_SIZES = [36, 36, 36, 36, 30, 26, 22];
var STYLES = `
.wu-visits-count__plaque {
  box-sizing: border-box;
  overflow: hidden;
  border: calc(3 * var(--wu-u)) solid var(--beige-50, #fefdfc);
  border-radius: calc(14 * var(--wu-u));
  background: linear-gradient(178.5166deg, var(--beige-500, #f5f2ef) 31.975%, var(--base-white, #ffffff) 98.375%) border-box;
  box-shadow: 0 calc(14 * var(--wu-u)) calc(28 * var(--wu-u)) 0 rgba(3, 26, 13, 0.2);
  color: var(--emerald-500, #023620);
  text-align: center;
  white-space: nowrap;
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-visits-count__title {
  position: absolute;
  left: 0;
  top: calc(7 * var(--wu-u));
  width: 100%;
  font-size: calc(10 * var(--wu-u));
  font-weight: 700;
  letter-spacing: calc(1.6 * var(--wu-u));
  line-height: calc(13 * var(--wu-u));
  text-transform: uppercase;
}

.wu-visits-count__number {
  position: absolute;
  left: 0;
  top: calc(20.19 * var(--wu-u));
  width: 100%;
  font-size: calc(var(--wu-number-size) * var(--wu-u));
  font-weight: 800;
  line-height: calc(47 * var(--wu-u));
}
`;
function mountVisitsCount(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const visits = Math.max(0, Math.round(data.visits));
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(Math.round(value));
  const name = data.personName?.trim();
  const stickerText = name ? `${labels.with} ${name}` : null;
  ensureStyles("visits-count", STYLES);
  const shell = createCardShell(el, {
    className: "wu-visits-count",
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? [`${labels.visits}: ${format(visits)}`, stickerText].filter(Boolean).join(". ")
  });
  const plaque = place(element("wu-visits-count__plaque"), PLAQUE);
  const number = element("wu-visits-count__number", "0");
  const digits = format(visits).length;
  number.style.setProperty("--wu-number-size", String(NUMBER_SIZES[Math.min(digits, NUMBER_SIZES.length - 1)]));
  plaque.append(element("wu-visits-count__title", labels.visits), number);
  shell.stage.append(plaque);
  const timeline = holdTimeline(SCREEN.video + SCREEN.hold);
  timeline.fromTo(plaque, { opacity: 0, "--wu-y": PAGES_IN.offsetY }, { opacity: 1, "--wu-y": 0, duration: PAGES_IN.duration, ease: "power3.out" }, PAGES_IN.at);
  addCounter(timeline, number, visits, { ...TIMING.counter, format });
  if (stickerText) {
    const sticker = createSticker({ text: stickerText, ...STICKER, assetBaseUrl });
    shell.stage.append(sticker);
    addStickerPop(timeline, sticker, TIMING.sticker);
  }
  const controller = createController({
    timeline,
    ready: trackImages(shell.root.querySelectorAll("img")),
    onComplete,
    onDestroy: shell.remove
  });
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountVisitsCount
};
