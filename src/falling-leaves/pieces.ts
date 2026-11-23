import type { AssetName } from './assets';

/** How a piece moves, from its Figma layer name: (tumbles), (sways), (lands last), (bursts). */
export type PieceMotion = 'tumbles' | 'sways' | 'lands' | 'bursts';

/**
 * One watercolor piece at its place in Figma (section "05 Busiest month · all months").
 * `x`, `y` are the piece's centre in the 360 x 350 "Months card" frame, `size` its square box, `rotate` in degrees.
 */
export interface Piece {
  asset: AssetName;
  motion: PieceMotion;
  x: number;
  y: number;
  size: number;
  rotate: number;
  blur: number;
  /** Figma layer order: `back` lies under the card's pages, `front` above them. */
  layer: 'back' | 'front';
}

/** A snowflake of the "Falling snow" layer: centre in the same frame, radius, opacity, and whether Figma blurs it. */
export interface Flake {
  x: number;
  y: number;
  r: number;
  opacity: number;
  soft: boolean;
}

/** Months whose falling layer is snow (January, February, December). */
export const SNOW_MONTHS = [1, 2, 12];

/**
 * Pieces per month in Figma's paint order, 1 = January. Snow months have none: they use SNOW_FLAKES,
 * which Figma paints behind everything, so the whole snow is a `back` layer.
 */
