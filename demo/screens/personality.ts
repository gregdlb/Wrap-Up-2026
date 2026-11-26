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

/** The frame's top on the 782 px tall Figma screen; the scenes are placed in screen coordinates. */
const CARD_TOP = 413;

const videoFiles = import.meta.glob<string>('../../video/06-personality-*', { eager: true, query: '?url', import: 'default' });

/**
 * The animator's scene videos, by personality; a type without one would keep its still.
 * Each picture is 1080 x 1080 px and shows a 360 x 360 window of the Figma screen, 3 video px per Figma px:
 * as wide as the screen, with its top `top` px down the 782 px tall screen. That is not the box of the Figma
 * scene layer (400 or 480 px wide, running past both sides of the screen); the tops are measured so that the
 * picture lies on the Figma scene.
 * A `loop` repeats for as long as the screen is shown; the others play once and stay on their last frame.
 */
const SCENE_VIDEOS: Record<string, { file: string; top: number; loop: boolean }> = {
  early_bird: { file: 'early-bird', top: 265.33, loop: false },
  night_owl: { file: 'night-owl', top: 268, loop: true },
  midday_hero: { file: 'midday-hero', top: 285.67, loop: true },
  rock: { file: 'rock', top: 258.83, loop: false },
  steady_one: { file: 'steady-one', top: 254, loop: true },
  every_day_hero: { file: 'every-day-hero', top: 242, loop: true },
  marathoner: { file: 'marathoner', top: 288.67, loop: true },
  weekend_warrior: { file: 'weekend-warrior', top: 291.67, loop: true },
  juggler: { file: 'juggler', top: 320.67, loop: true },
};
const SCENE_PICTURE = { width: 360, height: 360 };

/**
 * The scene videos are cut straight at their left and right edge, where the stills fade out over about this
 * many Figma px. Where the card is scaled down and the scene is narrower than the screen, the same fade,
 * as a mask, keeps the cut sides from showing.
 */
const SCENE_SOFT_SIDES = 24;

/** The scene video of a personality and its top on the screen, or null for a type that has none. */
function sceneVideo(look: PersonalityLook) {
  const video = SCENE_VIDEOS[look.key];
  if (!video) return null;
  const file = (extension: string) => videoFiles[`../../video/06-personality-${video.file}.${extension}`] ?? '';
  const player = mountVideo({ hevc: file('mov'), webm: file('webm') }, SCENE_PICTURE, { loop: video.loop });
  return { player, top: video.top };
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
    const stillBox = {
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
      parts: scene ? [card, scene.player] : [card],
      duration: card.duration,
      data,
      note: `${look.name} · ${values.type}`,
      // The scene behind the card: the animator's video, or the still for a type that has none.
      // The videos have the sky painted in up to the headline and the body text, so they go under the text;
      // a still is see-through there and stays where Figma has it, above the text.
      stills: [
        scene
          ? {
              element: scene.player.element,
              x: 0,
              y: scene.top - CARD_TOP,
              ...SCENE_PICTURE,
              underText: true,
              softSides: SCENE_SOFT_SIDES,
            }
          : { image: file(look.scene.file), ...stillBox },
      ],
      destroy() {
        card.destroy();
        scene?.player.destroy();
      },
    };
  },
};
