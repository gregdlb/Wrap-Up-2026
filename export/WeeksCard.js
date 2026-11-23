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

// src/shared/flips.ts
var FLIP_STYLES = `
.wu-flips {
  perspective: calc(600 * var(--wu-u));
  perspective-origin: 50% 0;
}

.wu-flips__sheet {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(14 * var(--wu-u));
  background: var(--beige-50, #fefdfc);
}

.wu-flips__leaf {
  transform-origin: 50% 0;
  transform: rotateX(calc(var(--wu-flip, 0) * 1deg));
}

/* Light falls off the sheet as it lifts. */
.wu-flips__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.05), rgba(3, 26, 13, 0.3));
}

/* And the lifted sheet shades the one below, strongest at the hinge. */
.wu-flips__shadow {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(70 * var(--wu-u));
  border-radius: calc(14 * var(--wu-u)) calc(14 * var(--wu-u)) 0 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.16), rgba(3, 26, 13, 0));
}
`;
var BLANK_FLIPS = { count: 3, at: 0.5, endAt: 1, speedUp: 0.85, angle: 100, fadeFrom: 80 };
function flipSchedule(flips, seconds, speedUp) {
  const weights = Array.from({ length: flips }, (_, index) => Math.pow(speedUp, index));
  const sum = weights.reduce((all, weight) => all + weight, 0);
  let at = 0;
  return weights.map((weight) => {
    const flip = { at, duration: seconds * weight / sum };
    at += flip.duration;
    return flip;
  });
}
function addBlankFlips(timeline, frontPage) {
  ensureStyles("flips", FLIP_STYLES);
  frontPage.classList.add("wu-flips");
  const cover = element("wu-flips__sheet");
  const shadow = element("wu-flips__shadow");
  const leaf = element("wu-flips__sheet wu-flips__leaf");
  const shade = element("wu-flips__shade");
  leaf.append(shade);
  frontPage.append(cover, shadow, leaf);
  const { count, at, endAt, speedUp, angle: fullAngle, fadeFrom } = BLANK_FLIPS;
  const schedule = flipSchedule(count, endAt - at, speedUp);
  const show = (seconds) => {
    const index = schedule.findIndex((flip) => seconds < flip.at + flip.duration);
    if (seconds <= 0 || index < 0) {
      cover.style.opacity = seconds <= 0 ? "1" : "0";
      leaf.style.opacity = "0";
      shadow.style.opacity = "0";
      return;
    }
    const flip = schedule[index];
    const progress = Math.min(Math.max((seconds - flip.at) / flip.duration, 0), 1);
    const angle = fullAngle * Math.pow(progress, 1.6);
    cover.style.opacity = index < count - 1 ? "1" : "0";
    leaf.style.setProperty("--wu-flip", angle.toFixed(2));
    leaf.style.opacity = String(Math.min(Math.max((fullAngle - angle) / (fullAngle - fadeFrom), 0), 1));
    shade.style.opacity = String(Math.sin(Math.min(angle, 90) * Math.PI / 180));
    shadow.style.opacity = String(Math.sin(progress * Math.PI));
  };
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next) {
      flipped = next;
      show(next);
    }
  };
  timeline.fromTo(flipping, { seconds: 0 }, { seconds: endAt - at, duration: endAt - at, ease: "none" }, at);
}

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

// src/shared/text.ts
var NBSP = " ";
function keepTogether(text) {
  return text.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`).replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`).replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`).replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`);
}

