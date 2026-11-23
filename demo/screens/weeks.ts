import { mountWeeksCard } from '../../src';
import { randomInt, type DemoScreen } from '../screen';

interface State {
  totalWeeks: number;
  weeksInARow: number;
  /** Weeks with a visit before the streak, 1-based, as drawn in Figma. */
  earlier: number[];
}

let state: State = { totalWeeks: 48, weeksInARow: 31, earlier: [10, 11, 13, 14, 16] };

const arc = new URL('../assets/screens/07/arc.svg', import.meta.url).href;
const path = new URL('../assets/screens/07/path.png', import.meta.url).href;

/** Month a week of 2026 falls in, counting weeks from 1 January; `dayOfWeek` 1 is its first day, 4 its middle. */
function monthOfWeek(index: number, dayOfWeek: number): string {
  const day = new Date(Date.UTC(2026, 0, index * 7 + dayOfWeek));
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(day);
}

export const weeksScreen: DemoScreen = {
  id: '07',
  label: '07 Weeks in a row · WeeksCard',
  step: 6,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: 413, right: 0, bottom: 19 },

  render({ layers, controls, rerender, replay }) {
    const streakStart = state.totalWeeks - state.weeksInARow;
    const weeks = Array.from(
      { length: state.totalWeeks },
      (_, index) => index >= streakStart || state.earlier.includes(index + 1),
    );
    const data = { weeksInARow: state.weeksInARow, totalWeeks: state.totalWeeks, weeks };
    const card = mountWeeksCard(layers.card, data, { onComplete: replay });

    const update = (next: Partial<State>) => {
      state = { ...state, ...next };
      state.weeksInARow = Math.min(state.weeksInARow, state.totalWeeks);
      rerender();
    };
    controls.number('Weeks in a row', state.weeksInARow, { min: 0, max: state.totalWeeks }, (weeksInARow) =>
      update({ weeksInARow }),
    );
    controls.select(
      'Weeks in the grid',
      [
        { value: '48', label: '48 (January to November)' },
        { value: '52', label: '52 (whole year)' },
      ],
      String(state.totalWeeks),
      (value) => update({ totalWeeks: Number(value) }),
    );
    controls.buttons([
      {
        label: 'Random user',
        onClick: () => {
          const weeksInARow = randomInt(3, state.totalWeeks - 6);
          const before = state.totalWeeks - weeksInARow - 1;
          const earlier = Array.from({ length: before }, (_, index) => index + 1).filter(() => Math.random() < 0.4);
          update({ weeksInARow, earlier });
        },
      },
      { label: 'Streak only', onClick: () => update({ earlier: [] }) },
    ]);

    return {
      backdrop: {
        background: ['#e3f5ea', '#e6eedc'],
        arc: {
          src: arc,
          left: -126,
          top: -237,
          size: 550,
          rotate: 90,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#023620', color: '#d7e4c9' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#023620',
        bodyColor: '#27272a',
      },
      copy: {
        tag: 'Weeks in a row',
        rows: [
          { text: String(state.weeksInARow), highlighted: true },
          { text: 'weeks in a row', highlighted: false },
        ],
        body: `At least one visit every week, from ${monthOfWeek(card.streak.start, 1)} to ${monthOfWeek(card.streak.end, 4)}.`,
        bodyWidth: 263,
      },
      parts: [card],
      duration: card.duration,
      data,
      // The path with the stones behind the card is the animator's MP4.
      stills: [{ image: path, x: -30, y: -79, width: 420, height: 177, behind: true }],
      destroy: () => card.destroy(),
    };
  },
};
