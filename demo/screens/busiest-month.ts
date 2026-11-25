import { mountBusiestMonthCard, mountFallingLeaves, type BusiestMonthCardAnalysis } from '../../src';
import { MONTH_NAMES, monthBackdrop } from '../backdrop';
import { GARLAND_STILLS } from '../garland-stills';
import { mountVideo } from '../video';
import { peakYear, randomMonthIndex, steadyYear, tieYear, toData, weeksAround, type SampleWeeks } from '../sample-data';
import type { DemoScreen, ScreenCopy } from '../screen';

interface State {
  visitsPerMonth: number[];
  weeks: SampleWeeks | null;
}

let state: State = { visitsPerMonth: [14, 17, 19, 21, 20, 22, 23, 23, 21, 33, 18, 17], weeks: null };

/** Copy for the four variants as written in Figma. The host app owns this text, not the component. */
function copyFor(analysis: BusiestMonthCardAnalysis, weeks: SampleWeeks | null): ScreenCopy {
  const month = MONTH_NAMES[analysis.primaryIndex] ?? '';

  if (analysis.variant === 'busiest_week') {
    return {
      tag: 'Busiest week',
      rows: [
        { text: weeks?.range ?? '', highlighted: true },
        { text: 'your busiest week', highlighted: false },
      ],
      body: `${analysis.value} visits in one week. Your biggest week yet.`,
    };
  }
  if (analysis.variant === 'steady') {
    return {
      tag: 'Busiest month',
      rows: [
        { text: 'You stayed', highlighted: false },
        { text: 'consistent', highlighted: true },
        { text: 'every month', highlighted: false },
      ],
      body: `About ${analysis.value} visits a month, month after month.`,
    };
  }

  const rows = [
    { text: month, highlighted: true },
    { text: 'your busiest month', highlighted: false },
  ];
  if (analysis.variant === 'tie') {
    const other = MONTH_NAMES[analysis.highlighted[0] ?? 0] ?? '';
    return { tag: 'Busiest month', rows, body: `${analysis.value} visits, same as ${other}.` };
  }
  return { tag: 'Busiest month', rows, body: `${analysis.value} visits, more than any other month.` };
}

const videoFiles = import.meta.glob<string>('../../video/05-busiest-month-*', { eager: true, query: '?url', import: 'default' });

/**
 * The animator's garland videos, by month index (0 = January); the other months keep their still.
 * Every picture is 760 x 420 px. `x`, `y` is where its corner goes in the 360 x 350 "Months card" frame and
 * `perFigmaPx` how many video px make one Figma px, both measured so that the garland of the last frame lies
 * on the Figma garland (the snowman and the heart included). The pictures are not all cut the same way.
 */
const GARLAND_VIDEOS: Record<number, { file: string; x: number; y: number; perFigmaPx: number }> = {
  0: { file: 'january', x: 53.5, y: -48, perFigmaPx: 3 },
  1: { file: 'february', x: 52.5, y: -50.75, perFigmaPx: 2.95 },
  2: { file: 'march', x: 51.5, y: -49.5, perFigmaPx: 3 },
  3: { file: 'april', x: 49.5, y: -50, perFigmaPx: 3 },
  4: { file: 'may', x: 49.25, y: -48, perFigmaPx: 3 },
};
const GARLAND_PICTURE = { width: 760, height: 420 };

/** The garland video of a month and where it goes, or null for a month that has none. */
function garlandVideo(monthIndex: number) {
  const video = GARLAND_VIDEOS[monthIndex];
  if (!video) return null;
  const box = {
    x: video.x,
    y: video.y,
    width: GARLAND_PICTURE.width / video.perFigmaPx,
    height: GARLAND_PICTURE.height / video.perFigmaPx,
  };
  const file = (extension: string) => videoFiles[`../../video/05-busiest-month-${video.file}.${extension}`] ?? '';
  return { box, player: mountVideo({ hevc: file('mov'), webm: file('webm') }, box) };
}

export const busiestMonthScreen: DemoScreen = {
  id: '05',
  label: '05 Busiest month · BusiestMonthCard + FallingLeaves',
  step: 4,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: 413, right: 0, bottom: 19 },

  render({ layers, controls, rerender, replay }) {
    const data = toData(state.visitsPerMonth, state.weeks?.weeks);
    // With weeks on the card, the app tells it the month: the screen's length depends on the month's garland video.
    const card = mountBusiestMonthCard(layers.card, data, {
      onComplete: replay,
      ...(state.weeks ? { month: state.weeks.monthIndex + 1 } : {}),
    });
    const { analysis } = card;
    const monthIndex = state.weeks?.monthIndex ?? analysis.primaryIndex;
    const garland = garlandVideo(monthIndex);
    const leaves = mountFallingLeaves(
      { back: layers.back, front: layers.front },
      { month: monthIndex + 1, anchor: layers.card },
    );

    const update = (next: State) => {
      state = next;
      rerender();
    };
    controls.select(
      'Busiest month',
      MONTH_NAMES.map((name, index) => ({ value: String(index), label: name })),
      String(monthIndex),
      (value) => update({ visitsPerMonth: peakYear(Number(value)), weeks: null }),
    );
    controls.buttons([
      {
        label: 'Tie',
        pressed: analysis.variant === 'tie',
        onClick: () => update({ visitsPerMonth: tieYear(monthIndex), weeks: null }),
      },
      {
        label: 'Steady year',
        pressed: analysis.variant === 'steady',
        onClick: () => update({ visitsPerMonth: steadyYear(), weeks: null }),
      },
      {
        label: 'Busiest week',
        pressed: analysis.variant === 'busiest_week',
        onClick: () => update({ ...state, weeks: weeksAround(monthIndex) }),
      },
      {
        label: 'Random user',
        onClick: () => {
          const month = randomMonthIndex();
          const profiles = [() => peakYear(month), () => peakYear(month), () => tieYear(month), steadyYear];
          const visitsPerMonth = profiles[Math.floor(Math.random() * profiles.length)]!();
          update({ visitsPerMonth, weeks: Math.random() < 0.2 ? weeksAround(month) : null });
        },
      },
    ]);

    return {
      backdrop: monthBackdrop(monthIndex),
      copy: copyFor(analysis, state.weeks),
      parts: garland ? [card, leaves, garland.player] : [card, leaves],
      duration: card.duration,
      data,
      note: analysis.variant,
      // The garland on the card's top edge: the animator's video where we have it, a still for the other months.
      stills: garland ? [{ element: garland.player.element, ...garland.box }] : (GARLAND_STILLS[monthIndex] ?? []),
      destroy() {
        card.destroy();
        leaves.destroy();
        garland?.player.destroy();
      },
    };
  },
};
