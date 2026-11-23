import { containScale, DEFAULT_MAX_SCALE, observeSize, type Size } from './fit';
import { ensureStyles } from './styles';

/**
 * Shared shell of a card: a root that fills the container and a stage with the card's Figma frame,
 * scaled as a whole to fit the container. Every length inside is a multiple of --wu-u, one Figma px.
 */
const CARD_STYLES = /* css */ `
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

export interface CardShell {
  root: HTMLElement;
  stage: HTMLElement;
  /** Stops following the container and removes the card. */
  remove(): void;
}

interface CardShellConfig {
  /** Block name of the card's own classes, e.g. "wu-first-visit-card". */
  className: string;
  /** The card's frame in Figma. */
  frame: Size;
  maxScale?: number;
  ariaLabel?: string;
}

export function element(className: string, text?: string): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Places a `.wu-box` (or anything reading --x, --y, --w, --h) in Figma px. */
export function place(node: HTMLElement, box: { x: number; y: number; w?: number; h?: number }): HTMLElement {
  node.classList.add('wu-box');
  for (const [key, value] of Object.entries(box)) node.style.setProperty(`--${key}`, String(value));
  return node;
}

/**
 * Mounts the shell into `el` and keeps the whole frame inside it at its Figma proportions,
 * like `object-fit: contain`, never larger than `maxScale`.
 * A container without a height of its own gets one from the card, scaled by its width.
 */
export function createCardShell(el: HTMLElement, config: CardShellConfig): CardShell {
  const { className, frame, maxScale = DEFAULT_MAX_SCALE, ariaLabel } = config;
  ensureStyles('card', CARD_STYLES);

  const root = element(`wu-card ${className}`);
  root.style.setProperty('--wu-frame-w', String(frame.width));
  root.style.setProperty('--wu-frame-h', String(frame.height));
  if (ariaLabel) {
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', ariaLabel);
  }
  const stage = element('wu-card__stage');
  root.append(stage);
  el.append(root);

  let ownsHeight: boolean | null = null;
  const stopFitting = observeSize(root, (box) => {
    if (box.width === 0) return;
    if (ownsHeight === null) ownsHeight = box.height === 0;

    const scale = containScale(ownsHeight ? { ...box, height: Infinity } : box, frame, maxScale);
    if (ownsHeight) root.style.height = `${frame.height * scale}px`;
    root.style.setProperty('--wu-u', `${scale}px`);
  });

  return {
    root,
    stage,
    remove() {
      stopFitting();
      root.remove();
    },
  };
}