export const MONTH_PIECES: Record<number, Piece[]> = {
  1: [
  ],
  2: [
  ],
  3: [
    { asset: 'march-snowdrop-1', motion: 'tumbles', x: 55.616, y: 227.616, size: 56.527, rotate: 75, blur: 0, layer: 'back' },
    { asset: 'march-snowdrop-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'march-snowdrop-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'march-snowdrop-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
  ],
  4: [
    { asset: 'april-petal-3', motion: 'lands', x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: 'back' },
    { asset: 'april-petal-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'april-petal-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'april-petal-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'april-petal-3', motion: 'lands', x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  5: [
    { asset: 'may-lilac-floret-3', motion: 'lands', x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: 'back' },
    { asset: 'may-lilac-floret-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'may-lilac-floret-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'may-lilac-floret-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'may-lilac-floret-3', motion: 'lands', x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  6: [
    { asset: 'june-daisy-3', motion: 'lands', x: 70.041, y: 197.542, size: 46.077, rotate: 135, blur: 0, layer: 'back' },
    { asset: 'june-daisy-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'june-daisy-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'june-daisy-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'june-daisy-3', motion: 'lands', x: 137.902, y: -13.098, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  7: [
    { asset: 'july-firework-3', motion: 'bursts', x: 67.041, y: 197.542, size: 50.32, rotate: 135, blur: 0, layer: 'back' },
    { asset: 'july-firework-1', motion: 'bursts', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'july-firework-1', motion: 'bursts', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'july-firework-2', motion: 'bursts', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'july-firework-3', motion: 'bursts', x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  8: [
    { asset: 'august-petal-3', motion: 'lands', x: 68.579, y: 191.579, size: 41.835, rotate: 165, blur: 0, layer: 'back' },
    { asset: 'august-petal-1', motion: 'tumbles', x: 41.608, y: 36.228, size: 17.611, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'august-petal-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'august-petal-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'august-petal-3', motion: 'lands', x: 104.136, y: 16.675, size: 14.974, rotate: -118, blur: 0, layer: 'front' },
  ],
  9: [
    { asset: 'september-leaf-3', motion: 'lands', x: 64.584, y: 197.544, size: 53.797, rotate: 165, blur: 0, layer: 'back' },
    { asset: 'september-leaf-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'september-leaf-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'september-leaf-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'september-leaf-3', motion: 'lands', x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  10: [
    { asset: 'october-leaf-3', motion: 'lands', x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: 'back' },
    { asset: 'october-leaf-1', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'october-leaf-1', motion: 'tumbles', x: 219.15, y: 322.4, size: 77.18, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'october-leaf-1', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'october-leaf-2', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'october-leaf-3', motion: 'lands', x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  11: [
    { asset: 'november-leaf-3-rust', motion: 'lands', x: 67.778, y: 193.067, size: 53.895, rotate: 180, blur: 0, layer: 'back' },
    { asset: 'november-leaf-1-oak', motion: 'tumbles', x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: 'front' },
    { asset: 'november-leaf-1-oak', motion: 'tumbles', x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: 'front' },
    { asset: 'november-leaf-2-ochre', motion: 'sways', x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: 'front' },
    { asset: 'november-leaf-3-rust', motion: 'lands', x: 134.902, y: -5.098, size: 23.517, rotate: -118, blur: 0, layer: 'front' },
  ],
  12: [
  ],
};

export const SNOW_FLAKES: Flake[] = [
  { x: 43.818, y: 31.036, r: 2.247, opacity: 0.703, soft: false },
  { x: 30.857, y: 317.068, r: 2.576, opacity: 0.655, soft: true },
  { x: 86.234, y: 222.99, r: 1.605, opacity: 0.73, soft: false },
  { x: 339.605, y: 356.971, r: 1.522, opacity: 0.672, soft: false },
  { x: 346.246, y: 6.307, r: 2.193, opacity: 0.725, soft: false },
  { x: 356.596, y: 121.318, r: 1.773, opacity: 0.724, soft: false },
  { x: 120.981, y: -9.841, r: 2.041, opacity: 0.625, soft: false },
  { x: 30.457, y: 337.598, r: 1.787, opacity: 0.892, soft: false },
  { x: 171.608, y: 27.371, r: 2.154, opacity: 0.829, soft: false },
  { x: 304.073, y: 124.066, r: 2.238, opacity: 0.582, soft: false },
  { x: 86.758, y: 254.91, r: 1.547, opacity: 0.585, soft: false },
  { x: 351.795, y: 339.27, r: 3.186, opacity: 0.824, soft: true },
  { x: 10.729, y: 66.691, r: 2.054, opacity: 0.558, soft: false },
  { x: 266.672, y: 40.289, r: 1.266, opacity: 0.63, soft: false },
  { x: 34.471, y: 367.03, r: 2.277, opacity: 0.886, soft: false },
  { x: 48.304, y: 279.214, r: 3.267, opacity: 0.582, soft: true },
  { x: 11.625, y: -8.659, r: 2.841, opacity: 0.799, soft: true },
  { x: 84.367, y: 294.378, r: 1.63, opacity: 0.469, soft: false },
  { x: 300.641, y: 300.033, r: 1.578, opacity: 0.697, soft: false },
  { x: 21.085, y: 47.155, r: 2.349, opacity: 0.482, soft: false },
  { x: 286.219, y: -17.889, r: 1.62, opacity: 0.45, soft: false },
  { x: 41.441, y: 136.298, r: 2.183, opacity: 0.454, soft: false },
  { x: 268.852, y: 73.865, r: 2.863, opacity: 0.77, soft: true },
  { x: 68.397, y: 57.131, r: 1.316, opacity: 0.75, soft: false },
  { x: 46.039, y: 326.282, r: 2.74, opacity: 0.699, soft: true },
  { x: 328.587, y: 226.342, r: 2.281, opacity: 0.934, soft: false },
  { x: 321.311, y: 108.428, r: 2.37, opacity: 0.801, soft: false },
  { x: 285.905, y: 333.125, r: 2.476, opacity: 0.945, soft: false },
  { x: 319.042, y: 245.195, r: 1.366, opacity: 0.635, soft: false },
  { x: 238.814, y: -10.017, r: 1.629, opacity: 0.55, soft: false },
  { x: 346.749, y: 151.827, r: 1.329, opacity: 0.644, soft: false },
  { x: 67.978, y: 216.678, r: 1.774, opacity: 0.82, soft: false },
  { x: 300.907, y: 1.296, r: 2.024, opacity: 0.659, soft: false },
  { x: 323.33, y: 176.23, r: 1.441, opacity: 0.532, soft: false },
  { x: 24.088, y: 254.978, r: 2.276, opacity: 0.727, soft: false },
  { x: 81.681, y: 95.843, r: 1.322, opacity: 0.514, soft: false },
  { x: 12.302, y: 162.452, r: 1.878, opacity: 0.623, soft: false },
  { x: 85.788, y: 250.949, r: 2.357, opacity: 0.565, soft: false },
  { x: 85.788, y: 242.947, r: 2.357, opacity: 0.565, soft: false },
  { x: 344.652, y: 94.412, r: 3.378, opacity: 0.851, soft: true },
  { x: 344.652, y: 86.412, r: 3.378, opacity: 0.851, soft: true },
  { x: 50.821, y: 247.347, r: 2.574, opacity: 0.932, soft: true },
  { x: 50.821, y: 239.347, r: 2.574, opacity: 0.932, soft: true },
  { x: 59.994, y: 335.764, r: 2.643, opacity: 0.845, soft: true },
  { x: 59.994, y: 327.764, r: 2.643, opacity: 0.845, soft: true },
  { x: 35.414, y: 235.414, r: 3.414, opacity: 0.755, soft: true },
  { x: 43.414, y: 203.414, r: 3.414, opacity: 0.755, soft: true },
  { x: 299.831, y: 255.868, r: 2.436, opacity: 0.714, soft: false },
  { x: 299.831, y: 247.868, r: 2.436, opacity: 0.714, soft: false },
  { x: 33.449, y: -15.222, r: 2.1, opacity: 0.911, soft: false },
  { x: 33.449, y: -23.22, r: 2.1, opacity: 0.911, soft: false },
  { x: 90.621, y: 30.039, r: 1.365, opacity: 0.626, soft: false },
  { x: 90.621, y: 22.039, r: 1.365, opacity: 0.626, soft: false },
  { x: 295.676, y: 197.887, r: 2.466, opacity: 0.476, soft: false },
  { x: 295.676, y: 189.888, r: 2.466, opacity: 0.476, soft: false },
];

/** Names of the sprites a month uses. */
export function monthAssets(month: number): AssetName[] {
  if (SNOW_MONTHS.includes(month)) return ['snowflake', 'snowflake-soft'];
  return [...new Set((MONTH_PIECES[month] ?? []).map((piece) => piece.asset))];
}
