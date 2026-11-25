import { mountPersonalityCard, type PersonalityCardData, type PersonalityValueType } from '../../src';
import personalitiesJson from '../personalities.json';
import { randomInt, type DemoScreen } from '../screen';
import { mountVideo } from '../video';

/** Look and sample copy of the nine personality screens, extracted from Figma (section "06 Personality · all types"). */
interface PersonalityLook {
  key: string;
  name: string;
  background: [string, string];
  arc: {
    file: string;
    left: number;
    top: number;
    size: number;
    rotate: number;
    flipY: boolean;
    inset: { top: string; right: string; bottom: string; left: string };
  };
  tag: { bg: string; color: string; text: string };
  headline: { text: string; color: string };
  highlight: { text: string; bg: string; color: string };
  body: { text: string; color: string };
  scene: { file: string; left: number; top: number; width: number; height: number; blend: string; opacity: number };
  card: { label: string; value: string; sub: string; chip: string; chipCheck: boolean };
}

const LOOKS = personalitiesJson as unknown as PersonalityLook[];
const files = import.meta.glob<string>('../assets/screens/06/*', { eager: true, query: '?url', import: 'default' });
const file = (name: string) => files[`../assets/screens/06/${name}`] ?? '';

/** How each type's value is read, and the range the "Random value" switch draws from. */
const VALUES: Record<string, { type: PersonalityValueType; random: () => number | string }> = {
  early_bird: { type: 'time', random: () => `${randomInt(4, 7)}:${String(randomInt(0, 59)).padStart(2, '0')}` },
  night_owl: { type: 'time', random: () => `${randomInt(9, 11)}:${String(randomInt(0, 59)).padStart(2, '0')}` },
  midday_hero: { type: 'time', random: () => `${randomInt(11, 12)}:${String(randomInt(0, 59)).padStart(2, '0')}` },
  rock: { type: 'time', random: () => `${randomInt(6, 9)}:${String(randomInt(0, 3) * 15).padStart(2, '0')}` },
  steady_one: { type: 'number', random: () => randomInt(2, 6) },
  every_day_hero: { type: 'number', random: () => randomInt(5, 7) },
  marathoner: { type: 'duration', random: () => randomInt(300, 720) },
  weekend_warrior: { type: 'percent', random: () => randomInt(25, 60) },
  juggler: { type: 'number', random: () => randomInt(2, 4) },
};

/** The frame's top on the 782 px tall Figma screen; the scenes are placed in screen coordinates in Figma. */
const CARD_TOP = 413;

const videoFiles = import.meta.glob<string>('../../video/06-personality-*', { eager: true, query: '?url', import: 'default' });

/**
 * The animator's scene videos, by personality; the other types keep their still.
 * Each picture is 1080 x 1080 px and fills the 400 x 400 box of the Figma scene.
 */
const SCENE_VIDEOS: Record<string, string> = {
  early_bird: 'early-bird',
  night_owl: 'night-owl',
  midday_hero: 'midday-hero',
  rock: 'rock',
  steady_one: 'steady-one',
};

/** The scene video of a personality at the size of its Figma box, or null for a type that has none. */
function sceneVideo(look: PersonalityLook) {
  const name = SCENE_VIDEOS[look.key];
  if (!name) return null;
  const file = (extension: string) => videoFiles[`../../video/06-personality-${name}.${extension}`] ?? '';
  return mountVideo({ hevc: file('mov'), webm: file('webm') }, look.scene);
}

let typeKey = 'early_bird';
let override: number | string | null = null;

export const personalityScreen: DemoScreen = {
  id: '06',
  label: '06 Clock-in personality · PersonalityCard',
  step: 5,
  frame: { width: 360, height: 350 },
  cardBox: { left: 0, top: CARD_TOP, right: 0, bottom: 19 },

  render({ layers, controls, rerender, replay }) {
    const look = LOOKS.find((candidate) => candidate.key === typeKey) ?? LOOKS[0]!;
    const values = VALUES[look.key]!;
    const data: PersonalityCardData = {
      type: look.key,
      label: look.card.label,
      value: override ?? look.card.value,
      valueType: values.type,
      sub: look.card.sub,
      chip: look.card.chip,
    };
    const card = mountPersonalityCard(layers.card, data, { onComplete: replay });
    const scene = sceneVideo(look);
    const sceneBox = {
      x: look.scene.left,
      y: look.scene.top - CARD_TOP,
      width: look.scene.width,
      height: look.scene.height,
      behind: true,
      opacity: look.scene.opacity,
    };

    controls.select(
      'Personality',
      LOOKS.map(({ key, name }) => ({ value: key, label: name })),
      look.key,
      (value) => {
        typeKey = value;
        override = null;
        rerender();
      },
    );
    controls.buttons([
      {
        label: 'Random value',
        onClick: () => {
          override = values.random();
          rerender();
        },
      },
    ]);

    return {
      backdrop: {
        background: look.background,
        arc: { ...look.arc, src: file(look.arc.file) },
        tag: look.tag,
        highlight: look.highlight,
        headlineColor: look.headline.color,
        bodyColor: look.body.color,
      },
      copy: {
        tag: look.tag.text,
        rows: [
          { text: look.headline.text, highlighted: false },
          { text: look.highlight.text, highlighted: true },
        ],
        body: look.body.text,
      },
      parts: scene ? [card, scene] : [card],
      duration: card.duration,
      data,
      note: `${look.name} · ${values.type}`,
      // The scene behind the card: the animator's video where we have it, a still for the other types.
      stills: [scene ? { element: scene.element, ...sceneBox } : { image: file(look.scene.file), ...sceneBox }],
      destroy() {
        card.destroy();
        scene?.destroy();
      },
    };
  },
};
