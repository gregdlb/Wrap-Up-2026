import { keepTogether } from './text';
import { element } from './card';
import { ensureStyles } from './styles';

/** A tilted sticker pill, e.g. "With Rosa" with the watercolor heart. Placed by its unrotated top left corner. */
const STICKER_STYLES = /* css */ `
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

/** Resolved by the host's bundler from the `assets` folder next to this module. */
const HEART_URL = new URL('./assets/sticker-heart.png', import.meta.url).href;

interface StickerConfig {
  text: string;
  /** Unrotated top left corner in Figma px. */
  x: number;
  y: number;
  /** Degrees. */
  tilt: number;
  /** The watercolor heart before the text. Defaults to true. */
  heart?: boolean;
  /** Drop shadow offset and blur in Figma px. Defaults to 14 and 28. */
  shadow?: { y: number; blur: number };
  /** Folder with the images, ending in "/". */
  assetBaseUrl?: string;
}

/** URL of the watercolor heart used on stickers and badges. */
export function heartUrl(assetBaseUrl?: string): string {
  return assetBaseUrl ? `${assetBaseUrl}sticker-heart.png` : HEART_URL;
}

export function createSticker({ text, x, y, tilt, heart = true, shadow, assetBaseUrl }: StickerConfig): HTMLElement {
  ensureStyles('sticker', STICKER_STYLES);
  const sticker = element('wu-sticker');
  sticker.style.setProperty('--x', String(x));
  sticker.style.setProperty('--y', String(y));
  sticker.style.setProperty('--wu-tilt', String(tilt));
  if (shadow) {
    sticker.style.setProperty('--wu-shadow-y', String(shadow.y));
    sticker.style.setProperty('--wu-shadow-blur', String(shadow.blur));
  }

  if (heart) {
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.src = heartUrl(assetBaseUrl);
    sticker.append(image);
  }
  sticker.append(keepTogether(text));
  return sticker;
}

interface StickerPop {
  /** Seconds the pop takes. Defaults to 0.35. */
  duration?: number;
  /** Degrees the sticker turns while popping in, ending at its own tilt. Defaults to 0: it does not turn. */
  turn?: number;
}

/** Pops the sticker in with a small bounce at `at` seconds, optionally turning into its tilt. */
export function addStickerPop(
  timeline: gsap.core.Timeline,
  sticker: HTMLElement,
  at: number,
  { duration = 0.35, turn = 0 }: StickerPop = {},
): void {
  const tilt = Number(sticker.style.getPropertyValue('--wu-tilt')) || 0;
  timeline
    .fromTo(sticker, { '--wu-pop': 0.6 }, { '--wu-pop': 1, duration, ease: 'back.out(2.2)' }, at)
    .fromTo(sticker, { opacity: 0 }, { opacity: 1, duration: Math.min(0.15, duration), ease: 'power1.out' }, at);
  if (turn !== 0) {
    timeline.fromTo(sticker, { '--wu-tilt': tilt - turn }, { '--wu-tilt': tilt, duration, ease: 'back.out(2.2)' }, at);
  }
}
