// src/falling-leaves/assets.ts
var ASSET_URLS = {
  "april-petal-1": new URL("./assets/april-petal-1.png", import.meta.url).href,
  "april-petal-2": new URL("./assets/april-petal-2.png", import.meta.url).href,
  "april-petal-3": new URL("./assets/april-petal-3.png", import.meta.url).href,
  "august-petal-1": new URL("./assets/august-petal-1.png", import.meta.url).href,
  "august-petal-2": new URL("./assets/august-petal-2.png", import.meta.url).href,
  "august-petal-3": new URL("./assets/august-petal-3.png", import.meta.url).href,
  "july-firework-1": new URL("./assets/july-firework-1.png", import.meta.url).href,
  "july-firework-2": new URL("./assets/july-firework-2.png", import.meta.url).href,
  "july-firework-3": new URL("./assets/july-firework-3.png", import.meta.url).href,
  "june-daisy-1": new URL("./assets/june-daisy-1.png", import.meta.url).href,
  "june-daisy-2": new URL("./assets/june-daisy-2.png", import.meta.url).href,
  "june-daisy-3": new URL("./assets/june-daisy-3.png", import.meta.url).href,
  "march-snowdrop-1": new URL("./assets/march-snowdrop-1.png", import.meta.url).href,
  "march-snowdrop-2": new URL("./assets/march-snowdrop-2.png", import.meta.url).href,
  "may-lilac-floret-1": new URL("./assets/may-lilac-floret-1.png", import.meta.url).href,
  "may-lilac-floret-2": new URL("./assets/may-lilac-floret-2.png", import.meta.url).href,
  "may-lilac-floret-3": new URL("./assets/may-lilac-floret-3.png", import.meta.url).href,
  "november-leaf-1-oak": new URL("./assets/november-leaf-1-oak.png", import.meta.url).href,
  "november-leaf-2-ochre": new URL("./assets/november-leaf-2-ochre.png", import.meta.url).href,
  "november-leaf-3-rust": new URL("./assets/november-leaf-3-rust.png", import.meta.url).href,
  "october-leaf-1": new URL("./assets/october-leaf-1.png", import.meta.url).href,
  "october-leaf-2": new URL("./assets/october-leaf-2.png", import.meta.url).href,
  "october-leaf-3": new URL("./assets/october-leaf-3.png", import.meta.url).href,
  "september-leaf-1": new URL("./assets/september-leaf-1.png", import.meta.url).href,
  "september-leaf-2": new URL("./assets/september-leaf-2.png", import.meta.url).href,
  "september-leaf-3": new URL("./assets/september-leaf-3.png", import.meta.url).href,
  snowflake: new URL("./assets/snowflake.png", import.meta.url).href,
  "snowflake-soft": new URL("./assets/snowflake-soft.png", import.meta.url).href
};

