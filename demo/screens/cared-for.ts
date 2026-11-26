import { mountCaredForCard, type CaredForPerson } from '../../src';
import { pick, randomInt, type DemoScreen } from '../screen';
import { mountVideo } from '../video';

let people: CaredForPerson[] = [{ name: 'Rosa', visits: 214 }];
let since = '2026-03-04';

const NAMES = ['Rosa', 'Daniel', 'Eleanor', 'Walter', 'Joe', 'Guadalupe', 'Margaret', 'Maximiliano', 'Bernadette'];
const arc = new URL('../assets/screens/08/arc.svg', import.meta.url).href;

function randomPeople(count: number): CaredForPerson[] {
  const names = [...NAMES].sort(() => Math.random() - 0.5).slice(0, count);
  return names.map((name) => ({ name, visits: Math.random() < 0.25 ? randomInt(900, 1250) : randomInt(12, 190) })).sort((a, b) => b.visits - a.visits);
}

/** The animator's video of the arch card with the two hands, with a transparent background. It plays once. */
const HANDS = {
  hevc: new URL('../../video/08-cared-for-hands.mov', import.meta.url).href,
  webm: new URL('../../video/08-cared-for-hands.webm', import.meta.url).href,
};
/**
 * The picture is 760 x 1000 px, 3 per Figma px, cut like the door of 03: the 210 x 270 arch card (left 75, top 33
 * of the 360 x 360 frame) starts about 65 px inside it, which leaves room for the shadow. Measured against Figma.
 */
const HANDS_BOX = { x: 53.33, y: 426.67 - 415, width: 760 / 3, height: 1000 / 3 };

export const caredForScreen: DemoScreen = {
  id: '08',
  label: '08 Who you cared for · CaredForCard',
  step: 7,
  frame: { width: 360, height: 360 },
  cardBox: { left: 0, top: 415, right: 0, bottom: 7 },

  render({ layers, controls, rerender, replay }) {
    const data = { people, since };
    // The names go into the headline; the shell puts this slot where the first headline row is.
    const namesSlot = document.createElement('div');
    const card = mountCaredForCard({ names: namesSlot, sticker: layers.card }, data, { onComplete: replay });
    const hands = mountVideo(HANDS, HANDS_BOX);

    const update = (next: CaredForPerson[]) => {
      people = next;
      rerender();
    };
    controls.buttons([
      { label: '1 person', pressed: people.length === 1, onClick: () => update([{ name: 'Rosa', visits: 214 }]) },
      {
        label: '2 people',
        pressed: people.length === 2,
        onClick: () =>
          update([
            { name: 'Rosa', visits: 152 },
            { name: 'Daniel', visits: 62 },
          ]),
      },
      { label: '3 people', pressed: people.length === 3, onClick: () => update(randomPeople(3)) },
      { label: 'Random user', onClick: () => update(randomPeople(pick([1, 1, 2, 2, 3]))) },
    ]);
    controls.date('First visit (sticker for 1 person)', since, (value) => {
      if (!value) return;
      since = value;
      rerender();
    });

    const total = people.reduce((sum, person) => sum + person.visits, 0);
    const single = people.length === 1;
    return {
      backdrop: {
        background: ['#e9deff', '#f5f2ef'],
        arc: {
          src: arc,
          left: -86,
          top: -21,
          size: 550,
          rotate: -90,
          flipY: true,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#023620', color: '#d7e4c9' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#023620',
        bodyColor: '#27272a',
      },
      copy: {
        tag: 'You were there for',
        rows: [
          { text: '', highlighted: false, node: namesSlot },
          ...(single ? [{ text: `${total.toLocaleString('en-US')} visits together`, highlighted: false }] : []),
        ],
        body: single
          ? 'A familiar face at the door, all year long.'
          : `${total.toLocaleString('en-US')} visits between them, and you were there for every one.`,
      },
      parts: [card, hands],
      duration: card.duration,
      data,
      // The arch card with the hands is the animator's video; the sticker stays above it.
      stills: [{ element: hands.element, ...HANDS_BOX, behind: true }],
      destroy() {
        card.destroy();
        hands.destroy();
      },
    };
  },
};
