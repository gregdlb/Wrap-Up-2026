import { mountTopCaregiverCard } from '../../src';
import type { DemoScreen } from '../screen';
import { mountVideo } from '../video';

let state = { topPercent: 10 };

const arc = new URL('../assets/screens/10/arc.svg', import.meta.url).href;

/** The animator's video of the summit with its glow and flag: a loop, with the screen's emerald painted in. */
const SUMMIT = {
  hevc: new URL('../../video/10-top-caregiver-summit.mov', import.meta.url).href,
  webm: new URL('../../video/10-top-caregiver-summit.webm', import.meta.url).href,
};
/**
 * The picture is 1080 x 1080 px, 3 per Figma px: a 360 x 360 window of the screen with its top 306 px down
 * (measured against the Figma picture). Here in the card's frame, which is at top 413.
 */
const SUMMIT_BOX = { x: 0, y: 306 - 413, width: 360, height: 360 };

export const topCaregiverScreen: DemoScreen = {
  id: '10',
  label: '10 Top caregiver · TopCaregiverCard',
  step: 9,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: 413, right: 0, bottom: 19 },

  render({ layers, controls, rerender, replay }) {
    // Without `distribution` the card draws the curve from Figma.
    const data = { topPercent: state.topPercent };
    const card = mountTopCaregiverCard(layers.card, data, { onComplete: replay });
    const summit = mountVideo(SUMMIT, SUMMIT_BOX, { loop: true });

    const update = (next: Partial<typeof state>) => {
      state = { ...state, ...next };
      rerender();
    };
    controls.select(
      'Top',
      [1, 5, 10, 25, 50].map((percent) => ({ value: String(percent), label: `Top ${percent}%` })),
      String(state.topPercent),
      (value) => update({ topPercent: Number(value) }),
    );

    return {
      backdrop: {
        background: ['#023620', '#023620'],
        arc: {
          src: arc,
          left: -126,
          top: -120,
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
      copy: {
        tag: 'Top caregiver',
        rows: [
          {
            text: '',
            highlighted: false,
            parts: [
              { text: `Top ${state.topPercent}%`, highlighted: true },
              { text: 'of Brevy', highlighted: false },
            ],
          },
          { text: 'caregivers', highlighted: false },
        ],
        body: 'Ranked by hours of care in 2026.',
      },
      parts: [card, summit],
      duration: card.duration,
      data,
      note: `${card.topBars} top bar${card.topBars === 1 ? '' : 's'}`,
      // The glowing summit behind the card is the animator's video. It is solid where the body text is,
      // so it goes under the text.
      stills: [{ element: summit.element, ...SUMMIT_BOX, underText: true, softSides: 24 }],
      destroy() {
        card.destroy();
        summit.destroy();
      },
    };
  },
};
