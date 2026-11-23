import { mountMoneyRain, mountPayCard } from '../../src';
import { randomInt, type DemoScreen, type ScreenCopy } from '../screen';
import { privateNote } from '../stills';

let state = { earned: 14860, paychecks: 26 };

const YEAR = 2026;
/** The card's timeline waits here for the scratch; later times show the revealed state. */
const WAIT_AT = 1;
const arc = new URL('../assets/screens/09/arc.svg', import.meta.url).href;
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** The app changes the headline once the amount is revealed, as in the two Figma screens. */
function copyFor(revealed: boolean): ScreenCopy {
  if (!revealed) {
    return {
      tag: 'What you earned',
      rows: [
        {
          text: '',
          highlighted: false,
          parts: [
            { text: 'Your', highlighted: false },
            { text: String(YEAR), highlighted: true },
            { text: 'pay', highlighted: false },
          ],
        },
      ],
      body: 'Scratch the card to see what you earned with Brevy this year.',
    };
  }
  return {
    tag: 'What you earned',
    rows: [
      { text: dollars.format(state.earned), highlighted: true },
      { text: `earned in ${YEAR}`, highlighted: false },
    ],
    body: 'Every dollar of it, earned by you.',
  };
}

export const payScreen: DemoScreen = {
  id: '09',
  label: '09 Pay · PayCard + MoneyRain',
  step: 8,
  frame: { width: 328, height: 220 },
  cardBox: { left: 16, top: 452, right: 16, bottom: 110 },

  render({ layers, controls, rerender, replay, updateCopy }) {
    const data = { ...state, year: YEAR };
    // The rain covers the whole screen above the card; it starts when the card reports the reveal.
    const rain = mountMoneyRain(layers.front, { origin: layers.card });
    const card = mountPayCard(layers.card, data, {
      onComplete: replay,
      onRevealed: () => {
        updateCopy(copyFor(true));
        rain.play();
      },
    });

    const update = (next: Partial<typeof state>) => {
      state = { ...state, ...next };
      rerender();
    };
    controls.number('Earned ($)', state.earned, { min: 0, max: 250000 }, (earned) => update({ earned }));
    controls.number('Paychecks', state.paychecks, { min: 1, max: 60 }, (paychecks) => update({ paychecks }));
    controls.buttons([
      { label: 'Reveal now', onClick: () => card.reveal() },
      { label: 'Random user', onClick: () => update({ earned: randomInt(18, 520) * 100, paychecks: randomInt(8, 52) }) },
    ]);

    return {
      backdrop: {
        background: ['#023620', '#022e1b'],
        arc: {
          src: arc,
          left: -126,
          top: -355,
          size: 550,
          rotate: 90,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#dce7cf', color: '#023620' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#fefdfc',
        bodyColor: '#d4e2c6',
        dark: true,
      },
      copy: copyFor(false),
      parts: [
        {
          play: () => card.play(),
          pause: () => {
            card.pause();
            rain.pause();
          },
          // Seeking back before the reveal brings the cover and the first headline back.
          seek: (seconds) => {
            card.seek(seconds);
            updateCopy(copyFor(seconds > WAIT_AT));
          },
        },
      ],
      duration: card.duration,
      data,
      note: 'waits for the scratch, then resumes',
      // The note under the card is the app's.
      stills: [{ node: privateNote, x: 0, y: 236, width: 324, height: 36 }],
      destroy() {
        card.destroy();
        rain.destroy();
      },
    };
  },
};
