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
function fillSpacedText(context, text, x, y, letterSpacing) {
  if (letterSpacing === 0) {
    context.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const glyph of text) {
    context.fillText(glyph, cursor, y);
    cursor += context.measureText(glyph).width + letterSpacing;
  }
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

// src/shared/text.ts
var NBSP = " ";
function keepTogether(text) {
  return text.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`).replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`).replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`).replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`);
}

// src/thank-you-card/logo.ts
var LOGO = {
  width: 91.2049,
  height: 32,
  paths: [
    "M14.2227 26.3115C14.2225 29.4533 11.6751 32 8.5332 32H0V23.4668C0 20.3248 2.54748 17.7773 5.68945 17.7773H14.2227V26.3115ZM26.3105 17.7773C29.4525 17.7773 32 20.3248 32 23.4668V32H23.4668C20.3249 32 17.7775 29.4533 17.7773 26.3115V17.7773H26.3105ZM8.5332 0C11.6752 0 14.2227 2.54749 14.2227 5.68945V17.7754H10.667V14.2227H5.68945C2.54748 14.2227 0 11.6752 0 8.5332V0H8.5332ZM32 8.5332C32 11.6752 29.4525 14.2227 26.3105 14.2227H21.333V17.7754H17.7773V5.68945C17.7773 2.54749 20.3248 0 23.4668 0H32V8.5332Z",
    "M82.1682 27.6146V27.3292L85.5355 22.478L82.2253 15.0774C82.0223 14.6335 81.8067 14.2974 81.5784 14.0691C81.3628 13.8408 81.1218 13.7013 80.8555 13.6506L80.5321 13.5935V13.0228H85.2502V13.5935L84.7745 13.6316C83.874 13.7077 83.614 14.1896 83.9945 15.0774L86.6199 21.2604L86.0682 21.2794L88.3702 15.4769C88.6239 14.8555 88.6746 14.4052 88.5224 14.1262C88.3829 13.8345 88.0912 13.6696 87.6473 13.6316L87.2477 13.5935V13.0228H91.2049V13.5935L90.8053 13.6506C90.5897 13.676 90.4058 13.7394 90.2536 13.8408C90.1014 13.9423 89.9492 14.1135 89.797 14.3545C89.6575 14.5955 89.4926 14.9443 89.3024 15.4009L84.1277 27.6146H82.1682Z",
    "M74.4279 23.0677L71.2508 15.0774C71.0479 14.5574 70.8449 14.196 70.642 13.993C70.4518 13.7774 70.2108 13.6569 69.9191 13.6316L69.5386 13.5935V13.0228H74.1996V13.5935L73.7811 13.6316C73.4006 13.6696 73.1406 13.8218 73.001 14.0882C72.8615 14.3545 72.8615 14.6843 73.001 15.0774L75.5884 21.9643H75.0938L77.7191 15.0774C77.8967 14.6082 77.9221 14.2657 77.7952 14.0501C77.6684 13.8218 77.3767 13.6823 76.9201 13.6316L76.5206 13.5935V13.0228H80.5158V13.5935C79.9704 13.6696 79.5709 13.8155 79.3172 14.0311C79.0762 14.2467 78.8543 14.5955 78.6513 15.0774L75.3791 23.0677H74.4279Z",
    "M65.5501 23.1077C64.6116 23.1077 63.7872 22.8921 63.077 22.4609C62.3667 22.017 61.815 21.4209 61.4218 20.6726C61.0413 19.9243 60.8511 19.0809 60.8511 18.1423C60.8511 17.115 61.073 16.2018 61.5169 15.4028C61.9735 14.6038 62.5823 13.9759 63.3433 13.5194C64.1043 13.0628 64.9414 12.8345 65.8545 12.8345C66.8565 12.8345 67.6619 13.1198 68.2707 13.6906C68.8794 14.2613 69.1838 15.092 69.1838 16.1828C69.1838 16.2589 69.1838 16.3413 69.1838 16.4301C69.1838 16.5062 69.1712 16.614 69.1458 16.7535L69.1077 17.0199H62.2779V16.2969H67.3004C67.3385 16.0433 67.3575 15.8086 67.3575 15.593C67.3575 14.9589 67.1926 14.4642 66.8628 14.1091C66.5331 13.754 66.0575 13.5764 65.436 13.5764C64.5862 13.5764 63.895 13.9125 63.3623 14.5847C62.8423 15.2569 62.5823 16.1574 62.5823 17.2862C62.5823 18.136 62.7345 18.9033 63.0389 19.5882C63.356 20.2604 63.7999 20.7931 64.3706 21.1862C64.954 21.5667 65.6389 21.757 66.4253 21.757C66.8692 21.757 67.3004 21.6809 67.7189 21.5287C68.1375 21.3765 68.5814 21.1228 69.0507 20.7677L69.4312 21.1292C68.8224 21.8267 68.2072 22.3341 67.5858 22.6511C66.9643 22.9555 66.2858 23.1077 65.5501 23.1077Z",
    "M53.4663 22.9151V22.3443L54.037 22.2492C54.4302 22.1858 54.6839 22.0843 54.798 21.9448C54.9249 21.7926 54.9883 21.5199 54.9883 21.1268V15.4575C54.9883 15.0262 54.8868 14.7345 54.6839 14.5823C54.4936 14.4174 54.1005 14.297 53.5044 14.2209V13.7452L56.3771 12.9082H56.6434V14.4301H56.8146C57.1317 13.9735 57.5185 13.5994 57.9751 13.3077C58.4444 13.016 58.9771 12.8701 59.5732 12.8701C60.0298 12.8701 60.3722 12.9652 60.6005 13.1555C60.8415 13.3457 60.962 13.593 60.962 13.8974C60.962 14.1004 60.8796 14.2843 60.7147 14.4492C60.5625 14.614 60.3786 14.7282 60.163 14.7916C59.9473 14.8423 59.7381 14.8106 59.5351 14.6965L58.622 14.1638C58.4698 14.075 58.2859 14.0877 58.0703 14.2018C57.8546 14.316 57.639 14.4682 57.4234 14.6584C57.2205 14.836 57.0493 15.0135 56.9098 15.1911C56.7702 15.356 56.7005 15.4511 56.7005 15.4765V21.1268C56.7005 21.5199 56.7639 21.7926 56.8907 21.9448C57.0176 22.0843 57.2712 22.1795 57.6517 22.2302L58.6029 22.3443V22.9151H53.4663Z",
    "M41.6023 22.9148V22.3441L42.3823 22.268C42.8008 22.2299 43.0925 22.1158 43.2574 21.9255C43.4223 21.7353 43.5047 21.4182 43.5047 20.9743V11.5382C43.5047 11.0943 43.4223 10.7772 43.2574 10.5869C43.0925 10.3967 42.8008 10.2825 42.3823 10.2445L41.6023 10.1684V9.59765H47.2526C48.9394 9.59765 50.1823 9.87668 50.9814 10.4347C51.7804 10.9801 52.1799 11.7728 52.1799 12.8128C52.1799 14.4743 51.0892 15.5523 48.9077 16.047C50.1253 16.1865 51.0067 16.5226 51.5521 17.0553C52.0975 17.588 52.3702 18.3045 52.3702 19.205C52.3702 19.8772 52.2053 20.4987 51.8755 21.0694C51.5458 21.6275 51.0131 22.0777 50.2775 22.4202C49.5545 22.7499 48.5779 22.9148 47.3477 22.9148H41.6023ZM47.0243 22.1538C48.153 22.1538 49.0155 21.9002 49.6116 21.3929C50.2077 20.8855 50.5058 20.1689 50.5058 19.2431C50.5058 18.368 50.2331 17.7021 49.6877 17.2455C49.155 16.7762 48.3687 16.5416 47.3286 16.5416H45.293V21.4309C45.293 21.6846 45.4135 21.8685 45.6545 21.9826C45.9081 22.0968 46.3647 22.1538 47.0243 22.1538ZM45.293 15.7806H47.3667C48.2038 15.7806 48.9013 15.527 49.4594 15.0196C50.0301 14.5123 50.3155 13.7957 50.3155 12.8699C50.3155 12.0835 50.0555 11.4684 49.5355 11.0245C49.0155 10.5806 48.1911 10.3586 47.0623 10.3586C46.5043 10.3586 46.0667 10.4094 45.7496 10.5108C45.4452 10.5996 45.293 10.7455 45.293 10.9484V15.7806Z"
  ]
};