// src/falling-leaves/pieces.ts
var SNOW_MONTHS = [1, 2, 12];
var MONTH_PIECES = {
  1: [],
  2: [],
  3: [
    { asset: "march-snowdrop-1", motion: "tumbles", x: 55.616, y: 227.616, size: 56.527, rotate: 75, blur: 0, layer: "back" },
    { asset: "march-snowdrop-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "march-snowdrop-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "march-snowdrop-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" }
  ],
  4: [
    { asset: "april-petal-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "april-petal-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "april-petal-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "april-petal-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "april-petal-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  5: [
    { asset: "may-lilac-floret-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "may-lilac-floret-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "may-lilac-floret-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "may-lilac-floret-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "may-lilac-floret-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  6: [
    { asset: "june-daisy-3", motion: "lands", x: 70.041, y: 197.542, size: 46.077, rotate: 135, blur: 0, layer: "back" },
    { asset: "june-daisy-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "june-daisy-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "june-daisy-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "june-daisy-3", motion: "lands", x: 137.902, y: -13.098, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  7: [
    { asset: "july-firework-3", motion: "bursts", x: 67.041, y: 197.542, size: 50.32, rotate: 135, blur: 0, layer: "back" },
    { asset: "july-firework-1", motion: "bursts", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "july-firework-1", motion: "bursts", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "july-firework-2", motion: "bursts", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "july-firework-3", motion: "bursts", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  8: [
    { asset: "august-petal-3", motion: "lands", x: 68.579, y: 191.579, size: 41.835, rotate: 165, blur: 0, layer: "back" },
    { asset: "august-petal-1", motion: "tumbles", x: 41.608, y: 36.228, size: 17.611, rotate: 28, blur: 0, layer: "front" },
    { asset: "august-petal-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "august-petal-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "august-petal-3", motion: "lands", x: 104.136, y: 16.675, size: 14.974, rotate: -118, blur: 0, layer: "front" }
  ],
  9: [
    { asset: "september-leaf-3", motion: "lands", x: 64.584, y: 197.544, size: 53.797, rotate: 165, blur: 0, layer: "back" },
    { asset: "september-leaf-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "september-leaf-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "september-leaf-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "september-leaf-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  10: [
    { asset: "october-leaf-3", motion: "lands", x: 57.041, y: 197.542, size: 64.462, rotate: 135, blur: 0, layer: "back" },
    { asset: "october-leaf-1", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "october-leaf-1", motion: "tumbles", x: 219.15, y: 322.4, size: 77.18, rotate: 28, blur: 0, layer: "front" },
    { asset: "october-leaf-1", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "october-leaf-2", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "october-leaf-3", motion: "lands", x: 137.902, y: 2.902, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  11: [
    { asset: "november-leaf-3-rust", motion: "lands", x: 67.778, y: 193.067, size: 53.895, rotate: 180, blur: 0, layer: "back" },
    { asset: "november-leaf-1-oak", motion: "tumbles", x: 39.57, y: 29.57, size: 27.462, rotate: 28, blur: 0, layer: "front" },
    { asset: "november-leaf-1-oak", motion: "tumbles", x: 306.482, y: 247.773, size: 16.05, rotate: -60, blur: 0, layer: "front" },
    { asset: "november-leaf-2-ochre", motion: "sways", x: 311, y: 109, size: 30, rotate: 0, blur: 2, layer: "front" },
    { asset: "november-leaf-3-rust", motion: "lands", x: 134.902, y: -5.098, size: 23.517, rotate: -118, blur: 0, layer: "front" }
  ],
  12: []
};
function monthAssets(month) {
  if (SNOW_MONTHS.includes(month))
    return ["snowflake", "snowflake-soft"];
  return [...new Set((MONTH_PIECES[month] ?? []).map((piece) => piece.asset))];
}

// src/shared/images.ts
function decodeImage(image) {
  if (!image.src)
    return Promise.resolve();
  if (typeof image.decode === "function")
    return image.decode().catch(() => {
      return;
    });
  if (image.complete)
    return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}
function preloadImages(urls) {
  const all = [...new Set(urls)].map((url) => {
    const image = new Image;
    image.src = url;
    return decodeImage(image);
  });
  return Promise.all(all).then(() => {
    return;
  });
}

// src/shared/sticker.ts
var HEART_URL = new URL("./assets/sticker-heart.png", import.meta.url).href;
function heartUrl(assetBaseUrl) {
  return assetBaseUrl ? `${assetBaseUrl}sticker-heart.png` : HEART_URL;
}

// src/preload/preload.ts
var ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
function preloadWrapUpAssets(months = ALL_MONTHS, options = {}) {
  const { assetBaseUrl } = options;
  const sprites = months.flatMap(monthAssets).map((name) => assetBaseUrl ? `${assetBaseUrl}${name}.png` : ASSET_URLS[name]);
  return preloadImages([heartUrl(assetBaseUrl), ...sprites]);
}
export {
  preloadWrapUpAssets
};
