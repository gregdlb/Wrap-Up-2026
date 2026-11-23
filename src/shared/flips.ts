import { element } from './card';
import { ensureStyles } from './styles';

/**
 * Blank sheets that turn up over the top edge of a card's front page and uncover the page with the data.
 * Same look as the calendar of FirstVisitCard: hinged at the top, rotateX with perspective, shaded while lifting.
 */
const FLIP_STYLES = /* css */ `
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

/** Seconds from `play()`: the sheets turn while the card slides in and are gone when its content starts. */
const BLANK_FLIPS = { count: 3, at: 0.5, endAt: 1.0, speedUp: 0.85, angle: 100, fadeFrom: 80 };

/** Start and length of each flip in seconds after the first one starts; every flip is shorter than the last. */
export function flipSchedule(flips: number, seconds: number, speedUp: number): { at: number; duration: number }[] {
  const weights = Array.from({ length: flips }, (_, index) => Math.pow(speedUp, index));
  const sum = weights.reduce((all, weight) => all + weight, 0);
  let at = 0;
  return weights.map((weight) => {
    const flip = { at, duration: (seconds * weight) / sum };
    at += flip.duration;
    return flip;
  });
}

/**
 * Adds the blank sheets to `frontPage` (after its content) and their flipping to the timeline.
 * Until the last sheet lifts, the page's content stays covered.
 */
export function addBlankFlips(timeline: gsap.core.Timeline, frontPage: HTMLElement): void {
  ensureStyles('flips', FLIP_STYLES);
  frontPage.classList.add('wu-flips');
  const cover = element('wu-flips__sheet');
  const shadow = element('wu-flips__shadow');
  const leaf = element('wu-flips__sheet wu-flips__leaf');
  const shade = element('wu-flips__shade');
  leaf.append(shade);
  frontPage.append(cover, shadow, leaf);

  const { count, at, endAt, speedUp, angle: fullAngle, fadeFrom } = BLANK_FLIPS;
  const schedule = flipSchedule(count, endAt - at, speedUp);

  const show = (seconds: number) => {
    const index = schedule.findIndex((flip) => seconds < flip.at + flip.duration);
    if (seconds <= 0 || index < 0) {
      // Before the first flip a blank sheet lies on top; after the last one the page is open.
      cover.style.opacity = seconds <= 0 ? '1' : '0';
      leaf.style.opacity = '0';
      shadow.style.opacity = '0';
      return;
    }
    const flip = schedule[index]!;
    const progress = Math.min(Math.max((seconds - flip.at) / flip.duration, 0), 1);
    const angle = fullAngle * Math.pow(progress, 1.6);
    cover.style.opacity = index < count - 1 ? '1' : '0';
    leaf.style.setProperty('--wu-flip', angle.toFixed(2));
    leaf.style.opacity = String(Math.min(Math.max((fullAngle - angle) / (fullAngle - fadeFrom), 0), 1));
    shade.style.opacity = String(Math.sin((Math.min(angle, 90) * Math.PI) / 180));
    shadow.style.opacity = String(Math.sin(progress * Math.PI));
  };

  // GSAP writes through the setter on every render, so the sheets also follow seek() and rewinds.
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next: number) {
      flipped = next;
      show(next);
    },
  };
  timeline.fromTo(flipping, { seconds: 0 }, { seconds: endAt - at, duration: endAt - at, ease: 'none' }, at);
}
