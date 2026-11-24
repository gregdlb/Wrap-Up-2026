import { ensureStyles } from '../shared/styles';

/** Which screen the button sits on: the light ones, or the dark emerald ones (09, 10, 11). */
export type SoundButtonTone = 'light' | 'dark';

export interface SoundButtonLabels {
  /** Name of the button for screen readers. Its pressed state says whether the music is muted. */
  mute: string;
}

export interface SoundButtonOptions {
  /** State to start in. Defaults to false: the music plays. */
  muted?: boolean;
  /** Fill and icon color, the same as the Close button of the screen. Defaults to "light". */
  tone?: SoundButtonTone;
  /**
   * Called with the new state when the user taps the button (or `toggle()` is called).
   * Mute or unmute the app's music here. `setMuted()` does not call it.
   */
  onChange?: (muted: boolean) => void;
  labels?: Partial<SoundButtonLabels>;
}

export interface SoundButtonController {
  /** Whether the music is muted right now. */
  readonly muted: boolean;
  /** Shows the given state without calling `onChange`: for when the app changes the music by itself. */
  setMuted(muted: boolean): void;
  /** Switches the state, like a tap: the icon changes and `onChange` is called. */
  toggle(): void;
  /** Switches fill and icon color when the story moves to a screen of the other kind. */
  setTone(tone: SoundButtonTone): void;
  /** Removes the button from the host element. */
  destroy(): void;
}

const DEFAULT_LABELS: SoundButtonLabels = { mute: 'Mute music' };

/**
 * Figma "Sound button": a 36 px round button like Close, with an 18 px icon.
 * The header is set in px, so one unit is 1 px, or `--wu-unit` when the host scales its header.
 * The class is doubled in the selectors so that an app's own rules for `button` (sizes, borders,
 * pressed states) do not reach it.
 */
const STYLES = /* css */ `
.wu-sound-button.wu-sound-button {
  --wu-u: var(--wu-unit, 1px);

  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: calc(36 * var(--wu-u));
  height: calc(36 * var(--wu-u));
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: calc(18 * var(--wu-u));
  box-shadow: none;
  font: inherit;
  line-height: 1;
  background: var(--wu-sound-fill, rgba(254, 253, 252, 0.7));
  color: var(--wu-sound-icon, var(--emerald-500, #023620));
  -webkit-backdrop-filter: blur(calc(6 * var(--wu-u)));
  backdrop-filter: blur(calc(6 * var(--wu-u)));
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  appearance: none;
}

.wu-sound-button.wu-sound-button--dark {
  background: var(--wu-sound-fill, rgba(254, 253, 252, 0.15));
  color: var(--wu-sound-icon, var(--beige-50, #fefdfc));
}

/* The finger gets 44 px to hit; the button looks the same. */
.wu-sound-button::before {
  content: '';
  position: absolute;
  inset: calc(-4 * var(--wu-u));
}

.wu-sound-button.wu-sound-button:focus-visible {
  outline: calc(2 * var(--wu-u)) solid currentColor;
  outline-offset: calc(2 * var(--wu-u));
}

.wu-sound-button__icon {
  display: block;
  width: calc(18 * var(--wu-u));
  height: calc(18 * var(--wu-u));
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}

.wu-sound-button__muted,
.wu-sound-button--muted .wu-sound-button__unmuted {
  display: none;
}

.wu-sound-button--muted .wu-sound-button__muted {
  display: inline;
}
`;

/** Figma icons "volume-2" and "volume-x" on an 18 px grid: the speaker, then its waves or its cross. */
const ICON = /* html */ `
<svg class="wu-sound-button__icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
  <path d="M8.25 3.75L4.5 6.75H1.5V11.25H4.5L8.25 14.25V3.75Z" />
  <g class="wu-sound-button__unmuted">
    <path d="M11.655 6.345C12.358 7.04823 12.7529 8.00188 12.7529 8.99625C12.7529 9.99062 12.358 10.9443 11.655 11.6475" />
    <path d="M14.3025 3.6975C15.7085 5.10396 16.4984 7.01127 16.4984 9C16.4984 10.9887 15.7085 12.896 14.3025 14.3025" />
  </g>
  <g class="wu-sound-button__muted">
    <path d="M16.5 6.75L12 11.25" />
    <path d="M12 6.75L16.5 11.25" />
  </g>
</svg>`;

/**
 * Mounts the mute / unmute button of the story's header into `el`: left of Close, 8 px apart.
 * It only shows and reports the state; the music itself is the app's.
 */
export function mountSoundButton(el: HTMLElement, options: SoundButtonOptions = {}): SoundButtonController {
  const { onChange } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  let muted = options.muted === true;
  let destroyed = false;

  ensureStyles('sound-button', STYLES);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wu-sound-button';
  button.setAttribute('aria-label', labels.mute);
  button.innerHTML = ICON;

  const show = () => {
    button.classList.toggle('wu-sound-button--muted', muted);
    button.setAttribute('aria-pressed', String(muted));
    button.dataset.state = muted ? 'muted' : 'unmuted';
  };
  const setTone = (tone: SoundButtonTone) => button.classList.toggle('wu-sound-button--dark', tone === 'dark');
  const toggle = () => {
    if (destroyed) return;
    muted = !muted;
    show();
    onChange?.(muted);
  };

  // The header sits on top of the story: a tap on the button must not also turn the page.
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });
  button.addEventListener('pointerdown', (event) => event.stopPropagation());

  show();
  setTone(options.tone ?? 'light');
  el.append(button);

  return {
    get muted() {
      return muted;
    },
    setMuted(next) {
      if (destroyed || muted === next) return;
      muted = next;
      show();
    },
    toggle,
    setTone,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      button.remove();
    },
  };
}
