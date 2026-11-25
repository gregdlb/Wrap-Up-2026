import gsap from 'gsap';
import { keepTogether, mountSoundButton } from '../src';
import {
  createControls,
  type ArcSpec,
  type Backdrop,
  type DemoScreen,
  type ScreenCopy,
  type ScreenView,
  type Still,
} from './screen';
import { busiestMonthScreen } from './screens/busiest-month';
import { caredForScreen } from './screens/cared-for';
import { firstVisitScreen } from './screens/first-visit';
import { hoursScreen } from './screens/hours';
import { payScreen } from './screens/pay';
import { thankYouScreen } from './screens/thank-you';
import { topCaregiverScreen } from './screens/top-caregiver';
import { personalityScreen } from './screens/personality';
import { visitsScreen } from './screens/visits';
import { weeksScreen } from './screens/weeks';
import './demo.css';

/** Screens in story order. */
const SCREENS: DemoScreen[] = [
  firstVisitScreen,
  visitsScreen,
  hoursScreen,
  busiestMonthScreen,
  personalityScreen,
  weeksScreen,
  caredForScreen,
  payScreen,
  topCaregiverScreen,
  thankYouScreen,
];
const DEFAULT_SCREEN = busiestMonthScreen.id;

const PROGRESS_SEGMENTS = 12;

/** Phones to preview the scaling on, in CSS px. */
const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'Pixel 8', width: 412, height: 915 },
];
const DEFAULT_DEVICE = 1;

/** The cards' scale cap: the demo mirrors the cards' own fitting to place the stills. */
const MAX_SCALE = 1.15;

/**
 * The background arc is a piece of a ring: a 550 px ellipse with a 55 px band, cut off at both ends.
 * On the 360 px Figma screen both ends lie outside the screen. One end is always at the middle of the box's
 * right side; on a wider phone the arc moves right with the screen edge so that this end stays `past` px
 * behind it. The other end is 79 px inside the box's left side, so both stay hidden up to 414 px.
 */
const ARC = { band: 55, past: 2 };

/** Headline size in Figma, and how far a headline with a long name may be set smaller before it wraps instead. */
const HEADLINE = { size: 40, smallest: 28 };

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Demo markup is missing #${id}`);
  return node as T;
}

const ui = {
  stage: document.querySelector<HTMLElement>('.stage')!,
  screen: byId('screen'),
  arc: byId('arc'),
  layerBack: byId('layer-back'),
  layerFront: byId('layer-front'),
  progress: byId('progress'),
  sound: byId('sound'),
  soundState: byId('sound-state'),
  tag: byId('tag'),
  headline: byId('headline'),
  body: byId('body'),
  card: byId('card'),
  stillsUnderText: byId('stills-under-text'),
  stillsBehind: byId('stills-behind'),
  stillsFront: byId('stills-front'),
  title: byId('title'),
  screenSelect: byId<HTMLSelectElement>('screen-select'),
  device: byId<HTMLSelectElement>('device'),
  controls: byId('controls'),
  replay: byId<HTMLButtonElement>('replay'),
  seek: byId<HTMLInputElement>('seek'),
  seekValue: byId('seek-value'),
  note: byId('note'),
  json: byId('json'),
};

/**
 * The mute button of the header, mounted once: its state stays while the screens change.
 * The demo plays no music; `onChange` is where the app mutes or unmutes its own.
 */
let soundChanges = 0;
const showSound = (muted: boolean) => {
  ui.soundState.textContent = `${muted ? 'muted' : 'unmuted'} · onChange called ${soundChanges}×`;
};
const sound = mountSoundButton(ui.sound, {
  onChange: (muted) => {
    soundChanges += 1;
    showSound(muted);
  },
});
showSound(sound.muted);

let screen: DemoScreen = SCREENS.find((candidate) => candidate.id === DEFAULT_SCREEN)!;
let view: ScreenView | null = null;
let screenTimeline: gsap.core.Timeline | null = null;
/** Counts renders, so a screen that finished loading after the next one was chosen does not start. */
let renderCount = 0;

