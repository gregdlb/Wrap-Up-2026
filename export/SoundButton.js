// src/shared/styles.ts
function ensureStyles(id, css) {
  if (document.querySelector(`style[data-wrap-up="${id}"]`))
    return;
  const style = document.createElement("style");
  style.dataset.wrapUp = id;
  style.textContent = css;
  document.head.append(style);
}

// src/sound-button/sound-button.ts
var DEFAULT_LABELS = { mute: "Mute music" };
var STYLES = `
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
var ICON = `
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
function mountSoundButton(el, options = {}) {
  const { onChange } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  let muted = options.muted === true;
  let destroyed = false;
  ensureStyles("sound-button", STYLES);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "wu-sound-button";
  button.setAttribute("aria-label", labels.mute);
  button.innerHTML = ICON;
  const show = () => {
    button.classList.toggle("wu-sound-button--muted", muted);
    button.setAttribute("aria-pressed", String(muted));
    button.dataset.state = muted ? "muted" : "unmuted";
  };
  const setTone = (tone) => button.classList.toggle("wu-sound-button--dark", tone === "dark");
  const toggle = () => {
    if (destroyed)
      return;
    muted = !muted;
    show();
    onChange?.(muted);
  };
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggle();
  });
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  show();
  setTone(options.tone ?? "light");
  el.append(button);
  return {
    get muted() {
      return muted;
    },
    setMuted(next) {
      if (destroyed || muted === next)
        return;
      muted = next;
      show();
    },
    toggle,
    setTone,
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      button.remove();
    }
  };
}
export {
  mountSoundButton
};
