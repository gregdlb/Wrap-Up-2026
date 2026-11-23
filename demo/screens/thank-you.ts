import { mountThankYouCard, type ThankYouCardData } from '../../src';
import { pick, randomInt, type DemoScreen } from '../screen';
import { shareButtons } from '../stills';

let state: ThankYouCardData = {
  name: 'Maria',
  since: '2026-03-04',
  visits: 214,
  personName: 'Rosa',
  hours: 1011,
  fullDays: 42,
  weeksInARow: 31,
  personality: 'The Early Bird',
  earliestClockIn: '5:48 AM',
};

const PERSONALITIES = ['The Early Bird', 'The Night Owl', 'The Midday Hero', 'The Rock', 'The Steady One', 'The Every-Day Hero'];
const NAMES = ['Rosa', 'Daniel', 'Eleanor', 'Walter', 'Guadalupe', 'Maximiliano', 'Bernadette'];
const CAREGIVERS = ['Maria', 'James', 'Aaliyah', 'Chen', 'Bernadette'];

export const thankYouScreen: DemoScreen = {
  id: '11',
  label: '11 Thank you + share · ThankYouCard',
  step: 11,
  frame: { width: 328, height: 416 },
  cardBox: { left: 16, top: 266, right: 16, bottom: 100 },

  render({ layers, controls, rerender, replay }) {
    const data = { ...state };
    const card = mountThankYouCard(layers.card, data, { onComplete: replay });

    const update = (next: Partial<ThankYouCardData>) => {
      state = { ...state, ...next };
      rerender();
    };
    controls.text('Caregiver', state.name, (name) => update({ name }));
    controls.text('Cared for', state.personName ?? '', (personName) => update({ personName }));
    controls.date('First visit', state.since, (since) => update({ since }));
    controls.number('Visits', state.visits, { min: 0, max: 9999 }, (visits) => update({ visits }));
    controls.number('Hours', state.hours, { min: 0, max: 8760 }, (hours) =>
      update({ hours, fullDays: Math.floor(hours / 24) }),
    );
    controls.select(
      'Personality',
      PERSONALITIES.map((name) => ({ value: name, label: name })),
      state.personality,
      (personality) => update({ personality }),
    );

    // What the app's Share button would do: render the image and hand it to the share sheet.
    // Here the generated PNG is shown in the panel; a click opens it at full size.
    const preview = document.createElement('div');
    preview.className = 'share-preview';
    preview.hidden = true;
    const showExport = async () => {
      const blob = await card.exportImage();
      const url = URL.createObjectURL(blob);
      const image = document.createElement('img');
      image.alt = 'Generated share image';
      image.src = url;
      await image.decode();
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = 'Open at full size';
      link.append(image);
      const caption = document.createElement('span');
      caption.textContent = `exportImage(): ${blob.type}, ${image.naturalWidth} × ${image.naturalHeight}, ${Math.round(blob.size / 1024)} KB. Click the image to open it at full size.`;
      preview.replaceChildren(link, caption);
      preview.hidden = false;
    };
    controls.buttons([
      {
        label: 'Random user',
        onClick: () => {
          const hours = randomInt(120, 2400);
          update({
            name: pick(CAREGIVERS),
            since: `2026-${String(randomInt(1, 9)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
            visits: randomInt(20, 1200),
            personName: pick(NAMES),
            hours,
            fullDays: Math.floor(hours / 24),
            weeksInARow: randomInt(3, 48),
            personality: pick(PERSONALITIES),
            earliestClockIn: `${randomInt(4, 8)}:${String(randomInt(0, 59)).padStart(2, '0')} AM`,
          });
        },
      },
      { label: 'Preview share image', onClick: () => void showExport() },
    ]);
    controls.custom(preview);

    return {
      backdrop: {
        background: ['#023620', '#023620'],
        // The Figma arc lies below the 782 px screen; on taller phones it would show under the buttons.
        arc: null,
        tag: { bg: '#dce7cf', color: '#023620' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#fefdfc',
        bodyColor: '#d4e2c6',
        dark: true,
      },
      copy: {
        tag: '',
        rows: [{ text: `Thank you, ${state.name}.\nSee you in 2027`, highlighted: false }],
        body: '',
      },
      parts: [card],
      duration: card.duration,
      data,
      // Share and Watch again are the app's buttons; they fade in last, at 1.8 s, in the app.
      stills: [{ node: shareButtons, x: 0, y: 432, width: 328, height: 44 }],
      destroy: () => card.destroy(),
    };
  },
};