function imageDecoded(image: HTMLImageElement): Promise<void> {
  return image.decode().catch(() => undefined);
}

/** Everything the screen draws from files: the components' images, the stills, the arc, the header. */
function screenLoaded(parts: ScreenView['parts']): Promise<unknown> {
  const images = [...ui.screen.querySelectorAll('img')].filter((image) => image.src !== '');
  return Promise.all([...parts.map((part) => part.ready), ...images.map(imageDecoded)]);
}

function renderArc(arc: ArcSpec | null) {
  if (!arc) return ui.arc.replaceChildren();

  const outer = document.createElement('div');
  outer.className = 'arc';
  Object.assign(outer.style, {
    // Position from Figma; only the screen's edge clips the arc, never its own box.
    left: `max(${arc.left}px, calc(100% - ${arc.size - ARC.band - ARC.past}px))`,
    top: `${arc.top}px`,
    width: `${arc.size}px`,
    height: `${arc.size}px`,
  });
  const inner = document.createElement('div');
  inner.className = 'arc__inner';
  inner.style.transform = `rotate(${arc.rotate}deg)${arc.flipY ? ' scaleY(-1)' : ''}`;
  const crop = document.createElement('div');
  Object.assign(crop.style, { position: 'absolute', ...arc.inset });
  const image = document.createElement('img');
  image.alt = '';
  image.src = arc.src;
  crop.append(image);
  inner.append(crop);
  outer.append(inner);
  ui.arc.replaceChildren(outer);
}

function renderProgress(step: number) {
  const segments = Array.from({ length: PROGRESS_SEGMENTS }, (_, index) => {
    const segment = document.createElement('div');
    segment.className = `progress__segment${index < step ? ' progress__segment--done' : ''}`;
    segment.append(document.createElement('i'));
    return segment;
  });
  ui.progress.replaceChildren(...segments);
}

function highlightBox(text: string, backdrop: Backdrop, node: HTMLElement) {
  node.classList.add('headline__highlight');
  const box = document.createElement('span');
  box.className = 'headline__highlight-box';
  box.style.background = backdrop.highlight.bg;
  const label = document.createElement('span');
  label.className = 'headline__highlight-text';
  label.style.color = backdrop.highlight.color;
  label.textContent = keepTogether(text);
  node.append(box, label);
}

/**
 * Lines the design sets one by one (a highlighted row, a row with its own line breaks, a row of pieces)
 * must not wrap. When a long name or number makes one wider than the text column,
 * the whole headline is set smaller, down to `HEADLINE.smallest`; below that the row wraps, balanced.
 */
function fitHeadline() {
  const rows = [...ui.headline.querySelectorAll<HTMLElement>('.headline__highlight, .headline__row--lines, .headline__row--parts')];
  const widest = () =>
    Math.max(
      0,
      ...rows.map((row) => {
        // A row with its own line breaks: its widest line, measured without wrapping.
        row.style.whiteSpace = row.classList.contains('headline__row--lines') ? 'pre' : '';
        const width = row.scrollWidth;
        row.style.whiteSpace = '';
        return width;
      }),
    );
  let size = HEADLINE.size;
  ui.headline.style.fontSize = '';
  const column = ui.headline.clientWidth;
  for (let attempt = 0; attempt < 4 && size > HEADLINE.smallest && widest() > column; attempt++) {
    size = Math.max(HEADLINE.smallest, Math.floor((size * column * 10) / widest()) / 10);
    ui.headline.style.fontSize = `${size}px`;
  }
}

