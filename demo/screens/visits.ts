import { mountVisitsCount } from '../../src';
import { pick, randomInt, type DemoScreen } from '../screen';
import { archDoor } from '../stills';

let state = { visits: 214, personName: 'Rosa' };

const NAMES = ['Rosa', 'Eleanor', 'Walter', 'Margaret', 'Joe', 'Guadalupe', 'Maximiliano', 'Bernadette'];
const arc = new URL('../assets/screens/03/arc.svg', import.meta.url).href;

export const visitsScreen: DemoScreen = {
  id: '03',
  label: '03 Visits · VisitsCount',
  step: 2,
  frame: { width: 360, height: 360 },
  cardBox: { left: 0, top: 400, right: 0, bottom: 22 },

  render({ layers, controls, rerender, replay }) {
    const data = { ...state };
    const card = mountVisitsCount(layers.card, data, { onComplete: replay });

    const update = (next: Partial<typeof state>) => {
      state = { ...state, ...next };
      rerender();
    };
    controls.number('Visits', state.visits, { min: 0, max: 9999 }, (visits) => update({ visits }));
    controls.text('Person (empty = no sticker)', state.personName, (personName) => update({ personName }));
    controls.buttons([
      { label: 'Random user', onClick: () => update({ visits: Math.random() < 0.25 ? randomInt(1000, 1450) : randomInt(8, 420), personName: pick(NAMES) }) },
      { label: '1,011 visits', onClick: () => update({ visits: 1011 }) },
    ]);

    const perWeek = Math.max(1, Math.round(state.visits / 52));
    return {
      backdrop: {
        background: ['#fde9db', '#f8f5f2'],
        arc: {
          src: arc,
          left: -126,
          top: -21,
          size: 550,
          rotate: 90,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#023620', color: '#d7e4c9' },
        highlight: { bg: '#ddcefe', color: '#5e528c' },
        headlineColor: '#023620',
        bodyColor: '#27272a',
      },
      copy: {
        tag: 'Visits',
        rows: [
          { text: 'Same front door,', highlighted: false },
          { text: `${state.visits.toLocaleString('en-US')} times`, highlighted: true },
        ],
        body: `Visits completed in 2026.\nThat’s about ${perWeek} every week.`,
      },
      parts: [card],
      duration: card.duration,
      data,
      // The door in the arch is the animator's MP4.
      stills: [{ node: archDoor, x: 75, y: 40, width: 210, height: 270, behind: true }],
      destroy: () => card.destroy(),
    };
  },
};
