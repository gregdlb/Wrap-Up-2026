import { fillSpacedText, roundedRect } from '../shared/canvas';
import { createCardShell, element, place } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../shared/counter';
import { ensureStyles } from '../shared/styles';
import { keepTogether } from '../shared/text';
import { LOGO } from './logo';

export interface ThankYouCardData {
  /** The caregiver's first name, for the headline of the share image: "Maria’s year in care". */
  name: string;
  /** Day of the first visit as `YYYY-MM-DD`, for the footer of the share image: "Caring for Rosa since March 4". */
  since: string;
  /** Visits completed in the year. */
  visits: number;
  /**
   * First name of the person cared for: "visits with Rosa". Without it the line is just "visits",
   * and the share image has no "Caring for … since …" line.
   */
  personName?: string;
  /** Hours of care in the year. */
  hours: number;
  /** The same hours in full 24 h days, for the small title of the hours tile. */
  fullDays: number;
  /** Length of the streak of weeks with a visit. */
  weeksInARow: number;
  /** Name of the clock-in personality as it should read: "The Early Bird". */
  personality: string;
  /** Time for the line under the personality: "5:48 AM". */
  earliestClockIn: string;
}

export interface ThankYouCardLabels {
  youWereThere: string;
  visit: string;
  visits: string;
  /** Word before the person's name. */
  with: string;
  /** Title of the hours tile; `{days}` is filled in. */
  fullDays: string;
  hours: string;
  weeks: string;
  inARow: string;
  personalityTitle: string;
  /** Line under the personality; `{time}` is filled in. Replace it for personalities that are not about a time. */
  personalityNote: string;
  /** Share image: the tag in the top right corner. */
  shareTag: string;
  /** Share image: the headline; `{name}` is filled in. */
  shareTitle: string;
  /** Share image: bottom left. */
  shareSite: string;
  /** Share image: bottom right; `{name}` (the person cared for) and `{date}` are filled in. */
  shareSince: string;
}

export interface ThankYouCardOptions extends WrapUpOptions {
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<ThankYouCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
}

export interface ThankYouExportOptions {
  /** Pixels per Figma px. Defaults to 3, which gives a 1080 x 1920 image (9:16). */
  scale?: number;
}

export interface ThankYouCardController extends WrapUpController {
  /**
   * Renders the share image, the Figma frame "Base / 11 Share image" (9:16): the Brevy logo and the
   * "Wrap Up 2026" tag, the headline with the caregiver's name, the four tiles with their final numbers,
   * and the footer. No buttons, and nothing about pay. Resolves with a PNG blob for `@capacitor/share`.
   */
  exportImage(options?: ThankYouExportOptions): Promise<Blob>;
}

const DEFAULT_LABELS: ThankYouCardLabels = {
  youWereThere: 'You were there',
  visit: 'visit',
  visits: 'visits',
  with: 'with',
  fullDays: '{days} full days',
  hours: 'hours',
  weeks: 'Weeks',
  inARow: 'in a row',
  personalityTitle: 'Your clock-in personality',
  personalityNote: 'Earliest clock-in at {time}',
  shareTag: 'Wrap Up 2026',
  shareTitle: '{name}’s year in care',
  shareSite: 'brevy.com',
  shareSince: 'Caring for {name} since {date}',
};

/** The Figma "Tiles" frame. */
const FRAME = { width: 328, height: 416 };

/**
 * The share image, Figma frame "Base / 11 Share image": 360 x 640 (9:16), exported at 3x as 1080 x 1920.
 * Everything keeps a 20 px side margin; the tiles are the card's tiles scaled down to that width.
 */
const SHARE = {
  width: 360,
  height: 640,
  margin: 20,
  scale: 3,
  // The logo at its own proportions, placed so that the wordmark is where Figma has it, level with the tag.
  logo: { x: 20, y: 22 },
  tag: { top: 26, paddingX: 12, paddingY: 6, font: 'sans', weight: 600, size: 12 },
  title: { x: 20, y: 94, width: 320, font: 'serif', weight: 400, size: 32, lineHeight: 1.05 },
  tiles: { x: 20, y: 148, width: 320 },
  footer: { y: 599, font: 'sans', weight: 500, size: 13 },
} as const;

