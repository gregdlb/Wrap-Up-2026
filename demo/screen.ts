/** What a demo screen provides to the shell. The shell owns the phone, header, progress bar, text, loop and Seek. */

export interface Size {
  width: number;
  height: number;
}

/** Background arc of a screen as placed in Figma (a rotated box with the arc drawing in one half of it). */
export interface ArcSpec {
  src: string;
  left: number;
  top: number;
  size: number;
  rotate: number;
  flipY?: boolean;
  inset: { top: string; right: string; bottom: string; left: string };
}

/** Colors of the host's part of a screen, hex values from Figma. */
export interface Backdrop {
  background: [from: string, to: string];
  arc: ArcSpec | null;
  tag: { bg: string; color: string };
  highlight: { bg: string; color: string };
  headlineColor: string;
  bodyColor: string;
  /** Dark screen: the shell switches the logo, close button and progress bar to their light versions. */
  dark?: boolean;
}

export interface ScreenCopyRow {
  text: string;
  highlighted: boolean;
  node?: HTMLElement;
  /** A row made of several pieces side by side, e.g. "Your [2026] pay". Replaces `text`. */
  parts?: { text: string; highlighted: boolean }[];
}

export interface ScreenCopy {
  tag: string;
  /**
   * Headline rows; a highlighted row gets the marker box behind it.
   * A row with `node` is a slot in the headline that a component draws into (the names of screen 08).
   */
  rows: ScreenCopyRow[];
  body: string;
  /** Width of the body paragraph in px when Figma narrows it. */
  bodyWidth?: number;
}

/**
 * A still image, an element or the video of the animator's layers, placed in the card's Figma frame. Context only.
 * Images are PNGs with a transparent background, drawn with normal blending.
 */
export interface Still {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  /** Under the card instead of over it. */
  behind?: boolean;
  opacity?: number;
  image?: string;
  /** For stills that are not a single image, e.g. a sticker. Built at Figma size; the shell scales it. */
  node?: () => HTMLElement;
  /** A layer the screen keeps and plays itself: the animator's video. At Figma size, scaled like `node`, never rebuilt. */
  element?: HTMLElement;
}

/** Anything the shell can run together with the screen. */
export interface Playable {
  /** When the component's images are in. The shell shows the screen once all parts are ready. */
  ready?: Promise<void>;
  play(): void;
  pause(): void;
  seek(t: number): void;
}

export interface ScreenLayers {
  /** Covers the screen, under the header, text and card. */
  back: HTMLElement;
  /** The container the app gives the card. */
  card: HTMLElement;
  /** Covers the screen, above everything. Ignores taps unless a component needs them. */
  front: HTMLElement;
}

export interface ScreenView {
  backdrop: Backdrop;
  copy: ScreenCopy;
  /** Components to play, pause and seek with the screen. */
  parts: Playable[];
  /** Screen length in seconds, from the card's `duration`. */
  duration: number;
  /** Shown in the panel: what was passed to the component. */
  data: unknown;
  /** Shown next to "Variant", when the component derives one. */
  note?: string;
  stills?: Still[];
  /** False for screens that wait for the user (the scratch card): the shell then does not loop. */
  loops?: boolean;
  destroy(): void;
}

export interface ScreenContext {
  layers: ScreenLayers;
  controls: Controls;
  /** Rebuilds the screen after the sample data changed. */
  rerender(): void;
  /** Plays the screen from the start; pass it to the card's `onComplete` to loop. */
  replay(): void;
  /** Swaps the screen's text while it is shown, e.g. after the pay card is revealed. */
  updateCopy(copy: ScreenCopy): void;
}

export interface DemoScreen {
  id: string;
  label: string;
  /** Which of the 12 progress segments is the current one, 0-based. */
  step: number;
  /** The card's Figma frame and where its container sits on the 782 px tall Figma screen. */
  frame: Size;
  cardBox: { left: number; top: number; right: number; bottom: number };
  render(context: ScreenContext): ScreenView;
}

export interface Controls {
  select(label: string, options: { value: string; label: string }[], value: string, onChange: (value: string) => void): void;
  buttons(items: { label: string; pressed?: boolean; onClick: () => void }[]): void;
  number(label: string, value: number, range: { min: number; max: number; step?: number }, onChange: (value: number) => void): void;
  text(label: string, value: string, onChange: (value: string) => void): void;
  date(label: string, value: string, onChange: (value: string) => void): void;
  /** Adds any element to the panel, e.g. a preview. */
  custom(node: HTMLElement): void;
}

/** Builds the per-screen data switches inside `panel`. They are rebuilt on every render. */
export function createControls(panel: HTMLElement): Controls {
  panel.replaceChildren();

  const field = (label: string, input: HTMLElement) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const caption = document.createElement('span');
    caption.textContent = label;
    wrapper.append(caption, input);
    panel.append(wrapper);
  };

  const input = (type: string, label: string, value: string, onChange: (value: string) => void) => {
    const node = document.createElement('input');
    node.type = type;
    node.value = value;
    node.addEventListener('change', () => onChange(node.value));
    field(label, node);
    return node;
  };

  return {
    select(label, options, value, onChange) {
      const node = document.createElement('select');
      node.replaceChildren(...options.map((option) => new Option(option.label, option.value)));
      node.value = value;
      node.addEventListener('change', () => onChange(node.value));
      field(label, node);
    },
    buttons(items) {
      const row = document.createElement('div');
      row.className = 'buttons';
      for (const item of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        if (item.pressed !== undefined) button.setAttribute('aria-pressed', String(item.pressed));
        button.addEventListener('click', item.onClick);
        row.append(button);
      }
      panel.append(row);
    },
    number(label, value, range, onChange) {
      const node = input('number', label, String(value), (text) => {
        const parsed = Number(text);
        if (Number.isFinite(parsed)) onChange(Math.min(Math.max(parsed, range.min), range.max));
      });
      node.min = String(range.min);
      node.max = String(range.max);
      node.step = String(range.step ?? 1);
    },
    text(label, value, onChange) {
      input('text', label, value, onChange);
    },
    date(label, value, onChange) {
      input('date', label, value, onChange);
    },
    custom(node) {
      panel.append(node);
    },
  };
}

export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}
