import monthsJson from './months.json';
import type { Backdrop } from './screen';

/** Per-month look of screen 05, extracted from Figma (section "05 Busiest month · all months"). Demo only. */
interface FigmaColor {
  token: string | null;
  hex: string;
}

interface MonthLook {
  month: string;
  background: { from: FigmaColor; to: FigmaColor };
  arc: {
    src: string;
    outer: { left: number; top: number; width: number; height: number };
    rotate: number;
    inset: { top: string; right: string; bottom: string; left: string };
  };
  tag: { bg: FigmaColor; color: FigmaColor };
  highlight: { bg: FigmaColor; color: FigmaColor };
  headline: { color: FigmaColor };
  body: { color: FigmaColor };
}

const MONTH_LOOKS = monthsJson as unknown as MonthLook[];

const arcUrls = import.meta.glob<string>('./assets/months/**/*.svg', { eager: true, query: '?url', import: 'default' });

export const MONTH_NAMES = MONTH_LOOKS.map((look) => look.month);

/** Background, arc and text colors of screen 05 for a month, 0 = January. */
export function monthBackdrop(monthIndex: number): Backdrop {
  const look = MONTH_LOOKS[monthIndex]!;
  return {
    background: [look.background.from.hex, look.background.to.hex],
    arc: {
      src: arcUrls[`./${look.arc.src}`] ?? '',
      left: look.arc.outer.left,
      top: look.arc.outer.top,
      size: look.arc.outer.width,
      rotate: look.arc.rotate,
      inset: look.arc.inset,
    },
    tag: { bg: look.tag.bg.hex, color: look.tag.color.hex },
    highlight: { bg: look.highlight.bg.hex, color: look.highlight.color.hex },
    headlineColor: look.headline.color.hex,
    bodyColor: look.body.color.hex,
  };
}