/** Seconds from `play()`: tiles pop in from 0.4 s, 120 ms apart; the numbers count up until 1.6 s. */
const TIMING = { tiles: { at: 0.4, duration: 0.4, stagger: 0.12 }, counter: { at: 0.5, endAt: 1.6 } };

interface Color {
  token: string;
  hex: string;
}

const COLORS = {
  background: { token: '--emerald-500', hex: '#023620' },
  logo: { token: '--olive-300', hex: '#dce7cf' },
  title: { token: '--beige-50', hex: '#fefdfc' },
  brand: { token: '--brand-500', hex: '#066e3d' },
  olive200: { token: '--olive-200', hex: '#e6eedc' },
  olive300: { token: '--olive-300', hex: '#dce7cf' },
  violet400: { token: '--violet-400', hex: '#d8c8fd' },
  violet900: { token: '--violet-900', hex: '#5e528c' },
  yellow300: { token: '--yellow-300', hex: '#fbd48a' },
  orange900: { token: '--orange-900', hex: '#6f3313' },
  emerald: { token: '--emerald-500', hex: '#023620' },
} satisfies Record<string, Color>;

interface TextSpec {
  /** Lines are separated by "\n". */
  text: string;
  x: number;
  y: number;
  font: 'sans' | 'serif';
  weight: number;
  size: number;
  /** Multiple of the font size; null is the font's normal line height. */
  lineHeight: number | null;
  letterSpacing: number;
  uppercase?: boolean;
  /** Set on numbers: the value the text counts up to. */
  countTo?: number;
}

interface TileSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  background: Color;
  color: Color;
  texts: TextSpec[];
}

const cssColor = ({ token, hex }: Color) => `var(${token}, ${hex})`;

const STYLES = /* css */ `
.wu-thank-you-card__tile {
  overflow: hidden;
  border-radius: calc(20 * var(--wu-u));
  transform: scale(var(--wu-pop, 1));
}

.wu-thank-you-card__text {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  white-space: pre;
}

.wu-thank-you-card__text--serif {
  font-family: var(--wu-font-serif, 'Hedvig Letters Serif', Georgia, serif);
}
`;

const SMALL_TITLE = { font: 'sans', weight: 600, size: 10, lineHeight: null, letterSpacing: 0.8, uppercase: true } as const;
const SMALL_NOTE = { font: 'sans', weight: 500, size: 12, lineHeight: null, letterSpacing: 0 } as const;

interface Fonts {
  sans: string;
  serif: string;
}

function fontOf(spec: Pick<TextSpec, 'font' | 'weight' | 'size'>, fonts: Fonts, size = spec.size): string {
  return `${spec.weight} ${size}px ${fonts[spec.font]}`;
}

/** Text may run this much past its column before it is set smaller: "1,011" in Figma fills its tile to the px. */
const FIT_TOLERANCE = 1.05;

/** Largest size up to `spec.size` at which the text still fits `maxWidth` (letter spacing scales along). */
function fitSize(spec: Omit<TextSpec, 'x' | 'y'>, maxWidth: number, fonts: Fonts): number {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return spec.size;
  context.font = fontOf(spec, fonts);
  const width = context.measureText(spec.text).width + spec.letterSpacing * spec.text.length;
  return width <= maxWidth * FIT_TOLERANCE ? spec.size : Math.floor((spec.size * maxWidth) / width);
}

