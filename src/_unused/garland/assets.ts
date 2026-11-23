/**
 * Sprite URLs. Each one is a literal `new URL('./assets/…', import.meta.url)` so the host's bundler
 * picks the files up from the `assets` folder next to this module.
 */
export const ASSET_URLS = {
  'january-garland': new URL('./assets/january-garland.png', import.meta.url).href,
  'january-snowman': new URL('./assets/january-snowman.png', import.meta.url).href,
  'february-garland': new URL('./assets/february-garland.png', import.meta.url).href,
  'february-heart': new URL('./assets/february-heart.png', import.meta.url).href,
  'march-garland': new URL('./assets/march-garland.png', import.meta.url).href,
  'april-garland': new URL('./assets/april-garland.png', import.meta.url).href,
  'may-garland': new URL('./assets/may-garland.png', import.meta.url).href,
  'june-garland': new URL('./assets/june-garland.png', import.meta.url).href,
  'july-garland': new URL('./assets/july-garland.png', import.meta.url).href,
  'august-garland': new URL('./assets/august-garland.png', import.meta.url).href,
  'september-garland': new URL('./assets/september-garland.png', import.meta.url).href,
  'october-garland': new URL('./assets/october-garland.png', import.meta.url).href,
  'november-garland': new URL('./assets/november-garland.png', import.meta.url).href,
  'december-garland': new URL('./assets/december-garland.png', import.meta.url).href,
};

export type AssetName = keyof typeof ASSET_URLS;
