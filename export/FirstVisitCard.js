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
var SCREEN_SECONDS = 6;

// src/shared/flips.ts
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

// src/first-visit-card/first-visit-card.ts
var DEFAULT_LABELS = { sticker: "First visit" };
var FRAME = { width: 360, height: 350 };
var MS_PER_DAY = 86400000;
var FLIP = {
  startAt: 0.9,
  endAt: 2,
  longest: 0.42,
  speedUp: 0.85,
  most: 7,
  daysBefore: 2,
  daysPerStop: 20,
  uneven: [2, -4, 5, -3],
  angle: 100,
  fadeFrom: 80
};
var MARKER = {
  at: 2.1,
  duration: 0.7,
  path: [
    ["M", 74.1051, 9.47798],
    ["C", 123.202, 1.29514, 172.299, 17.6608, 172.299, 53.1198],
    ["C", 172.299, 91.3064, 117.747, 110.4, 74.1051, 107.672],
    ["C", 27.7357, 104.944, 0.45959, 83.1235, 3.1872, 53.1198],
    ["C", 5.91482, 23.116, 46.829, 6.75036, 101.381, 4.02275],
    ["C", 134.113, 1.29514, 155.934, 4.02275, 177.754, 12.2056]
  ],
  width: 178.808,
  height: 110.928,
  strokeWidth: 6,
  tilt: 9,
  x: 105.54,
  y: 128.34,
  stretch: { 1: 1, 2: 1.1445 }
};
var STICKER = { at: 2.8, duration: 0.4, x: 233.48, y: 50.5, tilt: 6, turn: 18, shadow: { y: 12, blur: 20 } };
var STYLES = `
.wu-first-visit-card .wu-page--front {
  perspective: calc(600 * var(--wu-u));
  perspective-origin: 50% calc(52 * var(--wu-u));
}

.wu-first-visit-card__stripe {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(52 * var(--wu-u));
  border-radius: calc(14 * var(--wu-u)) calc(14 * var(--wu-u)) 0 0;
  background: var(--brand-500, #066e3d);
}

.wu-first-visit-card__text {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}

.wu-first-visit-card__month {
  top: calc(20 * var(--wu-u));
  color: var(--beige-50, #fefdfc);
  font-size: calc(13 * var(--wu-u));
  font-weight: 700;
  letter-spacing: calc(2.34 * var(--wu-u));
  text-transform: uppercase;
}

.wu-first-visit-card__day {
  top: calc(83 * var(--wu-u));
  color: var(--emerald-500, #023620);
  font-size: calc(96 * var(--wu-u));
  font-weight: 800;
}

.wu-first-visit-card__weekday {
  top: calc(194 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(16 * var(--wu-u));
  font-weight: 500;
}

/* The sheet being turned: hinged on its top edge, right under the stripe. */
.wu-first-visit-card__leaf {
  position: absolute;
  left: 0;
  top: calc(52 * var(--wu-u));
  width: 100%;
  bottom: 0;
  overflow: hidden;
  border-radius: 0 0 calc(14 * var(--wu-u)) calc(14 * var(--wu-u));
  background: var(--beige-50, #fefdfc);
  transform-origin: 50% 0;
  transform: rotateX(calc(var(--wu-flip, 0) * 1deg));
}

.wu-first-visit-card__leaf .wu-first-visit-card__day {
  top: calc(31 * var(--wu-u));
}

.wu-first-visit-card__leaf .wu-first-visit-card__weekday {
  top: calc(142 * var(--wu-u));
}

/* Light falls off the sheet as it lifts. */
.wu-first-visit-card__leaf-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.05), rgba(3, 26, 13, 0.3));
}

/* And the lifted sheet shades the one below, strongest at the hinge. */
.wu-first-visit-card__hinge-shadow {
  position: absolute;
  left: 0;
  top: calc(52 * var(--wu-u));
  width: 100%;
  height: calc(70 * var(--wu-u));
  background: linear-gradient(to bottom, rgba(3, 26, 13, 0.16), rgba(3, 26, 13, 0));
}

.wu-first-visit-card__marker {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-u));
  overflow: visible;
  transform: rotate(calc(var(--wu-tilt) * 1deg));
}

.wu-first-visit-card__marker path {
  fill: none;
  stroke: var(--olive-500, #d7e4c9);
  stroke-dasharray: 100;
  /* Rounded ends, like the tip of a real marker. */
  stroke-linecap: round;
}
`;
function parseDay(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!day || Number.isNaN(day.getTime()))
    throw new Error(`FirstVisitCard: date must be YYYY-MM-DD, got "${date}"`);
  return day;
}
var addDays = (day, count) => new Date(day.getTime() + count * MS_PER_DAY);
function sheetDates(target) {
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  if (target.getTime() === start.getTime())
    return [addDays(start, -1), target];
  const near = [];
  for (let back = FLIP.daysBefore;back >= 1; back--) {
    const day = addDays(target, -back);
    if (day > start)
      near.push(day);
  }
  const free = Math.round(((near[0] ?? target).getTime() - start.getTime()) / MS_PER_DAY) - 1;
  const count = Math.min(FLIP.most - 1 - near.length, Math.ceil(free / FLIP.daysPerStop));
  const step = (free + 1) / (count + 1);
  const taken = new Set([start, ...near, target].map((day) => day.getUTCDate()));
  const stops = [];
  let after = 0;
  for (let index = 0;index < count; index++) {
    const nudge = Math.round(FLIP.uneven[index % FLIP.uneven.length] * Math.min(1, step / 15));
    const latest = free - (count - 1 - index);
    const ideal = Math.min(Math.max(Math.round(step * (index + 1)) + nudge, after + 1), latest);
    for (let shift = 0;shift <= free; shift = shift > 0 ? -shift : 1 - shift) {
      const offset = ideal + shift;
      if (offset <= after || offset > latest)
        continue;
      const day = addDays(start, offset);
      if (taken.has(day.getUTCDate()))
        continue;
      taken.add(day.getUTCDate());
      stops.push(day);
      after = offset;
      break;
    }
  }
  return [start, ...stops, ...near, target];
}
function markerPath(stretch) {
  const centre = MARKER.width / 2;
  return MARKER.path.map(([command, ...numbers]) => {
    const points = numbers.map((value, index) => index % 2 === 0 ? centre + (value - centre) * stretch : value);
    return `${command}${points.map((value) => value.toFixed(3)).join(" ")}`;
  }).join("");
}
function createMarker(digits) {
  const stretch = MARKER.stretch[digits] ?? MARKER.stretch[2];
  const namespace = "http://www.w3.org/2000/svg";
  const marker = document.createElementNS(namespace, "svg");
  marker.setAttribute("class", "wu-first-visit-card__marker");
  marker.setAttribute("viewBox", `0 0 ${MARKER.width} ${MARKER.height}`);
  marker.setAttribute("aria-hidden", "true");
  marker.style.setProperty("--x", String(MARKER.x - MARKER.width / 2));
  marker.style.setProperty("--y", String(MARKER.y - MARKER.height / 2));
  marker.style.setProperty("--w", String(MARKER.width));
  marker.style.setProperty("--h", String(MARKER.height));
  marker.style.setProperty("--wu-tilt", String(MARKER.tilt));
  const line = document.createElementNS(namespace, "path");
  line.setAttribute("d", markerPath(stretch));
  line.setAttribute("stroke-width", String(MARKER.strokeWidth));
  line.setAttribute("pathLength", "100");
  marker.append(line);
  return { marker, line };
}
function mountFirstVisitCard(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale, ariaLabel, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const target = parseDay(data.date);
  const format = (day, parts) => new Intl.DateTimeFormat(locale, { ...parts, timeZone: "UTC" }).format(day);
  const sheets = sheetDates(target).map((day) => ({
    iso: day.toISOString().slice(0, 10),
    month: format(day, { month: "long", year: "numeric" }),
    day: format(day, { day: "numeric" }),
    weekday: format(day, { weekday: "long" })
  }));
  const last = sheets.length - 1;
  const schedule = flipSchedule(last, Math.min(FLIP.endAt - FLIP.startAt, last * FLIP.longest), FLIP.speedUp);
  const flipSeconds = schedule.reduce((all, flip) => all + flip.duration, 0);
  ensureStyles("first-visit-card", STYLES);
  const shell = createCardShell(el, {
    className: "wu-first-visit-card",
    frame: FRAME,
    maxScale,
    ariaLabel: ariaLabel ?? format(target, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  });
  const pages = createPages(shell.stage);
  pages.all.forEach((page) => page.append(element("wu-first-visit-card__stripe")));
  const text = (name) => element(`wu-first-visit-card__text wu-first-visit-card__${name}`);
  const month = text("month");
  const under = { day: text("day"), weekday: text("weekday") };
  const turning = { day: text("day"), weekday: text("weekday") };
  const { marker, line } = createMarker(sheets[last].day.length);
  const hingeShadow = element("wu-first-visit-card__hinge-shadow");
  const leaf = element("wu-first-visit-card__leaf");
  const leafShade = element("wu-first-visit-card__leaf-shade");
  leaf.append(turning.day, turning.weekday, leafShade);
  pages.front.append(month, marker, under.day, under.weekday, hingeShadow, leaf);
  const sticker = createSticker({ text: labels.sticker, ...STICKER, assetBaseUrl });
  shell.stage.append(sticker);
  const write = (node, value) => {
    if (node.textContent !== value)
      node.textContent = value;
  };
  const showFlip = (seconds) => {
    const index = schedule.findIndex((flip) => seconds < flip.at + flip.duration);
    const resting = seconds <= 0 || index < 0;
    const below = sheets[resting ? seconds <= 0 ? 0 : last : index + 1];
    write(under.day, below.day);
    write(under.weekday, below.weekday);
    if (resting) {
      write(month, below.month);
      leaf.style.opacity = "0";
      hingeShadow.style.opacity = "0";
      return;
    }
    const flip = schedule[index];
    const top = sheets[index];
    const progress = Math.min(Math.max((seconds - flip.at) / flip.duration, 0), 1);
    const angle = FLIP.angle * Math.pow(progress, 1.6);
    write(turning.day, top.day);
    write(turning.weekday, top.weekday);
    write(month, progress < 0.5 ? top.month : below.month);
    leaf.style.setProperty("--wu-flip", angle.toFixed(2));
    leaf.style.opacity = String(Math.min(Math.max((FLIP.angle - angle) / (FLIP.angle - FLIP.fadeFrom), 0), 1));
    leafShade.style.opacity = String(Math.sin(Math.min(angle, 90) * Math.PI / 180));
    hingeShadow.style.opacity = String(Math.sin(progress * Math.PI));
  };
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next) {
      flipped = next;
      showFlip(next);
    }
  };
  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  timeline.fromTo(flipping, { seconds: 0 }, { seconds: flipSeconds, duration: flipSeconds, ease: "none" }, FLIP.startAt).fromTo(marker, { opacity: 0 }, { opacity: 1, duration: 0.01 }, MARKER.at).fromTo(line, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: MARKER.duration, ease: "power1.inOut" }, MARKER.at);
  addStickerPop(timeline, sticker, STICKER.at, { duration: STICKER.duration, turn: STICKER.turn });
  const controller = createController({
    timeline,
    ready: trackImages(shell.root.querySelectorAll("img")),
    onComplete,
    onDestroy: shell.remove
  });
  const card = Object.defineProperty(controller, "flipDates", {
    value: sheets.map((sheet) => sheet.iso),
    enumerable: true
  });
  if (autoplay)
    card.play();
  return card;
}
export {
  mountFirstVisitCard
};
