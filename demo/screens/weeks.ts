import { mountWeeksCard } from '../../src';
import { randomInt, type DemoScreen } from '../screen';
import { mountVideo } from '../video';

interface State {
  totalWeeks: number;
  weeksInARow: number;
  /** Weeks with a visit before the streak, 1-based, as drawn in Figma. */
  earlier: number[];
}

let state: State = { totalWeeks: 48, weeksInARow: 31, earlier: [10, 11, 13, 14, 16] };

const arc = new URL('../assets/screens/07/arc.svg', import.meta.url).href;

/** The animator's video of the path with the stepping stones: a loop, with the screen's background painted in. */
const PATH = {
  hevc: new URL('../../video/07-weeks-stones.mov', import.meta.url).href,
  webm: new URL('../../video/07-weeks-stones.webm', import.meta.url).href,
};
/**
 * The picture is 1080 x 640 px, 3 per Figma px: a 360 x 213.33 window of the screen with its top 315.67 px down
 * (measured against the Figma picture). Here in the card's frame, which is at top 413.
 * The animator's picture is cut at its bottom, which showed until the card had come in, so the files fade out
 * over their lower 96 Figma px (a smooth step in the alpha, made when they were encoded).
 */
const PATH_BOX = { x: 0, y: 315.67 - 413, width: 360, height: 640 / 3 };

/** Length of the longest run of weeks with a visit: the streak, as the card draws it. */
function longestRun(weeks: boolean[]): number {
  let longest = 0;
  let run = 0;
  for (const visited of weeks) {
    run = visited ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

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
    // One number for the headline, the card and its squares: the streak counted from the weeks themselves.
    const data = { weeksInARow: longestRun(weeks), totalWeeks: state.totalWeeks, weeks };
    const card = mountWeeksCard(layers.card, data, { onComplete: replay });
    const path = mountVideo(PATH, PATH_BOX, { loop: true });

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
          { text: String(data.weeksInARow), highlighted: true },
          { text: 'weeks in a row', highlighted: false },
        ],
        body: `At least one visit every week, from ${monthOfWeek(card.streak.start, 1)} to ${monthOfWeek(card.streak.end, 4)}.`,
        bodyWidth: 263,
      },
      parts: [card, path],
      duration: card.duration,
      data,
      // The path with the stones behind the card is the animator's video. It is solid where the body text is,
      // so it goes under the text.
      stills: [{ element: path.element, ...PATH_BOX, underText: true, softSides: 24 }],
      destroy() {
        card.destroy();
        path.destroy();
      },
    };
  },
};
