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
var READY_TIMEOUT_SECONDS = 2;
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
var SCREEN_SECONDS = 6;

// src/shared/pages.ts
var PAGES_STYLES = `
.wu-page {
  position: absolute;
  background: var(--beige-50, #fefdfc);
  border-radius: calc(14 * var(--wu-u));
  box-shadow: 0 calc(16 * var(--wu-u)) calc(30 * var(--wu-u)) 0 rgba(3, 26, 13, 0.16);
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-page--back {
  left: calc(88 * var(--wu-u));
  top: calc(110 * var(--wu-u));
  width: calc(183.146 * var(--wu-u));
  height: calc(202 * var(--wu-u));
}

.wu-page--middle {
  left: calc(81 * var(--wu-u));
  top: calc(85 * var(--wu-u));
  width: calc(198.56 * var(--wu-u));
  height: calc(219 * var(--wu-u));
}

.wu-page--front {
  left: calc(73 * var(--wu-u));
  top: calc(60 * var(--wu-u));
  width: calc(214 * var(--wu-u));
  height: calc(236.029 * var(--wu-u));
}
`;
var PAGES_IN = { at: 0.4, duration: 0.48, stagger: 0.06, offsetY: 24, endAt: 1 };
function createPages(stage) {
  ensureStyles("pages", PAGES_STYLES);
  const back = element("wu-page wu-page--back");
  const middle = element("wu-page wu-page--middle");
  const front = element("wu-page wu-page--front");
  stage.append(back, middle, front);
  return { front, all: [front, middle, back] };
}
function addPagesIn(timeline, pages) {
  timeline.fromTo(pages.all, { opacity: 0, "--wu-y": PAGES_IN.offsetY }, { opacity: 1, "--wu-y": 0, duration: PAGES_IN.duration, ease: "power3.out", stagger: PAGES_IN.stagger }, PAGES_IN.at);
}

