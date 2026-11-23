/** Components grow with the screen up to this factor of their Figma size. */
export const DEFAULT_MAX_SCALE = 1.15;

export interface Size {
  width: number;
  height: number;
}

/**
 * Scale at which a `design` frame fits inside `box` without distortion, like `object-fit: contain`,
 * capped at `maxScale`.
 */
export function containScale(box: Size, design: Size, maxScale: number): number {
  return Math.min(box.width / design.width, box.height / design.height, maxScale);
}

/** Reports the element's layout size now and whenever it changes. Returns a function that stops it. */
export function observeSize(element: HTMLElement, onSize: (size: Size) => void): () => void {
  onSize({ width: element.clientWidth, height: element.clientHeight });
  if (typeof ResizeObserver === 'undefined') return () => {};

  const observer = new ResizeObserver(([entry]) => {
    if (entry) onSize({ width: entry.contentRect.width, height: entry.contentRect.height });
  });
  observer.observe(element);
  return () => observer.disconnect();
}
