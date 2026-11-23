import { mountHoursClock } from '../../src';
import { randomInt, type DemoScreen } from '../screen';

let hours = 1011;

const asset = (name: string) => new URL(`../assets/screens/04/${name}`, import.meta.url).href;
const arc = asset('arc.svg');
const mountains = asset('mountains.png');
const orbit = asset('orbit.png');
const sun = asset('sun.png');
const moon = asset('moon.png');

export const hoursScreen: DemoScreen = {
  id: '04',
  label: '04 Hours · HoursClock',
  step: 3,
  frame: { width: 236, height: 236 },
  cardBox: { left: 62, top: 489, right: 62, bottom: 57 },

  render({ layers, controls, rerender, replay }) {
    const data = { fullDays: Math.floor(hours / 24), hours };
    const card = mountHoursClock(layers.card, data, { onComplete: replay });

    const update = (next: number) => {
      hours = next;
      rerender();
    };
    controls.number('Hours of care', hours, { min: 0, max: 8760 }, update);
    controls.buttons([
      { label: 'Random user', onClick: () => update(randomInt(60, 2400)) },
      { label: '1,011 hours', pressed: hours === 1011, onClick: () => update(1011) },
    ]);

    return {
      backdrop: {
        background: ['#f8f5f2', '#f8f5f2'],
        arc: {
          src: arc,
          left: -86,
          top: 211,
          size: 550,
          rotate: -90,
          flipY: true,
          inset: { top: '0', right: '0', bottom: '5.45%', left: '50%' },
        },
        tag: { bg: '#023620', color: '#d7e4c9' },
        highlight: { bg: '#d7e4c9', color: '#055e34' },
        headlineColor: '#023620',
        bodyColor: '#27272a',
      },
      copy: {
        tag: 'Hours of care',
        rows: [
          { text: hours.toLocaleString('en-US'), highlighted: true },
          { text: 'hours of care', highlighted: false },
        ],
        body: `That’s ${data.fullDays} full days, side by side.`,
      },
      parts: [card],
      duration: card.duration,
      data,
      // Sun, moon, the dotted orbit and the mountains are the animator's MP4; here they stand still.
      stills: [
        { image: mountains, x: -62, y: -87, width: 360, height: 300, behind: true, opacity: 0.4 },
        { image: orbit, x: -32, y: -99, width: 300, height: 150, behind: true },
        { image: sun, x: -28, y: -95, width: 72, height: 72, behind: true },
        { image: moon, x: 194, y: -93, width: 68, height: 68, behind: true },
      ],
      destroy: () => card.destroy(),
    };
  },
};
