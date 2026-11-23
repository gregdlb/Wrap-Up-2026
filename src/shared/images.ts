import { ensureStyles } from './styles';

/**
 * Images must not pop in while a card is animating: every component reports `ready` once its images are
 * downloaded and decoded, and `play()` waits for that. An image that still arrives late fades in.
 */
const IMAGE_STYLES = /* css */ `
.wu-image {
  transition: opacity 0.2s linear;
}

.wu-image--loading {
  opacity: 0 !important;
}
`;

/** `play()` waits this long for the images, then starts without the missing ones. */
export const READY_TIMEOUT_SECONDS = 2;
/** A late image fades in over this time. */
export const LATE_FADE_SECONDS = 0.2;

/** Resolves when the image is downloaded and decoded. Also resolves when it fails, so nothing waits forever. */
export function decodeImage(image: HTMLImageElement): Promise<void> {
  if (!image.src) return Promise.resolve();
  if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

/**
 * Keeps the images invisible until they are decoded and resolves when all of them are.
 * One that is ready only after the animation has started fades in instead of jumping in.
 */
export function trackImages(images: Iterable<HTMLImageElement>): Promise<void> {
  ensureStyles('images', IMAGE_STYLES);
  const all = [...images].map((image) => {
    image.classList.add('wu-image', 'wu-image--loading');
    return decodeImage(image).then(() => image.classList.remove('wu-image--loading'));
  });
  return Promise.all(all).then(() => undefined);
}

/** Downloads and decodes images ahead of time, so components mounted later find them in the browser's cache. */
export function preloadImages(urls: Iterable<string>): Promise<void> {
  const all = [...new Set(urls)].map((url) => {
    const image = new Image();
    image.src = url;
    return decodeImage(image);
  });
  return Promise.all(all).then(() => undefined);
}

export interface StartGate {
  /** Runs `start` now when the images are ready (or the wait is over), otherwise as soon as that happens. */
  whenOpen(start: () => void): void;
  /** Forgets a start that is still waiting, e.g. on pause. */
  cancel(): void;
}

/**
 * Holds back the start of an animation until `ready`, for at most READY_TIMEOUT_SECONDS.
 * Without `ready` (a component with no images) the gate is open from the start.
 */
export function createStartGate(ready?: Promise<void>): StartGate {
  let open = ready === undefined;
  let pending: (() => void) | null = null;
  let waiting: Promise<void> | null = null;
  void ready?.then(() => {
    open = true;
  });

  return {
    whenOpen(start) {
      if (open) return start();
      pending = start;
      waiting ??= Promise.race([
        ready,
        new Promise<void>((resolve) => setTimeout(resolve, READY_TIMEOUT_SECONDS * 1000)),
      ]).then(() => {
        open = true;
        const run = pending;
        pending = null;
        run?.();
      });
    },
    cancel() {
      pending = null;
    },
  };
}