/** The host's texts. Numbers stay with their units ("10 AM", "214 visits") wherever a line breaks. */
function renderCopy(copy: ScreenCopy, backdrop: Backdrop) {
  ui.tag.textContent = keepTogether(copy.tag);
  ui.tag.hidden = copy.tag === '';
  ui.body.hidden = copy.body === '';
  ui.tag.style.background = backdrop.tag.bg;
  ui.tag.style.color = backdrop.tag.color;

  ui.headline.style.color = backdrop.headlineColor;
  ui.headline.replaceChildren(
    ...copy.rows.map((row) => {
      const line = document.createElement('div');
      line.className = 'headline__row';
      if (row.node) {
        line.classList.add('headline__row--slot');
        line.append(row.node);
      } else if (row.parts) {
        line.classList.add('headline__row--parts');
        for (const part of row.parts) {
          const piece = document.createElement('span');
          if (part.highlighted) highlightBox(part.text, backdrop, piece);
          else piece.textContent = keepTogether(part.text);
          line.append(piece);
        }
      } else if (row.highlighted) {
        highlightBox(row.text, backdrop, line);
      } else {
        if (row.text.includes('\n')) line.classList.add('headline__row--lines');
        line.textContent = keepTogether(row.text);
      }
      return line;
    }),
  );

  ui.body.textContent = keepTogether(copy.body);
  ui.body.style.color = backdrop.bodyColor;
  ui.body.style.width = copy.bodyWidth ? `${copy.bodyWidth}px` : '';
  fitHeadline();
}

/**
 * The host's part of the screen (spec rows "Text in", "Highlight behind word", story progress).
 * The progress segment fills over the whole screen, whose length is the card's `duration`.
 */
function buildScreenTimeline(step: number, screenSeconds: number): gsap.core.Timeline {
  const textRows = [ui.tag, ...ui.headline.querySelectorAll('.headline__row:not(.headline__row--slot)'), ui.body];
  const currentFill = ui.progress.children[step]?.firstElementChild ?? null;
  const highlights = ui.headline.querySelectorAll('.headline__highlight-box');

  const timeline = gsap
    .timeline({ paused: true })
    .fromTo(textRows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.48, ease: 'power2.out', stagger: 0.08 }, 0)
    .fromTo(currentFill, { width: '0%' }, { width: '100%', duration: screenSeconds, ease: 'none' }, 0);
  if (highlights.length > 0) {
    timeline.fromTo(highlights, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, 0.3);
  }
  return timeline;
}

/**
 * The animator's layers are MP4 or Lottie in the app; the demo shows where they go, as stills
 * (or with the animator's video where we have it). Each one is placed in px on the card's fitted frame.
 */
function placeStills() {
  const stills = view?.stills ?? [];
  const { clientWidth: width, clientHeight: height } = ui.card;
  const scale = Math.min(width / screen.frame.width, height / screen.frame.height, MAX_SCALE);
  const left = (width - screen.frame.width * scale) / 2;
  const top = (height - screen.frame.height * scale) / 2;

  const render = (still: Still) => {
    const box = document.createElement('div');
    box.className = 'still';
    Object.assign(box.style, {
      left: `${left + still.x * scale}px`,
      top: `${top + still.y * scale}px`,
      width: `${still.width * scale}px`,
      height: `${still.height * scale}px`,
      opacity: String(still.opacity ?? 1),
    });
    if (still.image) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = still.image;
      image.style.transform = `rotate(${still.rotate ?? 0}deg)`;
      box.append(image);
    } else if (still.element || still.node) {
      const node = still.element ?? still.node!();
      node.style.transform = `rotate(${still.rotate ?? 0}deg) scale(${scale})`;
      box.append(node);
    }
    return box;
  };

  const layerOf = (still: Still) => (still.underText ? ui.stillsUnderText : still.behind ? ui.stillsBehind : ui.stillsFront);
  for (const layer of [ui.stillsUnderText, ui.stillsBehind, ui.stillsFront]) {
    layer.replaceChildren(...stills.filter((still) => layerOf(still) === layer).map(render));
  }
}

function showSeek(seconds: number) {
  ui.seek.value = String(seconds);
  ui.seekValue.textContent = `${seconds.toFixed(2)} s`;
}

