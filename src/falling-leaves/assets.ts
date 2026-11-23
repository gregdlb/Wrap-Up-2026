/**
 * Sprite URLs. Each one is a literal `new URL('./assets/…', import.meta.url)` so the host's bundler
 * picks the files up from the `assets` folder next to this module.
 */
export const ASSET_URLS = {
  'april-petal-1': new URL('./assets/april-petal-1.png', import.meta.url).href,
  'april-petal-2': new URL('./assets/april-petal-2.png', import.meta.url).href,
  'april-petal-3': new URL('./assets/april-petal-3.png', import.meta.url).href,
  'august-petal-1': new URL('./assets/august-petal-1.png', import.meta.url).href,
  'august-petal-2': new URL('./assets/august-petal-2.png', import.meta.url).href,
  'august-petal-3': new URL('./assets/august-petal-3.png', import.meta.url).href,
  'july-firework-1': new URL('./assets/july-firework-1.png', import.meta.url).href,
  'july-firework-2': new URL('./assets/july-firework-2.png', import.meta.url).href,
  'july-firework-3': new URL('./assets/july-firework-3.png', import.meta.url).href,
  'june-daisy-1': new URL('./assets/june-daisy-1.png', import.meta.url).href,
  'june-daisy-2': new URL('./assets/june-daisy-2.png', import.meta.url).href,
  'june-daisy-3': new URL('./assets/june-daisy-3.png', import.meta.url).href,
  'march-snowdrop-1': new URL('./assets/march-snowdrop-1.png', import.meta.url).href,
  'march-snowdrop-2': new URL('./assets/march-snowdrop-2.png', import.meta.url).href,
  'may-lilac-floret-1': new URL('./assets/may-lilac-floret-1.png', import.meta.url).href,
  'may-lilac-floret-2': new URL('./assets/may-lilac-floret-2.png', import.meta.url).href,
  'may-lilac-floret-3': new URL('./assets/may-lilac-floret-3.png', import.meta.url).href,
  'november-leaf-1-oak': new URL('./assets/november-leaf-1-oak.png', import.meta.url).href,
  'november-leaf-2-ochre': new URL('./assets/november-leaf-2-ochre.png', import.meta.url).href,
  'november-leaf-3-rust': new URL('./assets/november-leaf-3-rust.png', import.meta.url).href,
  'october-leaf-1': new URL('./assets/october-leaf-1.png', import.meta.url).href,
  'october-leaf-2': new URL('./assets/october-leaf-2.png', import.meta.url).href,
  'october-leaf-3': new URL('./assets/october-leaf-3.png', import.meta.url).href,
  'september-leaf-1': new URL('./assets/september-leaf-1.png', import.meta.url).href,
  'september-leaf-2': new URL('./assets/september-leaf-2.png', import.meta.url).href,
  'september-leaf-3': new URL('./assets/september-leaf-3.png', import.meta.url).href,
  'snowflake': new URL('./assets/snowflake.png', import.meta.url).href,
  'snowflake-soft': new URL('./assets/snowflake-soft.png', import.meta.url).href,
};

export type AssetName = keyof typeof ASSET_URLS;
