import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../../shared/controller';
import { DEFAULT_MAX_SCALE, observeSize } from '../../shared/fit';
import { placeFrameIn } from '../../shared/screen-05';
import { ensureStyles } from '../../shared/styles';
import { ASSET_URLS } from './assets';
import { GARLANDS, type GarlandPart } from './parts';

export interface GarlandData {
  /** 1 = January … 12 = December. Each month has its own garland. */
  month: number;
  /**
   * The element BusiestMonthCard is mounted in. The garland then sits on the card's top edge as in Figma
   * and scales with the card. Without it, the element the garland is mounted in is taken as that container.
   */
  anchor?: HTMLElement;
}

export interface GarlandOptions extends WrapUpOptions {
  /** Largest scale relative to the Figma size. Defaults to 1.15, the same as the card. */
  maxScale?: number;
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export type GarlandController = WrapUpController;

const STYLES = /* css */ `
.wu-garland {
  --wu-u: 1px;

  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* The Figma "Months card" frame, 360 x 350, moved onto the card by the component. */
.wu-garland__frame {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(360 * var(--wu-u));
  height: calc(350 * var(--wu-u));
}

.wu-garland__part {
  position: absolute;
  left: calc(var(--wu-x) * var(--wu-u));
  top: calc(var(--wu-t) * var(--wu-u));
  width: calc(var(--wu-w) * var(--wu-u));
  height: calc(var(--wu-h) * var(--wu-u));
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0)
    rotate(calc((var(--wu-tilt, 0) + var(--wu-wave, 0)) * 1deg)) scaleY(var(--wu-grow, 1));
  transform-origin: 50% var(--wu-origin-y, 50%);
}

.wu-garland__part img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  transform: translate3d(0, calc(var(--wu-rise, 0) * 1%), 0);
  -webkit-user-select: none;
  user-select: none;
}

/* The snowman rises out of the snow: its box hides the part that is still below. */
.wu-garland__part--pops {
  overflow: hidden;
}
`;

/** Top edge of the card's front page in the frame: parts that grow do so from this line. */
const CARD_TOP = 60;

/**
 * Seconds from `play()`. The garland starts with the card's pages and is in place by about 1.5 s;
 * the snowman follows the spec sheet (1.2–2.2 s). Then everything holds until the 6 s screen ends.
 */
const TIMING = {
  screen: 6,
  start: 0.5,
  settles: { duration: 0.9, drop: 16, fade: 0.3, ease: 'back.out(1.7)' },
  grows: { duration: 0.9, fade: 0.15, ease: 'back.out(1.4)' },
  pops: {
    at: 1.2,
    rise: 0.4,
    ease: 'back.out(1.6)',
    /** Left, right, left, rest: degrees and seconds per swing. */
    wave: [
      { angle: -7, duration: 0.15 },
      { angle: 6, duration: 0.18 },
      { angle: -4, duration: 0.15 },
      { angle: 0, duration: 0.12 },
    ],
  },
};

interface PartView {
  part: GarlandPart;
  node: HTMLElement;
  image: HTMLImageElement;
}

function renderPart(part: GarlandPart, assetBaseUrl: string | undefined): PartView {
  const node = document.createElement('div');
  node.className = `wu-garland__part wu-garland__part--${part.motion}`;
  node.style.setProperty('--wu-x', String(part.x));
  node.style.setProperty('--wu-t', String(part.y));
  node.style.setProperty('--wu-w', String(part.width));
  node.style.setProperty('--wu-h', String(part.height));
  node.style.setProperty('--wu-tilt', String(part.rotate));
  if (part.motion === 'grows') node.style.setProperty('--wu-origin-y', `${((CARD_TOP - part.y) / part.height) * 100}%`);
  if (part.motion === 'pops') node.style.setProperty('--wu-origin-y', '100%');

  const image = document.createElement('img');
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  image.src = assetBaseUrl ? `${assetBaseUrl}${part.asset}.png` : ASSET_URLS[part.asset];
  node.append(image);
  return { part, node, image };
}

function buildTimeline(views: PartView[]): gsap.core.Timeline {
  const timeline = holdTimeline(TIMING.screen);
  const nodes = (motion: GarlandPart['motion']) => views.filter((view) => view.part.motion === motion);

  // (settles): comes down a little and sits on the card's edge.
  const settling = nodes('settles').map((view) => view.node);
  if (settling.length > 0) {
    timeline
      .fromTo(
        settling,
        { '--wu-y': -TIMING.settles.drop },
        { '--wu-y': 0, duration: TIMING.settles.duration, ease: TIMING.settles.ease },
        TIMING.start,
      )
      .fromTo(
        settling,
        { opacity: 0 },
        { opacity: 1, duration: TIMING.settles.fade, ease: 'power1.out' },
        TIMING.start,
      );
  }

  // (grows), (sprout up): stretches upwards from the card's edge.
  const growing = nodes('grows').map((view) => view.node);
  if (growing.length > 0) {
    timeline
      .fromTo(
        growing,
        { '--wu-grow': 0 },
        { '--wu-grow': 1, duration: TIMING.grows.duration, ease: TIMING.grows.ease },
        TIMING.start,
      )
      .fromTo(growing, { opacity: 0 }, { opacity: 1, duration: TIMING.grows.fade, ease: 'power1.out' }, TIMING.start);
  }

  // (pops up, waves): the January snowman rises out of the snow, then rocks left and right.
  for (const { node, image } of nodes('pops')) {
    timeline.fromTo(
      image,
      { '--wu-rise': 100 },
      { '--wu-rise': 0, duration: TIMING.pops.rise, ease: TIMING.pops.ease },
      TIMING.pops.at,
    );
    let at = TIMING.pops.at + TIMING.pops.rise;
    let from = 0;
    for (const swing of TIMING.pops.wave) {
      timeline.fromTo(
        node,
        { '--wu-wave': from },
        { '--wu-wave': swing.angle, duration: swing.duration, ease: 'sine.inOut', immediateRender: false },
        at,
      );
      at += swing.duration;
      from = swing.angle;
    }
  }

  return timeline;
}

/**
 * Mounts the month's garland, the watercolor that sits on the top edge of BusiestMonthCard.
 * Put it in a layer above the card; it is independent of the card.
 */
export function mountGarland(el: HTMLElement, data: GarlandData, options: GarlandOptions = {}): GarlandController {
  const { autoplay = false, onComplete, maxScale = DEFAULT_MAX_SCALE, assetBaseUrl } = options;

  ensureStyles('garland', STYLES);
  const root = document.createElement('div');
  root.className = 'wu-garland';
  root.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('div');
  frame.className = 'wu-garland__frame';
  const views = (GARLANDS[data.month] ?? []).map((part) => renderPart(part, assetBaseUrl));
  frame.append(...views.map((view) => view.node));
  root.append(frame);
  el.append(root);

  const container = data.anchor ?? root;
  const place = () => {
    const placement = placeFrameIn(root, container, maxScale);
    if (!placement) return;
    root.style.setProperty('--wu-u', `${placement.scale}px`);
    frame.style.transform = `translate(${placement.x}px, ${placement.y}px)`;
  };
  const stopObserving = [observeSize(root, place), data.anchor ? observeSize(data.anchor, place) : () => {}];

  const controller = createController({
    timeline: buildTimeline(views),
    onComplete,
    onDestroy: () => {
      stopObserving.forEach((stop) => stop());
      root.remove();
    },
  });

  if (autoplay) controller.play();
  return controller;
}
