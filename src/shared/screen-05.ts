import { containScale, type Size } from './fit';

/** The Figma "Months card" frame of screen 05. BusiestMonthCard and FallingLeaves share its coordinates. */
export const MONTHS_CARD_FRAME: Size = { width: 360, height: 350 };

/** Space between that frame and the bottom of the 782 px tall Figma screen. */
export const MONTHS_CARD_BOTTOM_GAP = 19;

/** Where the frame sits inside a layer: the size of one Figma px and the frame's top left corner, in layout px. */
export interface FramePlacement {
  scale: number;
  x: number;
  y: number;
}

/**
 * Fits the frame into `box` the way BusiestMonthCard fits itself into its container,
 * and reports the result in the coordinates of `layer`. `box` may be the layer itself.
 */
export function placeFrameIn(layer: HTMLElement, box: HTMLElement, maxScale: number): FramePlacement | null {
  const width = box.offsetWidth;
  const height = box.offsetHeight;
  if (width === 0) return null;

  // A box without a height of its own is as tall as the frame scaled by its width, like the card's container.
  const scale = containScale({ width, height: height > 0 ? height : Infinity }, MONTHS_CARD_FRAME, maxScale);
  const fittedHeight = height > 0 ? height : MONTHS_CARD_FRAME.height * scale;
  const inside = {
    x: (width - MONTHS_CARD_FRAME.width * scale) / 2,
    y: (fittedHeight - MONTHS_CARD_FRAME.height * scale) / 2,
  };
  if (box === layer) return { scale, ...inside };

  // Rects are in screen px; dividing by the box's own zoom keeps this right inside scaled ancestors.
  const boxRect = box.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const zoom = boxRect.width / width || 1;
  return {
    scale,
    x: (boxRect.left - layerRect.left) / zoom + inside.x,
    y: (boxRect.top - layerRect.top) / zoom + inside.y,
  };
}

/** The frame centred at the bottom of a layer that covers the screen, as on the Figma screen. */
export function placeFrameAtBottom(layer: Size, maxScale: number): FramePlacement {
  const scale = Math.min(layer.width / MONTHS_CARD_FRAME.width, maxScale);
  return {
    scale,
    x: (layer.width - MONTHS_CARD_FRAME.width * scale) / 2,
    y: layer.height - (MONTHS_CARD_FRAME.height + MONTHS_CARD_BOTTOM_GAP) * scale,
  };
}