/** Plays the screen from the start. The card calls this again when its time is up, so the screen loops. */
function play() {
  if (!view || !screenTimeline) return;
  showSeek(0);
  view.parts.forEach((part) => part.seek(0));
  screenTimeline.restart();
  view.parts.forEach((part) => part.play());
}

/**
 * Rebuilds the current screen with its current sample data.
 * Only the background shows until every image is loaded; then the screen appears whole and plays.
 */
function render() {
  view?.destroy();
  screenTimeline?.kill();

  for (const box of [ui.card, ui.stillsUnderText, ui.stillsBehind, ui.stillsFront]) {
    Object.assign(box.style, {
      left: `${screen.cardBox.left}px`,
      right: `${screen.cardBox.right}px`,
      top: `${screen.cardBox.top}px`,
      bottom: `${screen.cardBox.bottom}px`,
    });
  }

  view = screen.render({
    layers: { back: ui.layerBack, card: ui.card, front: ui.layerFront },
    controls: createControls(ui.controls),
    rerender: render,
    replay: play,
    updateCopy: (copy) => view && renderCopy(copy, view.backdrop),
  });

  ui.title.textContent = screen.label;
  ui.screen.style.background = `linear-gradient(to bottom, ${view.backdrop.background[0]}, ${view.backdrop.background[1]})`;
  ui.screen.classList.toggle('screen--dark', view.backdrop.dark === true);
  sound.setTone(view.backdrop.dark ? 'dark' : 'light');
  renderArc(view.backdrop.arc);
  renderProgress(screen.step);
  renderCopy(view.copy, view.backdrop);
  placeStills();
  screenTimeline = buildScreenTimeline(screen.step, view.duration);

  ui.seek.max = String(view.duration);
  ui.note.textContent = view.note ?? '';
  ui.note.parentElement!.hidden = !view.note;
  ui.json.textContent = JSON.stringify(view.data, null, 1)
    .replace(/\[\n\s+([\d-])/g, '[$1')
    .replace(/,\n\s+(\d)/g, ', $1')
    .replace(/(\d)\n\s+\]/g, '$1]');

  const current = ++renderCount;
  ui.screen.classList.add('screen--loading');
  screenTimeline.pause(0);
  void screenLoaded(view.parts).then(() => {
    if (current !== renderCount) return;
    ui.screen.classList.remove('screen--loading');
    play();
  });
}

function applyDevice() {
  const device = DEVICES[Number(ui.device.value)] ?? DEVICES[DEFAULT_DEVICE]!;
  ui.stage.style.setProperty('--phone-w', `${device.width}px`);
  ui.stage.style.setProperty('--phone-h', `${device.height}px`);
  const fit = Math.min(1, (window.innerHeight - 48) / device.height, (window.innerWidth - 32) / device.width);
  ui.stage.style.setProperty('--fit', String(Math.max(0.5, fit)));
}

ui.screenSelect.replaceChildren(...SCREENS.map(({ id, label }) => new Option(label, id)));
ui.screenSelect.value = screen.id;
ui.device.replaceChildren(
  ...DEVICES.map(({ name, width, height }, index) => new Option(`${name} (${width} × ${height})`, String(index))),
);
ui.device.value = String(DEFAULT_DEVICE);

ui.screenSelect.addEventListener('change', () => {
  screen = SCREENS.find((candidate) => candidate.id === ui.screenSelect.value) ?? screen;
  render();
});
ui.device.addEventListener('change', applyDevice);
ui.replay.addEventListener('click', play);
ui.seek.addEventListener('input', () => {
  const seconds = Number(ui.seek.value);
  showSeek(seconds);
  view?.parts.forEach((part) => {
    part.pause();
    part.seek(seconds);
  });
  screenTimeline?.pause(seconds);
});
window.addEventListener('resize', applyDevice);
new ResizeObserver(placeStills).observe(ui.card);

applyDevice();
document.fonts.ready.then(render);
