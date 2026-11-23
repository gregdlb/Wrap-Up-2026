import type { AssetName } from './assets';

/**
 * How a part arrives, from its Figma layer name: (settles), (grows) and (sprout up), (pops up, waves).
 */
export type PartMotion = 'settles' | 'grows' | 'pops';

/**
 * One image of a month's garland at its place in Figma (section "05 Busiest month · all months").
 * `x`, `y`, `width`, `height` are its unrotated box in the 360 x 350 "Months card" frame.
 */
export interface GarlandPart {
  asset: AssetName;
  motion: PartMotion;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, around the box centre. */
  rotate: number;
}

/** Parts per month in paint order, 1 = January. */
export const GARLANDS: Record<number, GarlandPart[]> = {
  1: [
    { asset: 'january-garland', motion: 'settles', x: 59, y: -23, width: 240, height: 133, rotate: 0 },
    { asset: 'january-snowman', motion: 'pops', x: 206, y: -34, width: 74, height: 74, rotate: 0 },
  ],
  2: [
    { asset: 'february-garland', motion: 'settles', x: 58, y: -25, width: 244, height: 135, rotate: 0 },
    { asset: 'february-heart', motion: 'settles', x: 108.528, y: 26.165, width: 34.664, height: 31.398, rotate: -18 },
  ],
  3: [
    { asset: 'march-garland', motion: 'grows', x: 67, y: -48, width: 224, height: 126, rotate: 0 },
  ],
  4: [
    { asset: 'april-garland', motion: 'grows', x: 65, y: -48, width: 222, height: 124, rotate: 0 },
  ],
  5: [
    { asset: 'may-garland', motion: 'grows', x: 64, y: -45, width: 223, height: 125, rotate: 0 },
  ],
  6: [
    { asset: 'june-garland', motion: 'grows', x: 73, y: -37, width: 218, height: 122, rotate: 0 },
  ],
  7: [
    { asset: 'july-garland', motion: 'grows', x: 73, y: -41, width: 210, height: 119, rotate: 0 },
  ],
  8: [
    { asset: 'august-garland', motion: 'grows', x: 69, y: -49, width: 223, height: 126, rotate: 0 },
  ],
  9: [
    { asset: 'september-garland', motion: 'settles', x: 73, y: -39, width: 214, height: 120, rotate: 0 },
  ],
  10: [
    { asset: 'october-garland', motion: 'settles', x: 64, y: -32, width: 226, height: 127, rotate: 0 },
  ],
  11: [
    { asset: 'november-garland', motion: 'settles', x: 71, y: -35, width: 216, height: 123, rotate: 0 },
  ],
  12: [
    { asset: 'december-garland', motion: 'settles', x: 54, y: -49, width: 254, height: 144, rotate: 0 },
  ],
};
