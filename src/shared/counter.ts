interface CountOptions {
  /** Seconds from `play()`. */
  at: number;
  duration: number;
  /** Turns the running number into text. Defaults to the rounded number. */
  format?: (value: number) => string;
  ease?: string;
  from?: number;
}

/**
 * Counts `node`'s text from 0 (or `from`) to `target` on the timeline.
 * GSAP writes through a setter on every render, so the text also follows seek() and rewinds.
 */
export function addCounter(
  timeline: gsap.core.Timeline,
  node: HTMLElement,
  target: number,
  options: CountOptions,
): void {
  const { at, duration, format = (value) => String(Math.round(value)), ease = 'power1.out', from = 0 } = options;
  let current = from;
  const count = {
    get value() {
      return current;
    },
    set value(next: number) {
      current = next;
      node.textContent = format(next);
    },
  };
  timeline.fromTo(count, { value: from }, { value: target, duration, ease }, at);
}

/** Length of a screen in seconds; each card's timeline lasts exactly this long. Screen 03 (VisitsCount) is longer. */
export const SCREEN_SECONDS = 6;
