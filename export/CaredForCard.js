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

// src/cared-for-card/cared-for-card.ts
var DEFAULT_LABELS = { visit: "visit", visits: "visits", since: "Since", people: "people" };
var STICKER_FRAME = { width: 360, height: 360 };
var STICKER = { x: 39.37, y: 285.01, tilt: 2 };
var ROW_COLORS = [
  ["var(--yellow-300, #fbd48a)", "var(--yellow-900, #734c1b)"],
  ["var(--violet-300, #ddcefe)", "var(--violet-900, #5e528c)"],
  ["var(--violet-200, #e9deff)", "var(--violet-900, #5e528c)"],
  ["var(--orange-200, #fbd2b8)", "var(--orange-900, #6f3313)"],
  ["var(--olive-300, #dce7cf)", "var(--brand-600, #055e34)"]
];
var TIMING = { rows: { at: 0.6, stagger: 0.15, duration: 0.4, offsetX: -16 }, countEndAt: 2, sticker: 2 };
var STYLES = `
.wu-cared-for-names {
  --wu-u: calc(var(--wu-unit, 1px) * var(--wu-fit, 1));

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(10 * var(--wu-u));
  font-family: var(--wu-font-sans, 'Rethink Sans', system-ui, sans-serif);
  font-synthesis: none;
  -webkit-user-select: none;
  user-select: none;
}

.wu-cared-for-names__row {
  display: flex;
  align-items: center;
  gap: calc(10 * var(--wu-u));
  padding: calc(2 * var(--wu-u)) calc(8 * var(--wu-u)) 0 calc(10 * var(--wu-u));
  border-radius: calc(4 * var(--wu-u));
  background: var(--wu-row-bg);
  white-space: nowrap;
  transform: translate3d(calc(var(--wu-x, 0) * var(--wu-u)), 0, 0);
}

.wu-cared-for-names__row--single {
  gap: calc(8 * var(--wu-u));
  padding-right: calc(10 * var(--wu-u));
}

.wu-cared-for-names__name {
  color: var(--wu-row-color);
  font-family: var(--wu-font-serif, 'Hedvig Letters Serif', Georgia, serif);
  font-size: calc(40 * var(--wu-u));
  font-weight: 400;
  letter-spacing: calc(-0.4 * var(--wu-u));
  line-height: 1.08;
}

/* The watercolor heart sits in a slightly larger box because it is tilted by 2 degrees. */
.wu-cared-for-names__heart {
  display: block;
  width: calc(var(--wu-heart) * var(--wu-u));
  height: calc(var(--wu-heart) * var(--wu-u));
  margin: calc(var(--wu-heart) * 0.0172 * var(--wu-u));
  transform: rotate(2deg) scale(var(--wu-pop, 1));
}

.wu-cared-for-names__badge {
  display: flex;
  align-items: center;
  gap: calc(4 * var(--wu-u));
  padding: calc(4 * var(--wu-u)) calc(10 * var(--wu-u)) calc(4 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--beige-50, #fefdfc);
  color: var(--emerald-500, #023620);
  font-size: calc(14 * var(--wu-u));
  font-weight: 600;
  line-height: calc(18 * var(--wu-u));
}

/* The word follows the number as it counts; tabular digits keep it from jittering. */
.wu-cared-for-names__count {
  font-variant-numeric: tabular-nums;
}
`;
function heartImage(size, assetBaseUrl) {
  const image = document.createElement("img");
  image.className = "wu-cared-for-names__heart";
  image.style.setProperty("--wu-heart", String(size));
  image.alt = "";
  image.draggable = false;
  image.src = heartUrl(assetBaseUrl);
  return image;
}
function formatDay(date, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match)
    return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(day);
}
function mountCaredForCard(targets, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const people = data.people.map((person) => ({ name: person.name, visits: Math.max(0, Math.round(person.visits)) }));
  const single = people.length === 1;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(Math.round(value));
  const visitsLabel = (count) => count === 1 ? labels.visit : labels.visits;
  const timeline = holdTimeline(SCREEN_SECONDS);
  ensureStyles("cared-for-card", STYLES);
  const names = element("wu-cared-for-names");
  const counts = [];
  const rows = people.map((person, index) => {
    const [background, color] = ROW_COLORS[index % ROW_COLORS.length];
    const row = element(`wu-cared-for-names__row${single ? " wu-cared-for-names__row--single" : ""}`);
    row.style.setProperty("--wu-row-bg", background);
    row.style.setProperty("--wu-row-color", color);
    row.append(element("wu-cared-for-names__name", person.name));
    const arrivesAt = TIMING.rows.at + TIMING.rows.stagger * index;
    if (single) {
      const heart = heartImage(30, assetBaseUrl);
      row.append(heart);
      timeline.fromTo(heart, { "--wu-pop": 0 }, { "--wu-pop": 1, duration: 0.35, ease: "back.out(2.2)" }, arrivesAt + 0.3);
    } else {
      const count = document.createElement("span");
      count.className = "wu-cared-for-names__count";
      count.textContent = "0";
      const text = document.createElement("span");
      text.append(count, ` ${visitsLabel(person.visits)}`);
      const badge = element("wu-cared-for-names__badge");
      badge.append(heartImage(16, assetBaseUrl), text);
      row.append(badge);
      counts.push({ node: count, final: format(person.visits) });
      const countAt = arrivesAt + TIMING.rows.duration / 2;
      addCounter(timeline, count, person.visits, { at: countAt, duration: TIMING.countEndAt - countAt, format });
    }
    return row;
  });
  names.append(...rows);
  targets.names.append(names);
  const fitNames = () => {
    names.style.setProperty("--wu-fit", "1");
    const shown = counts.map(({ node }) => node.textContent);
    counts.forEach(({ node, final }) => node.textContent = final);
    const room = targets.names.clientWidth;
    const widest = Math.max(0, ...rows.map((row) => row.offsetWidth));
    counts.forEach(({ node }, index) => node.textContent = shown[index] ?? "");
    if (room > 0 && widest > room)
      names.style.setProperty("--wu-fit", String(Math.floor(room / widest * 1000) / 1000));
  };
  let slotWidth = -1;
  const stopFitting = observeSize(targets.names, ({ width }) => {
    if (width === slotWidth)
      return;
    slotWidth = width;
    fitNames();
  });
  document.fonts?.ready.then(() => names.isConnected && fitNames());
  if (rows.length > 0) {
    const { at, stagger, duration, offsetX } = TIMING.rows;
    timeline.fromTo(rows, { "--wu-x": offsetX }, { "--wu-x": 0, duration, ease: "power2.out", stagger }, at).fromTo(rows, { opacity: 0 }, { opacity: 1, duration: duration * 0.75, ease: "power1.out", stagger }, at);
  }
  const since = data.since ? formatDay(data.since, locale) : null;
  const total = people.reduce((sum, person) => sum + person.visits, 0);
  const stickerText = single ? since && `${labels.since} ${since}` : people.length > 1 && `${format(people.length)} ${labels.people}, ${format(total)} ${visitsLabel(total)}`;
  const shell = targets.sticker && stickerText ? createCardShell(targets.sticker, { className: "wu-cared-for-sticker", frame: STICKER_FRAME, maxScale }) : null;
  if (shell && stickerText) {
    const sticker = createSticker({ text: stickerText, ...STICKER, heart: false });
    shell.stage.append(sticker);
    addStickerPop(timeline, sticker, TIMING.sticker);
  }
  const controller = createController({
    timeline,
    ready: trackImages([...names.querySelectorAll("img"), ...shell?.root.querySelectorAll("img") ?? []]),
    onComplete,
    onDestroy: () => {
      stopFitting();
      names.remove();
      shell?.remove();
    }
  });
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountCaredForCard
};