/** The four tiles as laid out in Figma, filled with the user's data. Drives both the DOM and the share image. */
function createTiles(data: ThankYouCardData, labels: ThankYouCardLabels, format: (value: number) => string, fonts: Fonts): TileSpec[] {
  const visits = Math.max(0, Math.round(data.visits));
  const hours = Math.max(0, Math.round(data.hours));
  const weeks = Math.max(0, Math.round(data.weeksInARow));
  const name = data.personName?.trim();
  const visitsLabel = visits === 1 ? labels.visit : labels.visits;

  /** A number set as large as Figma has it, or smaller when it has more digits than the tile is wide. */
  const number = (value: number, x: number, y: number, size: number, tracking: number, lineHeight: number | null, maxWidth: number): TextSpec => {
    const spec = { text: format(value), font: 'sans', weight: 800, size, lineHeight, letterSpacing: size * tracking } as const;
    const fitted = fitSize(spec, maxWidth, fonts);
    return { ...spec, x, y: y + (size - fitted), size: fitted, letterSpacing: fitted * tracking, countTo: value };
  };
  const personality = { text: data.personality, font: 'serif', weight: 400, size: 34, lineHeight: null, letterSpacing: 0 } as const;

  // "visits / with Rosa": a long name is set smaller so the line stays inside the tile, on the same last baseline.
  const withLines = name ? [visitsLabel, `${labels.with} ${name}`] : [visitsLabel];
  const withSpec = { font: 'serif', weight: 400, size: 24, lineHeight: 1.1, letterSpacing: 0 } as const;
  const withSize = Math.min(...withLines.map((line) => fitSize({ ...withSpec, text: line }, 164, fonts)));
  const withName: TextSpec = {
    ...withSpec,
    text: withLines.join('\n'),
    size: withSize,
    x: 16,
    y: 208 + (withSpec.size - withSize) * withSpec.lineHeight * withLines.length,
  };

  return [
    {
      x: 0,
      y: 0,
      width: 196,
      height: 276,
      background: COLORS.brand,
      color: COLORS.olive200,
      texts: [
        { ...SMALL_TITLE, text: labels.youWereThere, x: 16, y: 16 },
        number(visits, 12, 112, 96, -0.02, 1, 172),
        withName,
      ],
    },
    {
      x: 204,
      y: 0,
      width: 124,
      height: 134,
      background: COLORS.violet400,
      color: COLORS.violet900,
      texts: [
        { ...SMALL_TITLE, text: keepTogether(labels.fullDays.replace('{days}', format(data.fullDays))), x: 16, y: 16 },
        number(hours, 16, 50, 40, -0.04, null, 92),
        { ...SMALL_NOTE, text: labels.hours, x: 16, y: 102 },
      ],
    },
    {
      x: 204,
      y: 142,
      width: 124,
      height: 134,
      background: COLORS.yellow300,
      color: COLORS.orange900,
      texts: [
        { ...SMALL_TITLE, text: labels.weeks, x: 16, y: 16 },
        number(weeks, 16, 50, 40, -0.04, null, 92),
        { ...SMALL_NOTE, text: labels.inARow, x: 16, y: 102 },
      ],
    },
    {
      x: 0,
      y: 284,
      width: 328,
      height: 132,
      background: COLORS.olive300,
      color: COLORS.emerald,
      texts: [
        { ...SMALL_TITLE, text: labels.personalityTitle, x: 16, y: 16 },
        { ...personality, x: 16, y: 56, size: fitSize(personality, 296, fonts) },
        { ...SMALL_NOTE, text: keepTogether(labels.personalityNote.replace('{time}', data.earliestClockIn)), x: 16, y: 100 },
      ],
    },
  ];
}

function renderText(spec: TextSpec): HTMLElement {
  const node = element(`wu-thank-you-card__text wu-thank-you-card__text--${spec.font}`, spec.text);
  node.style.setProperty('--x', String(spec.x));
  node.style.setProperty('--y', String(spec.y));
  Object.assign(node.style, {
    fontSize: `calc(${spec.size} * var(--wu-u))`,
    fontWeight: String(spec.weight),
    lineHeight: spec.lineHeight === null ? 'normal' : String(spec.lineHeight),
    letterSpacing: `calc(${spec.letterSpacing} * var(--wu-u))`,
    textTransform: spec.uppercase ? 'uppercase' : 'none',
  });
  return node;
}

