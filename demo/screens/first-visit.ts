import { mountFirstVisitCard } from '../../src';
import { randomInt, type DemoScreen } from '../screen';

let date = '2026-03-04';

/** The story is shown at the end of the year; "days ago" in the copy counts back from this day. */
const WRAP_UP_DAY = Date.UTC(2026, 11, 1);
const MS_PER_DAY = 86_400_000;

const arc = new URL('../assets/screens/02/arc.svg', import.meta.url).href;

function utcDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export const firstVisitScreen: DemoScreen = {
  id: '02',
  label: '02 First visit · FirstVisitCard',
  step: 1,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: 406, right: 0, bottom: 26 },

  render({ layers, controls, rerender, replay }) {
    const data = { date };
    const card = mountFirstVisitCard(layers.card, data, { onComplete: replay });

    controls.date('First visit', date, (value) => {
      if (!value) return;
      date = value;
      rerender();
    });
    const preset = (label: string, value: string) => ({
      label,
      pressed: date === value,
      onClick: () => {
        date = value;
        rerender();
      },
    });
    controls.buttons([
      preset('January 1', '2026-01-01'),
      preset('March 4', '2026-03-04'),
      preset('October 28', '2026-10-28'),
      {
        label: 'Random date',
        onClick: () => {
          const day = new Date(Date.UTC(2026, 0, 1) + randomInt(0, 330) * MS_PER_DAY);
          date = day.toISOString().slice(0, 10);
          rerender();
        },
      },
    ]);

    const day = utcDay(date);
    const format = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(day);
    const daysAgo = Math.max(0, Math.round((WRAP_UP_DAY - day.getTime()) / MS_PER_DAY));

    return {
      backdrop: {
        background: ['#dce7cf', '#f5f2ef'],
        arc: {
          src: arc,
          left: -86,
          top: 314,
          size: 550,
          rotate: -90,
          flipY: true,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#023620', color: '#d7e4c9' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#055e34',
        bodyColor: '#27272a',
      },
      copy: {
        tag: 'Where it started',
        rows: [
          { text: `It all started\non a ${format({ weekday: 'long' })}`, highlighted: false },
          { text: format({ month: 'long', day: 'numeric' }), highlighted: true },
        ],
        body: `Your first visit with Brevy. That’s ${daysAgo} days ago.`,
        bodyWidth: 192,
      },
      parts: [card],
      duration: card.duration,
      data,
      note: `flips through ${card.flipDates.map((day) => day.slice(5)).join(' → ')}`,
      destroy: () => card.destroy(),
    };
  },
};
