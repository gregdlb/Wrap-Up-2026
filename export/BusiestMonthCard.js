// src/shared/controller.ts
import gsap from "gsap";

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
var VIDEO_HOLD_SECONDS = 1.5;
function screenSeconds(videoSeconds = 0) {
  return Math.max(SCREEN_SECONDS, Math.round((videoSeconds + VIDEO_HOLD_SECONDS) * 100) / 100);
}

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

// src/shared/screen-05.ts
var MONTHS_CARD_FRAME = { width: 360, height: 350 };

// src/shared/card.ts
function element(className, text) {
  const node = document.createElement("div");
  node.className = className;
  if (text !== undefined)
    node.textContent = text;
  return node;
}

// src/shared/pages.ts
var FRONT_PAGE = { x: 73, y: 60, width: 214, height: 236.029 };

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

// src/busiest-month-card/analyze.ts
var MONTHS_IN_YEAR = 12;
var DEFAULT_STEADY_THRESHOLD = 0.22;
var DEFAULT_MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
var MIN_WEEKS = 2;
function sanitize(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
function indicesOfMax(values, max) {
  if (max <= 0)
    return [];
  return values.flatMap((value, index) => value === max ? [index] : []);
}
function analyzeBusiestMonthCard(data, options = {}) {
  const { steadyThreshold = DEFAULT_STEADY_THRESHOLD, monthLabels = DEFAULT_MONTH_LABELS } = options;
  if (data.visitsPerMonth.length !== MONTHS_IN_YEAR) {
    throw new Error(`BusiestMonthCard: visitsPerMonth needs ${MONTHS_IN_YEAR} values, got ${data.visitsPerMonth.length}`);
  }
  const useWeeks = (data.weeks?.length ?? 0) >= MIN_WEEKS;
  const source = useWeeks ? data.weeks.map(({ label, value }) => ({ label, value: sanitize(value) })) : data.visitsPerMonth.map((value, index) => ({ label: monthLabels[index] ?? "", value: sanitize(value) }));
  const values = source.map((bar) => bar.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const maxima = indicesOfMax(values, max);
  const primaryIndex = maxima.at(-1) ?? 0;
  let variant;
  let highlighted = maxima;
  if (useWeeks) {
    variant = "busiest_week";
  } else if (average === 0 || (max - min) / average < steadyThreshold) {
    variant = "steady";
    highlighted = maxima.length > 0 ? [primaryIndex] : [];
  } else {
    variant = maxima.length > 1 ? "tie" : "peak";
  }
  return {
    variant,
    bars: source.map((bar, index) => ({ ...bar, highlighted: highlighted.includes(index) })),
    highlighted,
    primaryIndex,
    value: variant === "steady" ? Math.round(average) : max,
    unit: variant === "steady" ? "per_month" : "visits",
    max,
    average
  };
}

// src/busiest-month-card/styles.ts
var BUSIEST_MONTH_CARD_STYLES = `
.wu-busiest-month-card {
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
.wu-busiest-month-card__stage {
  position: absolute;
  inset: 0;
  width: calc(360 * var(--wu-u));
  height: calc(350 * var(--wu-u));
  margin: auto;
}

.wu-busiest-month-card__page {
  position: absolute;
  background: var(--beige-50, #fefdfc);
  border-radius: calc(14 * var(--wu-u));
  box-shadow: 0 calc(16 * var(--wu-u)) calc(30 * var(--wu-u)) 0 rgba(3, 26, 13, 0.16);
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-busiest-month-card__page--back {
  left: calc(88 * var(--wu-u));
  top: calc(110 * var(--wu-u));
  width: calc(183.146 * var(--wu-u));
  height: calc(202 * var(--wu-u));
}

.wu-busiest-month-card__page--middle {
  left: calc(81 * var(--wu-u));
  top: calc(85 * var(--wu-u));
  width: calc(198.56 * var(--wu-u));
  height: calc(219 * var(--wu-u));
}

.wu-busiest-month-card__page--front {
  left: calc(73 * var(--wu-u));
  top: calc(60 * var(--wu-u));
  width: calc(214 * var(--wu-u));
  height: calc(236.029 * var(--wu-u));
}

.wu-busiest-month-card__stat {
  position: absolute;
  left: calc(16.25 * var(--wu-u));
  top: calc(21 * var(--wu-u));
  display: flex;
  align-items: flex-start;
  gap: calc(8 * var(--wu-u));
  white-space: nowrap;
}

/* Digits of equal width keep the number steady while it counts; the unit follows 8 px behind it. */
.wu-busiest-month-card__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
}

.wu-busiest-month-card__unit {
  margin-top: calc(14 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-busiest-month-card__year {
  position: absolute;
  right: calc(16.25 * var(--wu-u));
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

/* One column per bar: --wu-x and --wu-w place it, --wu-h is the bar's final height. */
.wu-busiest-month-card__column {
  position: absolute;
  left: calc(var(--wu-x) * var(--wu-u));
  top: 0;
  width: calc(var(--wu-w) * var(--wu-u));
  height: 100%;
}

.wu-busiest-month-card__bar {
  position: absolute;
  left: 0;
  bottom: calc(39.029 * var(--wu-u));
  width: 100%;
  height: calc(var(--wu-h) * var(--wu-p, 1) * var(--wu-u));
  overflow: hidden;
  border-radius: calc(4 * var(--wu-u)) calc(4 * var(--wu-u)) calc(2 * var(--wu-u)) calc(2 * var(--wu-u));
  background: var(--olive-300, #dce7cf);
}

.wu-busiest-month-card__bar-highlight {
  position: absolute;
  inset: 0;
  background: var(--brand-500, #066e3d);
  opacity: 0;
}

.wu-busiest-month-card__label {
  position: absolute;
  left: 0;
  top: calc(203 * var(--wu-u));
  width: 100%;
  display: grid;
  justify-content: center;
  justify-items: center;
  font-size: calc(10 * var(--wu-u));
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-busiest-month-card__label > * {
  grid-area: 1 / 1;
}

.wu-busiest-month-card__label-text {
  color: var(--taupe-700, #6d615d);
  font-weight: 500;
}

.wu-busiest-month-card__label-highlight {
  color: var(--brand-500, #066e3d);
  font-weight: 700;
  opacity: 0;
}

/* Week bars are square in Figma and their labels are one size smaller. */
.wu-busiest-month-card[data-variant='busiest_week'] .wu-busiest-month-card__bar {
  border-radius: 0;
}

.wu-busiest-month-card[data-variant='busiest_week'] .wu-busiest-month-card__label {
  top: calc(205 * var(--wu-u));
  font-size: calc(9 * var(--wu-u));
  line-height: calc(12 * var(--wu-u));
}
`;

// src/busiest-month-card/busiest-month-card.ts
var DEFAULT_LABELS = { visit: "visit", visits: "visits", perMonth: "a month" };
var TIMING = {
  pages: { at: 0.4, duration: 0.48, stagger: 0.06, offsetY: 24 },
  bars: { at: 1.05, endAt: 2.5, stagger: 0.04, minDuration: 0.3 },
  counter: { at: 1.05, endAt: 2.5 },
  highlight: { at: 2.5, duration: 0.3, overshoot: 1.06 }
};
var CHART = {
  maxBarHeight: 110,
  minBarHeight: 2,
  month: { firstX: 16.25, barWidth: 11, pitch: 15.5 },
  week: { firstX: 16, span: 184, gapRatio: 0.5 }
};
function element2(className, text) {
  const node = document.createElement("div");
  node.className = className;
  if (text !== undefined)
    node.textContent = text;
  return node;
}
function monthNames(locale, width) {
  const format = new Intl.DateTimeFormat(locale, { month: width, timeZone: "UTC" });
  return Array.from({ length: MONTHS_IN_YEAR }, (_, month) => format.format(new Date(Date.UTC(2026, month, 1))));
}
function layoutBars(count, variant) {
  if (variant !== "busiest_week") {
    const { firstX, barWidth, pitch } = CHART.month;
    return Array.from({ length: count }, (_, index) => ({ x: firstX + pitch * index, width: barWidth }));
  }
  const { firstX, span, gapRatio } = CHART.week;
  const width = span / (count + (count - 1) * gapRatio);
  return Array.from({ length: count }, (_, index) => ({ x: firstX + width * (1 + gapRatio) * index, width }));
}
function barHeight(value, max) {
  if (value <= 0 || max <= 0)
    return CHART.minBarHeight;
  return Math.max(CHART.minBarHeight, Math.round(CHART.maxBarHeight * value / max));
}
function visibleWeekLabels(count, highlighted) {
  const visible = new Set(highlighted);
  for (let index = 0;index < count; index++) {
    if (!visible.has(index - 1) && !visible.has(index + 1))
      visible.add(index);
  }
  return visible;
}
function describe(analysis, data, unit, value, locale) {
  const summary = `${data.year}: ${value} ${unit}`;
  if (analysis.variant === "steady" || analysis.highlighted.length === 0)
    return summary;
  const fullMonthNames = analysis.variant === "busiest_week" ? null : monthNames(locale, "long");
  const names = analysis.highlighted.map((index) => fullMonthNames?.[index] ?? analysis.bars[index]?.label ?? "");
  return `${names.join(", ")}, ${summary}`;
}
function render(analysis, data, unit) {
  const root = element2("wu-busiest-month-card");
  root.dataset.variant = analysis.variant;
  root.setAttribute("role", "img");
  const stage = element2("wu-busiest-month-card__stage");
  const back = element2("wu-busiest-month-card__page wu-busiest-month-card__page--back");
  const middle = element2("wu-busiest-month-card__page wu-busiest-month-card__page--middle");
  const front = element2("wu-busiest-month-card__page wu-busiest-month-card__page--front");
  const stat = element2("wu-busiest-month-card__stat");
  const value = element2("wu-busiest-month-card__value", "0");
  stat.append(value, element2("wu-busiest-month-card__unit", unit));
  front.append(stat, element2("wu-busiest-month-card__year", String(data.year)));
  const view = {
    root,
    pages: [front, middle, back],
    value,
    bars: [],
    highlightedBars: [],
    barHighlights: [],
    labelTexts: [],
    labelHighlights: []
  };
  const slots = layoutBars(analysis.bars.length, analysis.variant);
  const labelled = analysis.variant === "busiest_week" ? visibleWeekLabels(analysis.bars.length, analysis.highlighted) : null;
  analysis.bars.forEach((bar, index) => {
    const slot = slots[index];
    const column = element2("wu-busiest-month-card__column");
    column.style.setProperty("--wu-x", String(slot.x));
    column.style.setProperty("--wu-w", String(slot.width));
    column.style.setProperty("--wu-h", String(barHeight(bar.value, analysis.max)));
    const barNode = element2("wu-busiest-month-card__bar");
    column.append(barNode);
    view.bars.push(barNode);
    const showLabel = labelled === null || labelled.has(index);
    const label = showLabel ? element2("wu-busiest-month-card__label") : null;
    const labelText = label ? element2("wu-busiest-month-card__label-text", bar.label) : null;
    if (label && labelText) {
      label.append(labelText);
      column.append(label);
    }
    if (bar.highlighted) {
      const barHighlight = element2("wu-busiest-month-card__bar-highlight");
      barNode.append(barHighlight);
      view.highlightedBars.push(barNode);
      view.barHighlights.push(barHighlight);
      if (label && labelText) {
        const labelHighlight = element2("wu-busiest-month-card__label-highlight", bar.label);
        label.append(labelHighlight);
        view.labelTexts.push(labelText);
        view.labelHighlights.push(labelHighlight);
      }
    }
    front.append(column);
  });
  stage.append(back, middle, front);
  root.append(stage);
  return view;
}
function fitToContainer(root, maxScale) {
  let ownsHeight = null;
  return observeSize(root, (box) => {
    if (box.width === 0)
      return;
    if (ownsHeight === null)
      ownsHeight = box.height === 0;
    const scale = containScale(ownsHeight ? { ...box, height: Infinity } : box, MONTHS_CARD_FRAME, maxScale);
    if (ownsHeight)
      root.style.height = `${MONTHS_CARD_FRAME.height * scale}px`;
    root.style.setProperty("--wu-u", `${scale}px`);
  });
}
function buildTimeline(view, target, format, seconds) {
  const { pages, bars, counter, highlight } = TIMING;
  const timeline = holdTimeline(seconds);
  const barDuration = Math.max(bars.minDuration, bars.endAt - bars.at - bars.stagger * (view.bars.length - 1));
  let counted = 0;
  const count = {
    get value() {
      return counted;
    },
    set value(next) {
      counted = next;
      view.value.textContent = format(Math.round(next));
    }
  };
  timeline.fromTo(view.pages, { opacity: 0, "--wu-y": pages.offsetY }, { opacity: 1, "--wu-y": 0, duration: pages.duration, ease: "power3.out", stagger: pages.stagger }, pages.at).fromTo(view.bars, { "--wu-p": 0 }, { "--wu-p": 1, duration: barDuration, ease: "power2.out", stagger: bars.stagger }, bars.at).fromTo(count, { value: 0 }, { value: target, duration: counter.endAt - counter.at, ease: "power1.out" }, counter.at).fromTo(view.barHighlights, { opacity: 0 }, { opacity: 1, duration: highlight.duration, ease: "power1.out" }, highlight.at).fromTo(view.labelHighlights, { opacity: 0 }, { opacity: 1, duration: highlight.duration, ease: "power1.out" }, highlight.at).fromTo(view.labelTexts, { opacity: 1 }, { opacity: 0, duration: highlight.duration, ease: "power1.out" }, highlight.at).fromTo(view.highlightedBars, { "--wu-p": 1 }, {
    "--wu-p": highlight.overshoot,
    duration: highlight.duration / 2,
    ease: "power1.inOut",
    yoyo: true,
    repeat: 1,
    immediateRender: false
  }, highlight.at);
  return timeline;
}
var GARLAND_VIDEO_SECONDS = { 1: 4, 2: 2.63, 3: 4.79, 4: 4.54, 5: 4 };
function mountBusiestMonthCard(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale = DEFAULT_MAX_SCALE } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const analysis = analyzeBusiestMonthCard(data, {
    steadyThreshold: options.steadyThreshold,
    monthLabels: monthNames(locale, "narrow")
  });
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(value);
  const finalValue = format(analysis.value);
  const unit = analysis.unit === "per_month" ? labels.perMonth : analysis.value === 1 ? labels.visit : labels.visits;
  ensureStyles("busiest-month-card", BUSIEST_MONTH_CARD_STYLES);
  const view = render(analysis, data, unit);
  view.root.setAttribute("aria-label", options.ariaLabel ?? describe(analysis, data, unit, finalValue, locale));
  el.append(view.root);
  const stopFitting = fitToContainer(view.root, maxScale);
  const month = options.month ?? (analysis.variant === "busiest_week" ? undefined : analysis.primaryIndex + 1);
  const garlandSeconds = month === undefined ? undefined : GARLAND_VIDEO_SECONDS[month];
  const timeline = buildTimeline(view, analysis.value, format, screenSeconds(garlandSeconds));
  addBlankFlips(timeline, view.pages[0]);
  const controller = createController({
    timeline,
    onComplete,
    onDestroy: () => {
      stopFitting();
      view.root.remove();
    }
  });
  const card = Object.defineProperty(controller, "analysis", {
    value: analysis,
    enumerable: true
  });
  if (autoplay)
    card.play();
  return card;
}
export {
  analyzeBusiestMonthCard,
  mountBusiestMonthCard
};