/** Paints a tile's text on the canvas the way CSS lays it out: lines from the top of their line boxes. */
function drawText(context: CanvasRenderingContext2D, spec: TextSpec, originX: number, originY: number, fonts: Fonts) {
  context.font = fontOf(spec, fonts);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  const metrics = context.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
  const lineHeight = spec.lineHeight === null ? ascent + descent : spec.lineHeight * spec.size;
  const firstBaseline = originY + spec.y + (lineHeight - (ascent + descent)) / 2 + ascent;

  spec.text.split('\n').forEach((line, index) => {
    const text = spec.uppercase ? line.toUpperCase() : line;
    fillSpacedText(context, text, originX + spec.x, firstBaseline + lineHeight * index, spec.letterSpacing);
  });
}

/** The texts of the share image that are not on the tiles. */
interface ShareTexts {
  tag: string;
  /** Empty when the caregiver's name is missing. */
  title: string;
  site: string;
  /** Empty when the person's name or the day of the first visit is missing. */
  since: string;
}

/** Reads `YYYY-MM-DD` as a calendar day and prints it like "March 4". */
function formatDay(date: string | undefined, locale: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(day);
}

function shareTexts(data: ThankYouCardData, labels: ThankYouCardLabels, locale: string): ShareTexts {
  const name = data.name?.trim();
  const person = data.personName?.trim();
  const since = formatDay(data.since, locale);
  return {
    tag: labels.shareTag,
    title: name ? labels.shareTitle.replace('{name}', name) : '',
    site: labels.shareSite,
    since: person && since ? keepTogether(labels.shareSince.replace('{name}', person).replace('{date}', since)) : '',
  };
}

async function renderShareImage(tiles: TileSpec[], texts: ShareTexts, root: HTMLElement, fonts: Fonts, scale: number): Promise<Blob> {
  const { margin, logo, tag, title, footer } = SHARE;
  const line = { lineHeight: null, letterSpacing: 0 } as const;
  const tagText = { ...line, text: texts.tag, font: tag.font, weight: tag.weight, size: tag.size };
  const titleText = { text: texts.title, font: title.font, weight: title.weight, size: title.size, lineHeight: title.lineHeight, letterSpacing: 0 };
  const footerText = { ...line, font: footer.font, weight: footer.weight, size: footer.size };

  // The canvas can only use fonts that are loaded; ask for the ones in the image and carry on if one is missing.
  const faces = [...tiles.flatMap((tile) => tile.texts), tagText, titleText, footerText].map((text) => fontOf(text, fonts));
  await Promise.all([...new Set(faces)].map((face) => document.fonts.load(face).catch(() => undefined)));

  const style = getComputedStyle(root);
  const paint = ({ token, hex }: Color) => style.getPropertyValue(token).trim() || hex;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(SHARE.width * scale);
  canvas.height = Math.round(SHARE.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('ThankYouCard: this browser cannot draw the share image');
  context.scale(scale, scale);
  const right = SHARE.width - margin;
  const widthOf = (text: Pick<TextSpec, 'text' | 'font' | 'weight' | 'size'>) => {
    context.font = fontOf(text, fonts);
    return context.measureText(text.text).width;
  };

  context.fillStyle = paint(COLORS.background);
  context.fillRect(0, 0, SHARE.width, SHARE.height);

  context.save();
  context.translate(logo.x, logo.y);
  context.fillStyle = paint(COLORS.logo);
  LOGO.paths.forEach((path) => context.fill(new Path2D(path)));
  context.restore();

  // The tag hugs its text and ends at the right margin.
  context.font = fontOf(tagText, fonts);
  const tagMetrics = context.measureText('Hg');
  const tagLine = (tagMetrics.fontBoundingBoxAscent ?? tagMetrics.actualBoundingBoxAscent) + (tagMetrics.fontBoundingBoxDescent ?? tagMetrics.actualBoundingBoxDescent);
  const tagWidth = widthOf(tagText) + tag.paddingX * 2;
  const tagHeight = tagLine + tag.paddingY * 2;
  context.fillStyle = paint(COLORS.olive300);
  context.beginPath();
  roundedRect(context, right - tagWidth, tag.top, tagWidth, tagHeight, tagHeight / 2);
  context.fill();
  context.fillStyle = paint(COLORS.emerald);
  drawText(context, { ...tagText, x: right - tagWidth + tag.paddingX, y: tag.top + tag.paddingY }, 0, 0, fonts);

  // One line, as in Figma; a long name is set smaller so it still fits the width.
  if (texts.title) {
    context.fillStyle = paint(COLORS.title);
    const size = fitSize(titleText, title.width / FIT_TOLERANCE, fonts);
    drawText(context, { ...titleText, size, x: title.x, y: title.y + (title.size - size) }, 0, 0, fonts);
  }

  // The card's tiles, 328 px wide, scaled to the image's 320 px column.
  const tileScale = SHARE.tiles.width / FRAME.width;
  context.save();
  context.translate(SHARE.tiles.x, SHARE.tiles.y);
  context.scale(tileScale, tileScale);
  for (const tile of tiles) {
    context.save();
    context.fillStyle = paint(tile.background);
    context.beginPath();
    roundedRect(context, tile.x, tile.y, tile.width, tile.height, 20);
    context.fill();
    // Like the tile on screen, it cuts off text that is too long for it.
    context.clip();
    context.fillStyle = paint(tile.color);
    tile.texts.forEach((text) => drawText(context, text, tile.x, tile.y, fonts));
    context.restore();
  }
  context.restore();

  context.fillStyle = paint(COLORS.olive300);
  drawText(context, { ...footerText, text: texts.site, x: margin, y: footer.y }, 0, 0, fonts);
  if (texts.since) {
    const since = { ...footerText, text: texts.since };
    const room = right - margin - widthOf({ ...footerText, text: texts.site }) - 16;
    const size = fitSize(since, room / FIT_TOLERANCE, fonts);
    drawText(context, { ...since, size, x: right - widthOf({ ...since, size }), y: footer.y + (footer.size - size) }, 0, 0, fonts);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('ThankYouCard: could not encode the share image'))), 'image/png');
  });
}

