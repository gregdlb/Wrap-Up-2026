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
var FRONT_PAGE = { x: 73, y: 60, width: 214, height: 236.029 };
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

// src/shared/flips.ts
var SHEET_STYLES = `
/* Everything below the hinge. The camera is close, so a lifted sheet visibly comes towards the viewer. */
.wu-sheets {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: calc(var(--wu-hinge, 0) * var(--wu-u));
  perspective: calc(var(--wu-sheet-distance) * var(--wu-u));
  perspective-origin: 50% 0;
  pointer-events: none;
}

.wu-sheet {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--wu-sheet-radius, calc(14 * var(--wu-u)));
  background: var(--beige-50, #fefdfc);
  box-shadow: 0 calc(8 * var(--wu-u)) calc(20 * var(--wu-u)) rgba(3, 26, 13, calc(var(--wu-lift, 0) * 0.14));
  transform-origin: 50% 0;
  transform: rotateX(calc(var(--wu-flip, 0) * 1deg)) scale(var(--wu-swell, 1));
  backface-visibility: hidden;
}

/* A lifted sheet shades the one below it, strongest at the hinge. */
.wu-sheets__shadow {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(56 * var(--wu-u));
  border-radius: var(--wu-sheet-radius, calc(14 * var(--wu-u)));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.09), rgba(3, 26, 13, 0));
}
`;
var SHEET = { seconds: 0.55, distance: 4.5, follow: 0.77, soonest: 0.52, swell: 0.062, swellUntil: 0.36 };
var TURN = [
  [0, 0],
  [0.08, 5.5],
  [0.16, 14.5],
  [0.24, 26],
  [0.32, 34.5],
  [0.4, 43],
  [0.48, 52],
  [0.56, 57.5],
  [0.64, 64],
  [0.72, 71.5],
  [0.8, 78],
  [0.88, 84],
  [0.94, 87],
  [1, 90]
];
var PAPER = [
  [0, 1],
  [0.23, 1],
  [0.47, 0.6],
  [0.78, 0.45],
  [1, 0]
];
function along(table, p) {
  const next = table.findIndex(([at]) => p <= at);
  const [fromAt, from] = table[Math.max(next - 1, 0)];
  const [toAt, to] = table[next];
  return toAt === fromAt ? to : from + (p - fromAt) / (toAt - fromAt) * (to - from);
}
function sheetPose(progress) {
  const p = Math.min(Math.max(progress, 0), 1);
  const angle = along(TURN, p);
  const swell = 1 + (p < SHEET.swellUntil ? SHEET.swell * Math.sin(Math.PI * p / SHEET.swellUntil) : 0);
  return { angle, opacity: along(PAPER, p), lift: Math.sin(angle * Math.PI / 180), swell };
}
function flipStarts(count, window2) {
  const fitted = count > 1 ? Math.max(window2 - SHEET.seconds, 0) / (count - 1) : 0;
  const step = Math.max(Math.min(SHEET.seconds * SHEET.follow, fitted), SHEET.seconds * SHEET.soonest);
  return Array.from({ length: count }, (_, index) => index * step);
}
function createSheets(config) {
  ensureStyles("sheets", SHEET_STYLES);
  const { count, hinge, height, window: window2 } = config;
  const starts = flipStarts(count, window2);
  const node = element("wu-sheets");
  node.style.setProperty("--wu-hinge", String(hinge));
  node.style.setProperty("--wu-sheet-distance", String((height - hinge) * SHEET.distance));
  const shadow = element("wu-sheets__shadow");
  const sheets = Array.from({ length: count }, () => element("wu-sheet"));
  node.append(shadow, ...[...sheets].reverse());
  const show = (seconds) => {
    let top = count;
    let lifted = 0;
    sheets.forEach((sheet, index) => {
      const progress = (seconds - starts[index]) / SHEET.seconds;
      if (progress > 0.9999) {
        sheet.style.visibility = "hidden";
        return;
      }
      const pose = sheetPose(progress);
      sheet.style.visibility = "";
      sheet.style.opacity = String(pose.opacity);
      sheet.style.setProperty("--wu-flip", pose.angle.toFixed(2));
      sheet.style.setProperty("--wu-lift", pose.lift.toFixed(3));
      sheet.style.setProperty("--wu-swell", pose.swell.toFixed(4));
      lifted = Math.max(lifted, pose.lift * pose.opacity);
      if (top === count && progress < 0.45)
        top = index;
    });
    shadow.style.opacity = String(lifted);
    return top;
  };
  return { node, sheets, seconds: (starts.at(-1) ?? 0) + SHEET.seconds, show };
}
var BLANK_FLIPS = { count: 3, at: 0.2, endAt: 1.35 };
function addBlankFlips(timeline, frontPage) {
  const { count, at, endAt } = BLANK_FLIPS;
  const sheets = createSheets({ count, hinge: 0, height: FRONT_PAGE.height, window: endAt - at });
  frontPage.append(sheets.node);
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next) {
      flipped = next;
      sheets.show(next);
    }
  };
  timeline.fromTo(flipping, { seconds: 0 }, { seconds: sheets.seconds, duration: sheets.seconds, ease: "none" }, at);
}

// src/shared/text.ts
var NBSP = " ";
function keepTogether(text) {
  return text.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`).replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`).replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`).replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`);
}

// src/weeks-card/weeks-card.ts
var FRAME = { width: 360, height: 350 };
var GRID = { x: 19.25, y: 62, size: 18, pitch: 22.5, columns: 8, maxRows: 7, labelGap: 6 };
var TIMING = { fill: { at: 1.05, endAt: 2, duration: 0.25, maxStagger: 0.04 } };
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
