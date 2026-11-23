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
var SCREEN_SECONDS = 6;

// src/hours-clock/hours-clock.ts
var DEFAULT_LABELS = { fullDays: "Full days", fullDay: "Full day", hours: "hours" };
var FRAME = { width: 236, height: 236 };
var RING = { box: 195.543, inset: 19.1, radius: 92.1524, stroke: 11.2381, restFrom: 150, sweep: 120 };
var NUMERALS = { radius: 66.5, items: [12, 3, 6, 9] };
var TIMING = {
  enter: { at: 0.4, duration: 0.5, offsetY: 24 },
  spin: { at: 0.7, duration: 1.7 },
  turns: { min: 1, max: 6 },
  speedUpUntil: 0.72,
  growUntil: 0.25
};
var STYLES = `
.wu-hours-clock__face {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: calc(1.124 * var(--wu-u)) solid var(--wu-border, #d4d4d4);
  border-radius: 50%;
  background: var(--wu-card, #ffffff);
  box-shadow: 0 calc(16 * var(--wu-u)) calc(15 * var(--wu-u)) 0 rgba(3, 26, 13, 0.16);
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-hours-clock__ring {
  position: absolute;
  left: calc(19.1 * var(--wu-u));
  top: calc(19.1 * var(--wu-u));
  width: calc(195.543 * var(--wu-u));
  height: calc(195.543 * var(--wu-u));
  overflow: visible;
}

.wu-hours-clock__track {
  fill: none;
  stroke: var(--olive-500, #d7e4c9);
}

.wu-hours-clock__arc {
  fill: none;
  stroke: var(--brand-500, #066e3d);
  stroke-linecap: round;
  transform-origin: 50% 50%;
  transform: rotate(calc(var(--wu-turn, 0) * 1deg));
}

.wu-hours-clock__numeral {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  color: var(--wu-muted, #71717a);
  font-size: calc(13.486 * var(--wu-u));
  font-weight: 500;
  line-height: calc(17.56 * var(--wu-u));
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.wu-hours-clock__centre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.wu-hours-clock__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(33.714 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: calc(-1.0114 * var(--wu-u));
  line-height: calc(43.9 * var(--wu-u));
}

.wu-hours-clock__label {
  color: var(--wu-muted, #71717a);
  font-size: calc(12.362 * var(--wu-u));
  font-weight: 500;
  line-height: calc(16.1 * var(--wu-u));
  text-transform: uppercase;
}
`;
function spinEase(progress) {
  const join = TIMING.speedUpUntil;
  const rise = 1 / (1.5 * join * join - 0.5 * join * join * join);
  if (progress < join)
    return rise * progress * progress * progress;
  const brake = 3 * rise * join * join / (2 * (1 - join));
  return 1 - brake * (1 - progress) * (1 - progress);
}
function svg(name, attributes) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, String(value));
  return node;
}
function mountHoursClock(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const fullDays = Math.max(0, Math.round(data.fullDays));
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(Math.round(value));
  const label = fullDays === 1 ? labels.fullDay : labels.fullDays;
  ensureStyles("hours-clock", STYLES);
  const shell = createCardShell(el, {
    className: "wu-hours-clock",
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${format(data.hours)} ${labels.hours}: ${format(fullDays)} ${label}`
  });
  const face = element("wu-hours-clock__face");
  const centreOfRing = RING.box / 2;
  const ring = svg("svg", { class: "wu-hours-clock__ring", viewBox: `0 0 ${RING.box} ${RING.box}`, "aria-hidden": "true" });
  const circle = { cx: centreOfRing, cy: centreOfRing, r: RING.radius, "stroke-width": RING.stroke };
  const arc = svg("circle", { ...circle, class: "wu-hours-clock__arc", pathLength: 360 });
  ring.append(svg("circle", { ...circle, class: "wu-hours-clock__track" }), arc);
  const centre = FRAME.width / 2 - 1.124;
  const numerals = NUMERALS.items.map((numeral, index) => {
    const angle = index * Math.PI / 2;
    const node = element("wu-hours-clock__numeral", String(numeral));
    node.style.setProperty("--x", String(centre + Math.sin(angle) * NUMERALS.radius));
    node.style.setProperty("--y", String(centre - Math.cos(angle) * NUMERALS.radius));
    return node;
  });
  const value = element("wu-hours-clock__value", "0");
  const middle = element("wu-hours-clock__centre");
  middle.append(value, element("wu-hours-clock__label", label));
  face.append(ring, ...numerals, middle);
  shell.stage.append(face);
  const turns = Math.min(Math.max(fullDays, TIMING.turns.min), TIMING.turns.max);
  const restTurn = RING.restFrom - 90;
  const showSpin = (progress) => {
    const travelled = spinEase(progress);
    const sweep = RING.sweep * Math.min(progress / TIMING.growUntil, 1);
    arc.style.setProperty("--wu-turn", (restTurn - 360 * turns * (1 - travelled)).toFixed(2));
    arc.setAttribute("stroke-dasharray", `${sweep.toFixed(2)} 360`);
    arc.style.opacity = progress > 0 ? "1" : "0";
    const text = format(fullDays * travelled);
    if (value.textContent !== text)
      value.textContent = text;
  };
  let spun = 0;
  const spinning = {
    get progress() {
      return spun;
    },
    set progress(next) {
      spun = next;
      showSpin(next);
    }
  };
  const timeline = holdTimeline(SCREEN_SECONDS);
  timeline.fromTo(face, { opacity: 0, "--wu-y": TIMING.enter.offsetY }, { opacity: 1, "--wu-y": 0, duration: TIMING.enter.duration, ease: "power3.out" }, TIMING.enter.at).fromTo(spinning, { progress: 0 }, { progress: 1, duration: TIMING.spin.duration, ease: "none" }, TIMING.spin.at);
  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountHoursClock
};
