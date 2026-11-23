/** Adds a component's stylesheet to the document once, however many instances are mounted. */
export function ensureStyles(id: string, css: string): void {
  if (document.querySelector(`style[data-wrap-up="${id}"]`)) return;
  const style = document.createElement('style');
  style.dataset.wrapUp = id;
  style.textContent = css;
  document.head.append(style);
}