// src/top-caregiver-card/top-caregiver-card.ts
var DEFAULT_LABELS = {
  top: "Top",
  chip: "by hours",
  fewer: "Fewer hours",
  more: "More hours",
  you: "You"
};
var FRAME = { width: 360, height: 350 };
var FIGMA_DISTRIBUTION = [17, 28, 42, 59, 76, 87, 92, 90, 81, 71, 62, 53, 46, 39, 34, 29, 25, 22, 31, 25];
var CHART = { x: 16, baseline: 197, span: 178, gapRatio: 2 / 7, maxBarHeight: 92, minBarHeight: 2 };
var PIN = { pillAbove: 34, lineWidth: 1.5, minX: 32, maxX: 182 };
var TIMING = {
  bars: { at: 0.8, duration: 0.6, endAt: 2 },
  counter: { at: 0.8, duration: 1.2 },
  chip: { at: 1, duration: 0.2 },
  highlight: { at: 2, duration: 0.2 },
  pin: { at: 2.05, duration: 0.45, dropFrom: -28 }
};
var STYLES = `
.wu-top-caregiver-card__value {
  position: absolute;
  left: calc(16 * var(--wu-u));
  top: calc(21 * var(--wu-u));
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
  white-space: nowrap;
}

.wu-top-caregiver-card__chip {
  position: absolute;
  right: calc(16 * var(--wu-u));
  top: calc(31 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

/* --x, --w place a bar; --h is its final height and --wu-p how much of it has grown. */
.wu-top-caregiver-card__bar {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  bottom: calc(39.029 * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-p, 1) * var(--wu-u));
  overflow: hidden;
  border-radius: calc(2 * var(--wu-u));
  background: var(--olive-300, #dce7cf);
}

.wu-top-caregiver-card__bar-highlight {
  position: absolute;
  inset: 0;
  background: var(--brand-500, #066e3d);
}

.wu-top-caregiver-card__pin {
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-top-caregiver-card__pin-pill {
  position: absolute;
  left: calc(var(--pill-x) * var(--wu-u));
  top: 0;
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--emerald-500, #023620);
  color: var(--olive-500, #d7e4c9);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
  transform: translateX(-50%);
}

.wu-top-caregiver-card__pin-line {
  position: absolute;
  left: calc(var(--line-x) * var(--wu-u));
  top: calc(21 * var(--wu-u));
  width: calc(1.5 * var(--wu-u));
  height: calc(12 * var(--wu-u));
  background: var(--emerald-500, #023620);
}

.wu-top-caregiver-card__axis {
  position: absolute;
  top: calc(203 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(10 * var(--wu-u));
  font-weight: 500;
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-top-caregiver-card__axis--fewer {
  left: calc(16 * var(--wu-u));
}

.wu-top-caregiver-card__axis--more {
  right: calc(16 * var(--wu-u));
}
`;
function mountTopCaregiverCard(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const topPercent = Math.min(Math.max(Math.round(data.topPercent), 1), 100);
  const values = ((data.distribution?.length) ? data.distribution : FIGMA_DISTRIBUTION).map((value) => Number.isFinite(value) && value > 0 ? value : 0);
  const count = values.length;
  const topBars = Math.min(Math.max(Math.round(count * topPercent / 100), 1), count);
  const firstTop = count - topBars;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => `${labels.top} ${numberFormat.format(Math.round(value))}%`;
  ensureStyles("top-caregiver-card", STYLES);
  const shell = createCardShell(el, {
    className: "wu-top-caregiver-card",
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${labels.top} ${numberFormat.format(topPercent)}% ${labels.chip}`
  });
  const pages = createPages(shell.stage);
  const value = element("wu-top-caregiver-card__value", format(100));
  const chip = element("wu-top-caregiver-card__chip", labels.chip);
  pages.front.append(value, chip);
  const barWidth = CHART.span / (count + (count - 1) * CHART.gapRatio);
  const pitch = barWidth * (1 + CHART.gapRatio);
  const tallest = Math.max(...values, 1);
  const heights = values.map((bar) => Math.max(CHART.minBarHeight, Math.round(CHART.maxBarHeight * bar / tallest)));
  const highlights = [];
  const bars = heights.map((height, index) => {
    const bar = element("wu-top-caregiver-card__bar");
    bar.style.setProperty("--x", String(CHART.x + pitch * index));
    bar.style.setProperty("--w", String(barWidth));
    bar.style.setProperty("--h", String(height));
    if (index >= firstTop) {
      const highlight = element("wu-top-caregiver-card__bar-highlight");
      bar.append(highlight);
      highlights.push(highlight);
    }
    return bar;
  });
  pages.front.append(...bars);
  const pinX = CHART.x + pitch * firstTop + barWidth / 2;
  const pinTop = CHART.baseline - heights[firstTop] - PIN.pillAbove;
  const pin = place(element("wu-top-caregiver-card__pin"), { x: 0, y: pinTop, w: FRAME.width, h: PIN.pillAbove });
  const pill = element("wu-top-caregiver-card__pin-pill", labels.you);
  pill.style.setProperty("--pill-x", String(Math.min(Math.max(pinX, PIN.minX), PIN.maxX)));
  const line = element("wu-top-caregiver-card__pin-line");
  line.style.setProperty("--line-x", String(pinX - PIN.lineWidth / 2));
  pin.append(pill, line);
  pages.front.append(pin, element("wu-top-caregiver-card__axis wu-top-caregiver-card__axis--fewer", labels.fewer), element("wu-top-caregiver-card__axis wu-top-caregiver-card__axis--more", labels.more));
  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  const stagger = (TIMING.bars.endAt - TIMING.bars.at - TIMING.bars.duration) / Math.max(1, count - 1);
  timeline.fromTo(bars, { "--wu-p": 0 }, { "--wu-p": 1, duration: TIMING.bars.duration, ease: "power2.out", stagger }, TIMING.bars.at).fromTo(chip, { opacity: 0 }, { opacity: 1, duration: TIMING.chip.duration, ease: "power1.out" }, TIMING.chip.at).fromTo(highlights, { opacity: 0 }, { opacity: 1, duration: TIMING.highlight.duration, ease: "power1.out" }, TIMING.highlight.at).fromTo(pin, { "--wu-y": TIMING.pin.dropFrom }, { "--wu-y": 0, duration: TIMING.pin.duration, ease: "bounce.out" }, TIMING.pin.at).fromTo(pin, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out" }, TIMING.pin.at);
  addCounter(timeline, value, topPercent, { ...TIMING.counter, from: 100, format, ease: "power2.out" });
  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, "topBars", {
    value: topBars,
    enumerable: true
  });
  if (autoplay)
    card.play();
  return card;
}
export {
  mountTopCaregiverCard
};
