/** Stand-ins for animator layers that are not a single image. Demo only. */

const lock = new URL('./assets/screens/09/lock.svg', import.meta.url).href;

/** Screen 09: the app's note under the pay card. */
export function privateNote(): HTMLElement {
  const note = document.createElement('div');
  note.className = 'demo-note';
  const icon = document.createElement('img');
  icon.alt = '';
  icon.src = lock;
  note.append(icon, 'Only you can see this. It’s never on your share card.');
  return note;
}

const shareIcon = new URL('./assets/screens/11/share.svg', import.meta.url).href;

/** Screen 11: the app's Share and Watch again buttons under the tiles. */
export function shareButtons(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'demo-buttons';
  const share = document.createElement('div');
  const icon = document.createElement('img');
  icon.alt = '';
  icon.src = shareIcon;
  share.append(icon, 'Share');
  const again = document.createElement('div');
  again.textContent = 'Watch again';
  row.append(share, again);
  return row;
}
