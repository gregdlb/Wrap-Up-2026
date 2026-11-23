import { mountBusiestMonthCard, mountFallingLeaves, type BusiestMonthCardAnalysis } from '../../src';
import { MONTH_NAMES, monthBackdrop } from '../backdrop';
import { GARLAND_STILLS } from '../garland-stills';
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

export const busiestMonthScreen: DemoScreen = {
  id: '05',
  label: '05 Busiest month · BusiestMonthCard + FallingLeaves',
  step: 4,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: 413, right: 0, bottom: 19 },

  render({ layers, controls, rerender, replay }) {
    const data = toData(state.visitsPerMonth, state.weeks?.weeks);
    const card = mountBusiestMonthCard(layers.card, data, { onComplete: replay });
    const { analysis } = card;
    const monthIndex = state.weeks?.monthIndex ?? analysis.primaryIndex;
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
      parts: [card, leaves],
      duration: card.duration,
      data,
      note: analysis.variant,
      // The garland on the card's edge is the animator's MP4 in the app.
      stills: GARLAND_STILLS[monthIndex] ?? [],
      destroy() {
        card.destroy();
        leaves.destroy();
      },
    };
  },
};
