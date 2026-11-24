// src/pay-card/pay-card.ts
import gsap2 from "gsap";

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
function holdTimeline(seconds) {
  return gsap.timeline({ paused: true }).to({}, { duration: seconds }, 0);
}

// src/shared/counter.ts
var SCREEN_SECONDS = 6;

// src/shared/text.ts
var NBSP = " ";
function keepTogether(text) {
  return text.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`).replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`).replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`).replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`);
}

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

// src/pay-card/scratch.ts
var MARK_PATH = "M8.89 8.889V11.1115H8.8885V16.4445C8.88857 16.9114 8.79666 17.3737 8.61804 17.8051C8.43941 18.2365 8.17756 18.6284 7.84744 18.9586C7.51732 19.2888 7.1254 19.5507 6.69406 19.7293C6.26271 19.908 5.80039 20 5.3335 20H0V14.6665C-0.0000656 14.1996 0.0918552 13.7372 0.270513 13.3058C0.44917 12.8744 0.711064 12.4824 1.04124 12.1522C1.37141 11.8221 1.76339 11.5602 2.19479 11.3815C2.62619 11.2029 3.08857 11.1109 3.5555 11.111H6.668V8.889H8.89ZM13.3315 11.111H16.443C16.9099 11.111 17.3722 11.203 17.8036 11.3817C18.2349 11.5603 18.6268 11.8222 18.9569 12.1524C19.2871 12.4826 19.5489 12.8745 19.7275 13.3059C19.9062 13.7373 19.9981 14.1996 19.998 14.6665V20H14.665C14.1981 20.0001 13.7357 19.9081 13.3043 19.7295C12.8729 19.5508 12.4809 19.2889 12.1507 18.9588C11.8206 18.6286 11.5587 18.2366 11.38 17.8052C11.2014 17.3738 11.1094 16.9114 11.1095 16.4445V8.8895H13.3315V11.111ZM5.3335 0C5.80039 0 6.26271 0.0919694 6.69406 0.270656C7.1254 0.449343 7.51732 0.711247 7.84744 1.04141C8.17756 1.37158 8.43941 1.76354 8.61804 2.19491C8.79666 2.62628 8.88857 3.08861 8.8885 3.5555V8.8885H3.5555C3.08861 8.88857 2.62628 8.79666 2.19491 8.61804C1.76354 8.43941 1.37158 8.17756 1.04141 7.84744C0.711247 7.51732 0.449343 7.1254 0.270656 6.69406C0.0919694 6.26271 0 5.80039 0 5.3335V0H5.3335ZM19.9985 5.3335C19.9985 5.80039 19.9065 6.26271 19.7278 6.69406C19.5492 7.1254 19.2873 7.51732 18.9571 7.84744C18.6269 8.17756 18.235 8.43941 17.8036 8.61804C17.3722 8.79666 16.9099 8.88857 16.443 8.8885H11.1095V3.5555C11.1094 3.08857 11.2014 2.62619 11.38 2.19479C11.5587 1.76339 11.8206 1.37141 12.1507 1.04124C12.4809 0.711064 12.8729 0.44917 13.3043 0.270513C13.7357 0.0918552 14.1981 -0.0000656 14.665 0H19.998L19.9985 5.3335Z";
var COVER = {
  width: 328,
  height: 220,
  pattern: { size: 20, pitch: 46, firstY: 10, evenX: 4, oddX: 23, opacity: 0.12, rows: 5, columns: 8 },
  pill: { paddingX: 16, height: 40, fontSize: 15 }
};
var BRUSH = { radius: 20, spacing: 6, jitter: 0.15, hardness: 0.55, specks: 2, speckSize: 0.35 };
var GRID = { cell: 6, reach: 0.85 };
var TAP = { distance: 8, milliseconds: 350 };
function createScratch({ canvas, text, fontFamily, colors, area, threshold, onReveal }) {
  const context = canvas.getContext("2d");
  const mark = new Path2D(MARK_PATH);
  let unit = 1;
  let columns = 0;
  let wiped = new Uint8Array(0);
  let counted = new Uint8Array(0);
  let countedCells = 0;
  let wipedCount = 0;
  let touched = false;
  let locked = false;
  let press = null;
  const paint = () => {
    unit = canvas.width / COVER.width;
    context.globalCompositeOperation = "source-over";
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colors.cover;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const { size, pitch, firstY, evenX, oddX, opacity, rows, columns: perRow } = COVER.pattern;
    context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    for (let row = 0;row < rows; row++) {
      for (let column = 0;column < perRow; column++) {
        const x = (row % 2 === 0 ? evenX : oddX) + pitch * column;
        context.setTransform(unit, 0, 0, unit, x * unit, (firstY + pitch * row) * unit);
        context.scale(size / 20, size / 20);
        context.fill(mark);
      }
    }
    context.setTransform(unit, 0, 0, unit, 0, 0);
    context.font = `600 ${COVER.pill.fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const pillWidth = context.measureText(text).width + COVER.pill.paddingX * 2;
    const pillX = (COVER.width - pillWidth) / 2;
    const pillY = (COVER.height - COVER.pill.height) / 2;
    context.fillStyle = colors.pill;
    context.beginPath();
    roundedRect(context, pillX, pillY, pillWidth, COVER.pill.height, COVER.pill.height / 2);
    context.fill();
    context.fillStyle = colors.pillText;
    context.fillText(text, COVER.width / 2, COVER.height / 2 + 1);
    columns = Math.ceil(COVER.width / GRID.cell);
    wiped = new Uint8Array(columns * Math.ceil(COVER.height / GRID.cell));
    touched = false;
    measure();
  };
  const measure = () => {
    const box = area();
    counted = new Uint8Array(wiped.length);
    countedCells = 0;
    wipedCount = 0;
    for (let index = 0;index < wiped.length; index++) {
      const x = (index % columns + 0.5) * GRID.cell;
      const y = (Math.floor(index / columns) + 0.5) * GRID.cell;
      if (box && (x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height))
        continue;
      counted[index] = 1;
      countedCells++;
      wipedCount += wiped[index];
    }
  };
  const dab = (x, y, radius) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(BRUSH.hardness, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };
  const stamp = (x, y) => {
    const radius = BRUSH.radius * (1 + (Math.random() * 2 - 1) * BRUSH.jitter);
    dab(x, y, radius);
    for (let speck = 0;speck < BRUSH.specks; speck++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (0.8 + Math.random() * 0.25);
      dab(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, radius * BRUSH.speckSize);
    }
    const reach = radius * GRID.reach;
    const rows = wiped.length / columns;
    for (let row = Math.max(0, Math.floor((y - reach) / GRID.cell));row <= Math.min(rows - 1, Math.floor((y + reach) / GRID.cell)); row++) {
      for (let column = Math.max(0, Math.floor((x - reach) / GRID.cell));column <= Math.min(columns - 1, Math.floor((x + reach) / GRID.cell)); column++) {
        const index = row * columns + column;
        const dx = (column + 0.5) * GRID.cell - x;
        const dy = (row + 0.5) * GRID.cell - y;
        if (wiped[index] === 0 && dx * dx + dy * dy <= reach * reach) {
          wiped[index] = 1;
          wipedCount += counted[index];
        }
      }
    }
  };
  const wipe = (fromX, fromY, toX, toY) => {
    context.globalCompositeOperation = "destination-out";
    context.setTransform(unit, 0, 0, unit, 0, 0);
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(1, Math.ceil(distance / BRUSH.spacing));
    for (let step = 1;step <= steps; step++) {
      stamp(fromX + (toX - fromX) * step / steps, fromY + (toY - fromY) * step / steps);
    }
  };
  const enough = () => countedCells > 0 && wipedCount / countedCells >= threshold;
  const locate = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * COVER.width,
      y: (event.clientY - rect.top) / rect.height * COVER.height
    };
  };
  const reveal = () => {
    if (locked)
      return;
    locked = true;
    press = null;
    onReveal();
  };
  const onDown = (event) => {
    if (locked)
      return;
    event.preventDefault();
    event.stopPropagation();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}
    const point = locate(event);
    press = { ...point, startX: point.x, startY: point.y, at: performance.now(), moved: 0 };
    touched = true;
    wipe(point.x, point.y, point.x, point.y);
    if (enough())
      reveal();
  };
  const onMove = (event) => {
    if (locked || !press)
      return;
    event.preventDefault();
    const point = locate(event);
    wipe(press.x, press.y, point.x, point.y);
    press.moved = Math.max(press.moved, Math.hypot(point.x - press.startX, point.y - press.startY));
    press.x = point.x;
    press.y = point.y;
    if (enough())
      reveal();
  };
  const onUp = (event) => {
    if (locked || !press)
      return;
    event.stopPropagation();
    const tapped = press.moved < TAP.distance && performance.now() - press.at < TAP.milliseconds;
    press = null;
    if (tapped)
      reveal();
  };
  const onKey = (event) => {
    if (event.key !== "Enter" && event.key !== " ")
      return;
    event.preventDefault();
    reveal();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("keydown", onKey);
  const swallow = (event) => event.stopPropagation();
  canvas.addEventListener("click", swallow);
  paint();
  return {
    reset() {
      locked = false;
      press = null;
      paint();
    },
    measure,
    lock() {
      locked = true;
      press = null;
    },
    get progress() {
      return countedCells > 0 ? wipedCount / countedCells : 0;
    },
    get untouched() {
      return !touched;
    },
    destroy() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("click", swallow);
    }
  };
}

// src/pay-card/pay-card.ts
var DEFAULT_LABELS = {
  scratch: "Scratch or tap to reveal",
  paychecks: "across {paychecks} paychecks in {year}"
};
var FRAME = { width: 328, height: 220 };
var TIMING = {
  enter: { at: 0.4, duration: 0.6, offsetY: 24, tilt: -2 },
  waitAt: 1,
  cover: { duration: 0.2 }
};
var DIGITS_HEIGHT = 0.74;
var STYLES = `
.wu-pay-card__ticket {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 calc(1 * var(--wu-u)) calc(1 * var(--wu-u)) rgba(0, 0, 0, 0.05));
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0) rotate(calc(var(--wu-tilt, 0) * 1deg));
}