/**
 * Mounts the 11 "Thank you" tiles into `el` and scales them to fit that element.
 * The controller's `exportImage()` renders the same tiles as the image to share.
 */
export function mountThankYouCard(
  el: HTMLElement,
  data: ThankYouCardData,
  options: ThankYouCardOptions = {},
): ThankYouCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));

  ensureStyles('thank-you-card', STYLES);
  const shell = createCardShell(el, { className: 'wu-thank-you-card', frame: FRAME, maxScale });
  const rootStyle = getComputedStyle(shell.root);
  const fonts: Fonts = {
    sans: rootStyle.fontFamily,
    serif: rootStyle.getPropertyValue('--wu-font-serif').trim() || "'Hedvig Letters Serif', Georgia, serif",
  };
  const tiles = createTiles(data, labels, format, fonts);
  const timeline = holdTimeline(SCREEN_SECONDS);

  const nodes = tiles.map((tile) => {
    const node = place(element('wu-thank-you-card__tile'), { x: tile.x, y: tile.y, w: tile.width, h: tile.height });
    node.style.background = cssColor(tile.background);
    node.style.color = cssColor(tile.color);
    for (const text of tile.texts) {
      const textNode = renderText(text);
      node.append(textNode);
      if (text.countTo !== undefined) {
        const { at, endAt } = TIMING.counter;
        addCounter(timeline, textNode, text.countTo, { at, duration: endAt - at, format });
      }
    }
    return node;
  });
  shell.stage.append(...nodes);

  const { at, duration, stagger } = TIMING.tiles;
  timeline
    .fromTo(nodes, { '--wu-pop': 0.9 }, { '--wu-pop': 1, duration, ease: 'back.out(1.6)', stagger }, at)
    .fromTo(nodes, { opacity: 0 }, { opacity: 1, duration: duration * 0.6, ease: 'power1.out', stagger }, at);

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, 'exportImage', {
    value: (exportOptions: ThankYouExportOptions = {}) =>
      renderShareImage(tiles, shareTexts(data, labels, locale), shell.root, fonts, exportOptions.scale ?? SHARE.scale),
    enumerable: true,
  }) as ThankYouCardController;

  if (autoplay) card.play();
  return card;
}
