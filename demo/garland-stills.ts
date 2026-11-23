/**
 * Stills of the garland that sits on the card's top edge, one set per month. Demo only:
 * in the app this is the animator's MP4. Boxes are in the 360 x 350 "Months card" frame, as in Figma.
 */
export interface GarlandStill {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
}

const imageUrls = import.meta.glob<string>('./assets/garland/*.png', { eager: true, query: '?url', import: 'default' });

function still(image: string, x: number, y: number, width: number, height: number, rotate = 0): GarlandStill {
  return {
    image: imageUrls[`./assets/garland/${image}.png`] ?? '',
    x,
    y,
    width,
    height,
    rotate,
  };
}

/** Index 0 = January. */
export const GARLAND_STILLS: GarlandStill[][] = [
  [still('january-garland', 59, -23, 240, 133), still('january-snowman', 206, -34, 74, 74)],
  [still('february-garland', 58, -25, 244, 135), still('february-heart', 108.528, 26.165, 34.664, 31.398, -18)],
  [still('march-garland', 67, -48, 224, 126)],
  [still('april-garland', 65, -48, 222, 124)],
  [still('may-garland', 64, -45, 223, 125)],
  [still('june-garland', 73, -37, 218, 122)],
  [still('july-garland', 73, -41, 210, 119)],
  [still('august-garland', 69, -49, 223, 126)],
  [still('september-garland', 73, -39, 214, 120)],
  [still('october-garland', 64, -32, 226, 127)],
  [still('november-garland', 71, -35, 216, 123)],
  [still('december-garland', 54, -49, 254, 144)],
];
