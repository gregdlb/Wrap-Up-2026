import { ASSET_URLS } from '../falling-leaves/assets';
import { monthAssets } from '../falling-leaves/pieces';
import { preloadImages } from '../shared/images';
import { heartUrl } from '../shared/sticker';

export interface PreloadOptions {
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Downloads and decodes the images the Wrap Up components use, ahead of the story:
 * the watercolor heart of the stickers and the FallingLeaves sprites of the given months
 * (1 = January; all twelve when left out). Resolves when everything is in; it never rejects.
 */
export function preloadWrapUpAssets(months: number[] = ALL_MONTHS, options: PreloadOptions = {}): Promise<void> {
  const { assetBaseUrl } = options;
  const sprites = months.flatMap(monthAssets).map((name) => (assetBaseUrl ? `${assetBaseUrl}${name}.png` : ASSET_URLS[name]));
  return preloadImages([heartUrl(assetBaseUrl), ...sprites]);
}
