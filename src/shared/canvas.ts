/** Small canvas helpers that also work in WebViews without the newest canvas APIs. */

/** Adds a rounded rectangle to the current path (`roundRect` is missing before Safari 16). */
export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/** Draws left-aligned text with letter spacing, glyph by glyph (canvas `letterSpacing` is too new to rely on). */
export function fillSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
): void {
  if (letterSpacing === 0) {
    context.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const glyph of text) {
    context.fillText(glyph, cursor, y);
    cursor += context.measureText(glyph).width + letterSpacing;
  }
}