// src/thank-you-card/thank-you-card.ts
var DEFAULT_LABELS = {
  youWereThere: "You were there",
  visit: "visit",
  visits: "visits",
  with: "with",
  fullDays: "{days} full days",
  hours: "hours",
  weeks: "Weeks",
  inARow: "in a row",
  personalityTitle: "Your clock-in personality",
  personalityNote: "Earliest clock-in at {time}",
  shareTag: "Wrap Up 2026",
  shareTitle: "{name}’s year in care",
  shareSite: "brevy.com",
  shareSince: "Caring for {name} since {date}"
};
var FRAME = { width: 328, height: 416 };
var SHARE = {
  width: 360,
  height: 640,
  margin: 20,
  scale: 3,
  logo: { x: 20, y: 22 },
  tag: { top: 26, paddingX: 12, paddingY: 6, font: "sans", weight: 600, size: 12 },
  title: { x: 20, y: 94, width: 320, font: "serif", weight: 400, size: 32, lineHeight: 1.05 },
  tiles: { x: 20, y: 148, width: 320 },
  footer: { y: 599, font: "sans", weight: 500, size: 13 }
};
var TIMING = { tiles: { at: 0.4, duration: 0.4, stagger: 0.12 }, counter: { at: 0.5, endAt: 1.6 } };
var COLORS = {
  background: { token: "--emerald-500", hex: "#023620" },
  logo: { token: "--olive-300", hex: "#dce7cf" },
  title: { token: "--beige-50", hex: "#fefdfc" },
  brand: { token: "--brand-500", hex: "#066e3d" },
  olive200: { token: "--olive-200", hex: "#e6eedc" },
  olive300: { token: "--olive-300", hex: "#dce7cf" },
  violet400: { token: "--violet-400", hex: "#d8c8fd" },
  violet900: { token: "--violet-900", hex: "#5e528c" },
  yellow300: { token: "--yellow-300", hex: "#fbd48a" },
  orange900: { token: "--orange-900", hex: "#6f3313" },
  emerald: { token: "--emerald-500", hex: "#023620" }
};
var cssColor = ({ token, hex }) => `var(${token}, ${hex})`;
var STYLES = `
.wu-thank-you-card__tile {
  overflow: hidden;
  border-radius: calc(20 * var(--wu-u));
  transform: scale(var(--wu-pop, 1));
}

.wu-thank-you-card__text {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  white-space: pre;
}

.wu-thank-you-card__text--serif {
  font-family: var(--wu-font-serif, 'Hedvig Letters Serif', Georgia, serif);
}
`;
var SMALL_TITLE = { font: "sans", weight: 600, size: 10, lineHeight: null, letterSpacing: 0.8, uppercase: true };
var SMALL_NOTE = { font: "sans", weight: 500, size: 12, lineHeight: null, letterSpacing: 0 };
function fontOf(spec, fonts, size = spec.size) {
  return `${spec.weight} ${size}px ${fonts[spec.font]}`;
}
var FIT_TOLERANCE = 1.05;
function fitSize(spec, maxWidth, fonts) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context)
    return spec.size;
  context.font = fontOf(spec, fonts);
  const width = context.measureText(spec.text).width + spec.letterSpacing * spec.text.length;
  return width <= maxWidth * FIT_TOLERANCE ? spec.size : Math.floor(spec.size * maxWidth / width);
}
function createTiles(data, labels, format, fonts) {
  const visits = Math.max(0, Math.round(data.visits));
  const hours = Math.max(0, Math.round(data.hours));
  const weeks = Math.max(0, Math.round(data.weeksInARow));
  const name = data.personName?.trim();
  const visitsLabel = visits === 1 ? labels.visit : labels.visits;
  const number = (value, x, y, size, tracking, lineHeight, maxWidth) => {
    const spec = { text: format(value), font: "sans", weight: 800, size, lineHeight, letterSpacing: size * tracking };
    const fitted = fitSize(spec, maxWidth, fonts);
    return { ...spec, x, y: y + (size - fitted), size: fitted, letterSpacing: fitted * tracking, countTo: value };
  };
  const personality = { text: data.personality, font: "serif", weight: 400, size: 34, lineHeight: null, letterSpacing: 0 };
  const withLines = name ? [visitsLabel, `${labels.with} ${name}`] : [visitsLabel];
  const withSpec = { font: "serif", weight: 400, size: 24, lineHeight: 1.1, letterSpacing: 0 };
  const withSize = Math.min(...withLines.map((line) => fitSize({ ...withSpec, text: line }, 164, fonts)));
  const withName = {
    ...withSpec,
    text: withLines.join(`
`),
    size: withSize,
    x: 16,
    y: 208 + (withSpec.size - withSize) * withSpec.lineHeight * withLines.length
  };
  return [
    {
      x: 0,
      y: 0,
      width: 196,
      height: 276,
      background: COLORS.brand,
      color: COLORS.olive200,
      texts: [
        { ...SMALL_TITLE, text: labels.youWereThere, x: 16, y: 16 },
        number(visits, 12, 112, 96, -0.02, 1, 172),
        withName
      ]
    },
    {
      x: 204,
      y: 0,
      width: 124,
      height: 134,
      background: COLORS.violet400,
      color: COLORS.violet900,
      texts: [
        { ...SMALL_TITLE, text: keepTogether(labels.fullDays.replace("{days}", format(data.fullDays))), x: 16, y: 16 },
        number(hours, 16, 50, 40, -0.04, null, 92),
        { ...SMALL_NOTE, text: labels.hours, x: 16, y: 102 }
      ]
    },
    {
      x: 204,
      y: 142,
      width: 124,
      height: 134,
      background: COLORS.yellow300,
      color: COLORS.orange900,
      texts: [
        { ...SMALL_TITLE, text: labels.weeks, x: 16, y: 16 },
        number(weeks, 16, 50, 40, -0.04, null, 92),
        { ...SMALL_NOTE, text: labels.inARow, x: 16, y: 102 }
      ]
    },
    {
      x: 0,
      y: 284,
      width: 328,
      height: 132,
      background: COLORS.olive300,
      color: COLORS.emerald,
      texts: [
        { ...SMALL_TITLE, text: labels.personalityTitle, x: 16, y: 16 },
        { ...personality, x: 16, y: 56, size: fitSize(personality, 296, fonts) },
        { ...SMALL_NOTE, text: keepTogether(labels.personalityNote.replace("{time}", data.earliestClockIn)), x: 16, y: 100 }
      ]
    }
  ];
}
function renderText(spec) {
  const node = element(`wu-thank-you-card__text wu-thank-you-card__text--${spec.font}`, spec.text);
  node.style.setProperty("--x", String(spec.x));
  node.style.setProperty("--y", String(spec.y));
  Object.assign(node.style, {
    fontSize: `calc(${spec.size} * var(--wu-u))`,
    fontWeight: String(spec.weight),
    lineHeight: spec.lineHeight === null ? "normal" : String(spec.lineHeight),
    letterSpacing: `calc(${spec.letterSpacing} * var(--wu-u))`,
    textTransform: spec.uppercase ? "uppercase" : "none"
  });
  return node;
}
function drawText(context, spec, originX, originY, fonts) {
  context.font = fontOf(spec, fonts);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const metrics = context.measureText("Hg");
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
  const lineHeight = spec.lineHeight === null ? ascent + descent : spec.lineHeight * spec.size;
  const firstBaseline = originY + spec.y + (lineHeight - (ascent + descent)) / 2 + ascent;
  spec.text.split(`
`).forEach((line, index) => {
    const text = spec.uppercase ? line.toUpperCase() : line;
    fillSpacedText(context, text, originX + spec.x, firstBaseline + lineHeight * index, spec.letterSpacing);
  });
}
function formatDay(date, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!match)
    return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(day);
}
function shareTexts(data, labels, locale) {
  const name = data.name?.trim();
  const person = data.personName?.trim();
  const since = formatDay(data.since, locale);
  return {
    tag: labels.shareTag,
    title: name ? labels.shareTitle.replace("{name}", name) : "",
    site: labels.shareSite,
    since: person && since ? keepTogether(labels.shareSince.replace("{name}", person).replace("{date}", since)) : ""
  };
}
async function renderShareImage(tiles, texts, root, fonts, scale) {
  const { margin, logo, tag, title, footer } = SHARE;
  const line = { lineHeight: null, letterSpacing: 0 };
  const tagText = { ...line, text: texts.tag, font: tag.font, weight: tag.weight, size: tag.size };
  const titleText = { text: texts.title, font: title.font, weight: title.weight, size: title.size, lineHeight: title.lineHeight, letterSpacing: 0 };
  const footerText = { ...line, font: footer.font, weight: footer.weight, size: footer.size };
  const faces = [...tiles.flatMap((tile) => tile.texts), tagText, titleText, footerText].map((text) => fontOf(text, fonts));
  await Promise.all([...new Set(faces)].map((face) => document.fonts.load(face).catch(() => {
    return;
  })));
  const style = getComputedStyle(root);
  const paint = ({ token, hex }) => style.getPropertyValue(token).trim() || hex;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(SHARE.width * scale);
  canvas.height = Math.round(SHARE.height * scale);
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("ThankYouCard: this browser cannot draw the share image");
  context.scale(scale, scale);
  const right = SHARE.width - margin;
  const widthOf = (text) => {
    context.font = fontOf(text, fonts);
    return context.measureText(text.text).width;
  };
  context.fillStyle = paint(COLORS.background);
  context.fillRect(0, 0, SHARE.width, SHARE.height);
  context.save();
  context.translate(logo.x, logo.y);
  context.fillStyle = paint(COLORS.logo);
  LOGO.paths.forEach((path) => context.fill(new Path2D(path)));
  context.restore();
  context.font = fontOf(tagText, fonts);
  const tagMetrics = context.measureText("Hg");
  const tagLine = (tagMetrics.fontBoundingBoxAscent ?? tagMetrics.actualBoundingBoxAscent) + (tagMetrics.fontBoundingBoxDescent ?? tagMetrics.actualBoundingBoxDescent);
  const tagWidth = widthOf(tagText) + tag.paddingX * 2;
  const tagHeight = tagLine + tag.paddingY * 2;
  context.fillStyle = paint(COLORS.olive300);
  context.beginPath();
  roundedRect(context, right - tagWidth, tag.top, tagWidth, tagHeight, tagHeight / 2);
  context.fill();
  context.fillStyle = paint(COLORS.emerald);
  drawText(context, { ...tagText, x: right - tagWidth + tag.paddingX, y: tag.top + tag.paddingY }, 0, 0, fonts);
  if (texts.title) {
    context.fillStyle = paint(COLORS.title);
    const size = fitSize(titleText, title.width / FIT_TOLERANCE, fonts);
    drawText(context, { ...titleText, size, x: title.x, y: title.y + (title.size - size) }, 0, 0, fonts);
  }
  const tileScale = SHARE.tiles.width / FRAME.width;
  context.save();
  context.translate(SHARE.tiles.x, SHARE.tiles.y);
  context.scale(tileScale, tileScale);
  for (const tile of tiles) {
    context.save();
    context.fillStyle = paint(tile.background);
    context.beginPath();
    roundedRect(context, tile.x, tile.y, tile.width, tile.height, 20);
    context.fill();
    context.clip();
    context.fillStyle = paint(tile.color);
    tile.texts.forEach((text) => drawText(context, text, tile.x, tile.y, fonts));
    context.restore();
  }
  context.restore();
  context.fillStyle = paint(COLORS.olive300);
  drawText(context, { ...footerText, text: texts.site, x: margin, y: footer.y }, 0, 0, fonts);
  if (texts.since) {
    const since = { ...footerText, text: texts.since };
    const room = right - margin - widthOf({ ...footerText, text: texts.site }) - 16;
    const size = fitSize(since, room / FIT_TOLERANCE, fonts);
    drawText(context, { ...since, size, x: right - widthOf({ ...since, size }), y: footer.y + (footer.size - size) }, 0, 0, fonts);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("ThankYouCard: could not encode the share image")), "image/png");
  });
}
function mountThankYouCard(el, data, options = {}) {
  const { locale = "en-US", autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value) => numberFormat.format(Math.round(value));
  ensureStyles("thank-you-card", STYLES);
  const shell = createCardShell(el, { className: "wu-thank-you-card", frame: FRAME, maxScale });
  const rootStyle = getComputedStyle(shell.root);
  const fonts = {
    sans: rootStyle.fontFamily,
    serif: rootStyle.getPropertyValue("--wu-font-serif").trim() || "'Hedvig Letters Serif', Georgia, serif"
  };
  const tiles = createTiles(data, labels, format, fonts);
  const timeline = holdTimeline(SCREEN_SECONDS);
  const nodes = tiles.map((tile) => {
    const node = place(element("wu-thank-you-card__tile"), { x: tile.x, y: tile.y, w: tile.width, h: tile.height });
    node.style.background = cssColor(tile.background);
    node.style.color = cssColor(tile.color);
    for (const text of tile.texts) {
      const textNode = renderText(text);
      node.append(textNode);
      if (text.countTo !== undefined) {
        const { at, endAt } = TIMING.counter;
        addCounter(timeline, textNode, text.countTo, { at, duration: endAt - at, format });
      }
    }
    return node;
  });
  shell.stage.append(...nodes);
  const { at, duration, stagger } = TIMING.tiles;
  timeline.fromTo(nodes, { "--wu-pop": 0.9 }, { "--wu-pop": 1, duration, ease: "back.out(1.6)", stagger }, at).fromTo(nodes, { opacity: 0 }, { opacity: 1, duration: duration * 0.6, ease: "power1.out", stagger }, at);
  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, "exportImage", {
    value: (exportOptions = {}) => renderShareImage(tiles, shareTexts(data, labels, locale), shell.root, fonts, exportOptions.scale ?? SHARE.scale),
    enumerable: true
  });
  if (autoplay)
    card.play();
  return card;
}
export {
  mountThankYouCard
};