// src/weeks-card/weeks-card.ts
var FRAME = { width: 360, height: 350 };
var GRID = { x: 19.25, y: 62, size: 18, pitch: 22.5, columns: 8, maxRows: 7, labelGap: 6 };
var TIMING = { fill: { at: 0.85, endAt: 2, duration: 0.25, maxStagger: 0.04 } };
var STYLES = `
.wu-weeks-card__stat {
  position: absolute;
  left: calc(19.25 * var(--wu-u));
  top: calc(24 * var(--wu-u));
  display: flex;
  align-items: flex-start;
  gap: calc(8 * var(--wu-u));
  white-space: nowrap;
}

/* The unit follows the number as it counts; tabular digits keep it from jittering. */
.wu-weeks-card__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
}

.wu-weeks-card__unit {
  margin-top: calc(14 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-weeks-card__legend {
  position: absolute;
  right: calc(19.25 * var(--wu-u));
  top: calc(34 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

/* A week without a visit: an empty outlined square. */
.wu-weeks-card__week {
  box-sizing: border-box;
  border: calc(1.5 * var(--wu-u)) solid var(--wu-border, #d4d4d4);
  border-radius: calc(4 * var(--wu-u));
  background: var(--wu-card, #ffffff);
}

/* A week with a visit outside the streak. */
.wu-weeks-card__week--visited {
  border: 0;
  background: var(--olive-500, #d7e4c9);
}

/* The streak color, laid over the square when its turn comes. */
.wu-weeks-card__fill {
  position: absolute;
  inset: calc(-1.5 * var(--wu-u));
  border-radius: calc(4 * var(--wu-u));
  background: var(--brand-500, #066e3d);
  transform: scale(var(--wu-pop, 1));
}

.wu-weeks-card__week--visited .wu-weeks-card__fill {
  inset: 0;
}

.wu-weeks-card__month {
  position: absolute;
  top: calc(var(--y) * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(10 * var(--wu-u));
  font-weight: 500;
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-weeks-card__month--from {
  left: calc(19.25 * var(--wu-u));
}

.wu-weeks-card__month--to {
  right: calc(19.25 * var(--wu-u));
}
`;
function longestRun(weeks) {
  let best = null;
  let start = -1;
  weeks.forEach((visited, index) => {
    if (!visited) {
      start = -1;
      return;
    }
    if (start < 0)
      start = index;
    if (!best || index - start >= best.end - best.start)
      best = { start, end: index };
  });
  return best;
}
function lastMonth(totalWeeks, locale) {
  const midWeek = new Date(Date.UTC(2026, 0, totalWeeks * 7 - 3));
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(midWeek);
}
function mountWeeksCard(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale } = options;
  const totalWeeks = Math.min(Math.max(1, Math.round(data.totalWeeks)), GRID.columns * GRID.maxRows);
  const weeksInARow = Math.min(Math.max(0, Math.round(data.weeksInARow)), totalWeeks);
  const visited = Array.from({ length: totalWeeks }, (_, index) => data.weeks?.[index] === true);
  const end = (data.weeks && longestRun(visited)?.end) ?? totalWeeks - 1;
  const streak = { start: Math.max(0, end - weeksInARow + 1), end };
  const inStreak = (index) => weeksInARow > 0 && index >= streak.start && index <= streak.end;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(Math.round(value));
  const labels = {
    week: "week",
    weeks: "weeks",
    legend: "1 = 1 week",
    from: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1))),
    to: lastMonth(totalWeeks, locale),
    ...options.labels
  };
  const unit = weeksInARow === 1 ? labels.week : labels.weeks;
  ensureStyles("weeks-card", STYLES);
  const shell = createCardShell(el, {
    className: "wu-weeks-card",
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${format(weeksInARow)} ${unit}`
  });
  const pages = createPages(shell.stage);
  const value = element("wu-weeks-card__value", "0");
  const stat = element("wu-weeks-card__stat");
  stat.append(value, element("wu-weeks-card__unit", unit));
  pages.front.append(stat, element("wu-weeks-card__legend", keepTogether(labels.legend)));
  const fills = [];
  for (let index = 0;index < totalWeeks; index++) {
    const column = index % GRID.columns;
    const row = Math.floor(index / GRID.columns);
    const box = { x: GRID.x + GRID.pitch * column, y: GRID.y + GRID.pitch * row, w: GRID.size, h: GRID.size };
    const week = place(element(`wu-weeks-card__week${visited[index] ? " wu-weeks-card__week--visited" : ""}`), box);
    if (inStreak(index)) {
      const fill = element("wu-weeks-card__fill");
      week.append(fill);
      fills.push(fill);
    }
    pages.front.append(week);
  }
  const rows = Math.ceil(totalWeeks / GRID.columns);
  const monthsY = GRID.y + GRID.pitch * (rows - 1) + GRID.size + GRID.labelGap;
  for (const [side, text] of [["from", labels.from], ["to", labels.to]]) {
    const month = element(`wu-weeks-card__month wu-weeks-card__month--${side}`, text);
    month.style.setProperty("--y", String(monthsY));
    pages.front.append(month);
  }
  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  addBlankFlips(timeline, pages.front);
  const { at, endAt, duration, maxStagger } = TIMING.fill;
  const stagger = Math.min(maxStagger, (endAt - at - duration) / Math.max(1, fills.length - 1));
  if (fills.length > 0) {
    timeline.fromTo(fills, { "--wu-pop": 0.5 }, { "--wu-pop": 1, duration, ease: "back.out(2)", stagger }, at).fromTo(fills, { opacity: 0 }, { opacity: 1, duration: duration / 2, ease: "power1.out", stagger }, at);
  }
  addCounter(timeline, value, weeksInARow, {
    at,
    duration: Math.max(0.6, stagger * (fills.length - 1) + duration),
    format,
    ease: "none"
  });
  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, "streak", { value: streak, enumerable: true });
  if (autoplay)
    card.play();
  return card;
}
export {
  mountWeeksCard
};
