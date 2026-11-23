import { element } from './card';
import { ensureStyles } from './styles';

/**
 * The stack of paper pages the cards are printed on: one front page with two smaller ones peeking out below.
 * Geometry from Figma, in a 360 x 350 frame.
 */
const PAGES_STYLES = /* css */ `
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

/** Size of the front page, the area the card's content is laid out in. */
export const FRONT_PAGE = { x: 73, y: 60, width: 214, height: 236.029 };

/** Seconds from `play()`: the front page slides up 24 px and fades in, the back pages follow 60 ms apart. */
export const PAGES_IN = { at: 0.4, duration: 0.48, stagger: 0.06, offsetY: 24, endAt: 1.0 };

export interface Pages {
  front: HTMLElement;
  /** In the order they come in: front, middle, back. */
  all: HTMLElement[];
}

/** Adds the three pages to `stage`, back page first so the front one is painted on top. */
export function createPages(stage: HTMLElement): Pages {
  ensureStyles('pages', PAGES_STYLES);
  const back = element('wu-page wu-page--back');
  const middle = element('wu-page wu-page--middle');
  const front = element('wu-page wu-page--front');
  stage.append(back, middle, front);
  return { front, all: [front, middle, back] };
}

/** The shared entrance of the page stack. */
export function addPagesIn(timeline: gsap.core.Timeline, pages: Pages): void {
  timeline.fromTo(
    pages.all,
    { opacity: 0, '--wu-y': PAGES_IN.offsetY },
    { opacity: 1, '--wu-y': 0, duration: PAGES_IN.duration, ease: 'power3.out', stagger: PAGES_IN.stagger },
    PAGES_IN.at,
  );
}