/* The ticket's side notches are real holes, so whatever is behind the card shows through. */
.wu-pay-card__body {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(8 * var(--wu-u));
  background: var(--wu-card, #ffffff);
  -webkit-mask:
    radial-gradient(circle at 0 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) left / 51% 100% no-repeat,
    radial-gradient(circle at 100% 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle at 0 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) left / 51% 100% no-repeat,
    radial-gradient(circle at 100% 50%, transparent calc(12 * var(--wu-u) - 0.5px), #000 calc(12 * var(--wu-u))) right / 51% 100% no-repeat;
}

.wu-pay-card__line {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  white-space: nowrap;
}

.wu-pay-card__amount {
  top: calc(64 * var(--wu-u));
  color: var(--brand-500, #066e3d);
  font-size: calc(56 * var(--wu-u));
  font-weight: 800;
  letter-spacing: calc(-2.24 * var(--wu-u));
  line-height: calc(73 * var(--wu-u));
}

.wu-pay-card__sub {
  top: calc(141 * var(--wu-u));
  color: var(--wu-muted, #71717a);
  font-size: calc(14 * var(--wu-u));
  font-weight: 400;
  line-height: calc(18 * var(--wu-u));
}

.wu-pay-card__cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.wu-pay-card__cover:focus-visible {
  outline: calc(3 * var(--wu-u)) solid var(--brand-500, #066e3d);
  outline-offset: calc(-6 * var(--wu-u));
}
`;
function token(node, name, fallback) {
  return getComputedStyle(node).getPropertyValue(name).trim() || fallback;
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
function mountPayCard(el, data, options = {}) {
  const { locale = "en-US", currency = "USD", autoplay = false, onComplete, onRevealed, revealAt = 0.6, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const earned = Math.max(0, Math.round(data.earned));
  const year = data.year ?? new Date().getFullYear();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
  const subText = labels.paychecks.replace("{paychecks}", new Intl.NumberFormat(locale).format(data.paychecks)).replace("{year}", String(year));
  const reducedMotion = prefersReducedMotion();
  ensureStyles("pay-card", STYLES);
  const shell = createCardShell(el, { className: "wu-pay-card", frame: FRAME, maxScale });
  shell.root.dataset.private = "true";
  const ticket = element("wu-pay-card__ticket");
  const body = element("wu-pay-card__body");
  const amount = element("wu-pay-card__line wu-pay-card__amount", money.format(earned));
  const cover = document.createElement("canvas");
  cover.className = "wu-pay-card__cover";
  cover.tabIndex = 0;
  cover.setAttribute("role", "button");
  cover.setAttribute("aria-label", labels.scratch);
  body.append(amount, element("wu-pay-card__line wu-pay-card__sub", keepTogether(subText)), cover);
  ticket.append(body);
  shell.stage.append(ticket);
  let revealed = false;
  let destroyed = false;
  let pendingStart = null;
  const timeline = holdTimeline(SCREEN_SECONDS);
  timeline.fromTo(ticket, { opacity: 0, "--wu-y": TIMING.enter.offsetY, "--wu-tilt": TIMING.enter.tilt }, { opacity: 1, "--wu-y": 0, "--wu-tilt": 0, duration: TIMING.enter.duration, ease: "power3.out" }, TIMING.enter.at).fromTo(cover, { opacity: 1 }, { opacity: 0, duration: TIMING.cover.duration, ease: "power1.out" }, TIMING.waitAt).addPause(TIMING.waitAt);
  const syncCover = () => {
    cover.style.pointerEvents = revealed ? "none" : "";
  };
  timeline.eventCallback("onComplete", () => onComplete?.());
  const amountArea = () => {
    const box = cover.getBoundingClientRect();
    if (box.width === 0)
      return null;
    const range = document.createRange();
    range.selectNodeContents(amount);
    const text = range.getBoundingClientRect();
    const toFigma = FRAME.width / box.width;
    const height = parseFloat(getComputedStyle(amount).fontSize) * DIGITS_HEIGHT * toFigma;
    return {
      x: (text.left - box.left) * toFigma,
      y: (text.top + text.height / 2 - box.top) * toFigma - height / 2,
      width: text.width * toFigma,
      height
    };
  };
  const scratch = createScratch({
    canvas: cover,
    text: labels.scratch,
    fontFamily: getComputedStyle(shell.root).fontFamily,
    colors: {
      cover: token(shell.root, "--brand-500", "#066e3d"),
      pill: token(shell.root, "--wu-card", "#ffffff"),
      pillText: token(shell.root, "--brand-500", "#066e3d")
    },
    area: amountArea,
    threshold: revealAt,
    onReveal: () => controller.reveal()
  });
  const stopSizing = observeSize(cover, ({ width, height }) => {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (pixelWidth === 0 || cover.width === pixelWidth && cover.height === pixelHeight)
      return;
    cover.width = pixelWidth;
    cover.height = pixelHeight;
    if (!revealed)
      scratch.reset();
  });
  document.fonts?.ready.then(() => {
    if (destroyed || revealed)
      return;
    if (scratch.untouched)
      scratch.reset();
    else
      scratch.measure();
  });
  const cancelPendingStart = () => {
    pendingStart?.kill();
    pendingStart = null;
  };
  const startOver = () => {
    revealed = false;
    scratch.reset();
    timeline.pause(reducedMotion ? TIMING.waitAt : 0, true);
    syncCover();
  };
  const controller = {
    ready: Promise.resolve(),
    play(delay = 0) {
      if (destroyed)
        return;
      if (pendingStart) {
        pendingStart.resume();
        return;
      }
      if (timeline.progress() === 1)
        startOver();
      if (!revealed && timeline.time() >= TIMING.waitAt)
        return;
      if (delay <= 0 || timeline.time() > 0) {
        timeline.play();
        return;
      }
      pendingStart = gsap2.delayedCall(delay, () => {
        pendingStart = null;
        timeline.play();
      });
    },
    pause() {
      pendingStart?.pause();
      timeline.pause();
    },
    seek(t) {
      if (destroyed)
        return;
      cancelPendingStart();
      const time = Math.min(Math.max(t, reducedMotion ? TIMING.waitAt : 0), timeline.duration());
      if (time <= TIMING.waitAt && revealed) {
        revealed = false;
        scratch.reset();
      } else if (time > TIMING.waitAt && !revealed) {
        revealed = true;
        scratch.lock();
      }
      timeline.time(time, true);
      syncCover();
    },
    reveal() {
      if (destroyed || revealed)
        return;
      cancelPendingStart();
      revealed = true;
      scratch.lock();
      onRevealed?.();
      const from = reducedMotion ? TIMING.waitAt + TIMING.cover.duration : TIMING.waitAt;
      if (reducedMotion || timeline.time() < TIMING.waitAt)
        timeline.time(from, true);
      syncCover();
      timeline.play();
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      cancelPendingStart();
      timeline.kill();
      scratch.destroy();
      stopSizing();
      shell.remove();
    },
    get duration() {
      return timeline.duration();
    },
    get revealed() {
      return revealed;
    }
  };
  timeline.time(reducedMotion ? TIMING.waitAt : 0, true);
  syncCover();
  if (autoplay)
    controller.play();
  return controller;
}
export {
  mountPayCard
};
