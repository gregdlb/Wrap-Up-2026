/** Stand-ins for animator layers that are not a single image. Demo only. */

interface ArchConfig {
  image: string;
  /** Box of the image inside the 210 x 270 arch card, in px. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Second fade along the left edge, as on screen 08. */
  fadeLeft?: boolean;
}

/** The arch card of screens 03 and 08: the frame the animator's MP4 plays in, here with a still image. */
function arch({ image, fadeLeft, ...box }: ArchConfig): HTMLElement {
  const card = document.createElement('div');
  card.className = 'demo-arch';
  const picture = document.createElement('img');
  picture.alt = '';
  picture.src = image;
  Object.assign(picture.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });
  const fade = document.createElement('div');
  fade.className = 'demo-arch__fade';
  card.append(picture, fade);
  if (fadeLeft) {
    const side = document.createElement('div');
    side.className = 'demo-arch__fade-left';
    card.append(side);
  }
  return card;
}

const door = new URL('./assets/screens/03/door.png', import.meta.url).href;
const hands = new URL('./assets/screens/08/hands.png', import.meta.url).href;

/** Screen 03: the closed door. */
export function archDoor(): HTMLElement {
  return arch({ image: door, left: 0, top: 34, width: 210, height: 236 });
}

/** Screen 08: the two hands. */
export function archHands(): HTMLElement {
  return arch({ image: hands, left: -20, top: 26, width: 250, height: 250, fadeLeft: true });
}

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

const summitImage = new URL('./assets/screens/10/summit.png', import.meta.url).href;

/** Screen 10: the watercolor summit behind the card. The PNG is transparent and feathered on every side. */
export function summit(): HTMLElement {
  const scene = document.createElement('div');
  scene.className = 'demo-summit';
  const image = document.createElement('img');
  image.alt = '';
  image.src = summitImage;
  scene.append(image);
  return scene;
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
