import { mountHoursClock } from '../../src';
import { randomInt, type DemoScreen } from '../screen';
import { mountVideo } from '../video';

let hours = 1011;

const arc = new URL('../assets/screens/04/arc.svg', import.meta.url).href;

/** The animator's video of the sun and the moon over the mountains: a loop, with the screen's background painted in. */
const SKY = {
  hevc: new URL('../../video/04-hours-sun-moon.mov', import.meta.url).href,
  webm: new URL('../../video/04-hours-sun-moon.webm', import.meta.url).href,
};
/**
 * The picture is 1080 x 1200 px, 3 per Figma px: a 360 x 400 window of the screen with its top 300.67 px down
 * (measured against the Figma layers). Here in the 236 x 236 frame of the clock, which is at left 62, top 489.
 */
const SKY_BOX = { x: -62, y: 300.67 - 489, width: 360, height: 400 };

export const hoursScreen: DemoScreen = {
  id: '04',
  label: '04 Hours · HoursClock',
  step: 3,
  frame: { width: 236, height: 236 },
  cardBox: { left: 62, top: 489, right: 62, bottom: 57 },

  render({ layers, controls, rerender, replay }) {
    const data = { fullDays: Math.floor(hours / 24), hours };
    const card = mountHoursClock(layers.card, data, { onComplete: replay });
    const sky = mountVideo(SKY, SKY_BOX, { loop: true });

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
      parts: [card, sky],
      duration: card.duration,
      data,
      // Sun, moon, orbit and mountains are the animator's video. It is solid where the body text is and where
      // the background arc passes, and Figma has this layer below both, so it goes under the arc.
      stills: [{ element: sky.element, ...SKY_BOX, underArc: true, softSides: 24 }],
      destroy() {
        card.destroy();
        sky.destroy();
      },
    };
  },
};
