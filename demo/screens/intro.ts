import gsap from 'gsap';
import type { DemoScreen, Playable } from '../screen';
import { mountVideo, type DemoVideo } from '../video';

const videoFiles = import.meta.glob<string>('../../video/01-*', { eager: true, query: '?url', import: 'default' });

/**
 * Screen 01 is three of the animator's videos, each as large as the screen (1080 x 2346 px for 360 x 782),
 * laid one over the other and started one after the other. Order and times are those of the animator's
 * reference video of the whole intro (`01 Full.mp4`, 30 frames a second). Listed from the bottom layer up.
 */
const PARTS = [
  // 01c with Brevy: the logo draws itself, then the arc comes in. Still from 8.4 s.
  { file: 'with-brevy', at: 122 / 30 },
  // 01b What a year: "What a year" (in the video), 2026 and the confetti; it flies out at about 3.8-4.2 s.
  { file: 'what-a-year', at: 20 / 30 },
  // 01 Welcome: the gift paper. The bow unties and the paper tears open at 0.5-1.0 s, showing what is under it.
  { file: 'welcome-gift', at: 0 },
];

/** Length of the intro, as in the reference video. The last video has been still for 1.6 s by then. */
const SECONDS = 10;

/** Seconds from the start: the texts of 01 Welcome come in, and leave with the header while the paper opens. */
const TEXT = { in: { at: 0, seconds: 0.3, stagger: 0.08, offsetY: 12 }, out: { at: 0.55, seconds: 0.3 } };

let name = 'Maria';

interface Step {
  video: DemoVideo;
  at: number;
}

/**
 * Runs the videos on one clock, like a component: each starts `at` seconds in, and `seek` puts every one of them
 * where it is at that moment (not started yet: its first frame; over: its last one, which is empty for the first two).
 */
function sequence(steps: Step[], seconds: number, build: (clock: gsap.core.Timeline) => void, onComplete: () => void) {
  const clock = gsap.timeline({ paused: true, onComplete });
  clock.to({}, { duration: seconds }, 0);
  for (const step of steps) {
    if (step.at > 0) clock.call(() => step.video.play(), undefined, step.at);
  }
  build(clock);

  const running = (step: Step) => {
    const length = step.video.element.duration;
    const into = clock.time() - step.at;
    return into >= 0 && (!Number.isFinite(length) || into < length - 0.05);
  };
  const part: Playable & { destroy(): void } = {
    ready: Promise.all(steps.map((step) => step.video.ready)).then(() => undefined),
    play() {
      clock.play();
      // From the start, or again after a pause: the videos whose time it is run, the others wait
      // (one that was still running when the screen started over must not go on from its first frame).
      for (const step of steps) {
        if (running(step)) step.video.play();
        else step.video.pause();
      }
    },
    pause() {
      clock.pause();
      steps.forEach((step) => step.video.pause());
    },
    seek(t) {
      clock.time(t, true);
      steps.forEach((step) => step.video.seek(Math.max(t - step.at, 0)));
    },
    destroy() {
      clock.kill();
      steps.forEach((step) => step.video.destroy());
    },
  };
  return part;
}

export const introScreen: DemoScreen = {
  id: '01',
  label: '01 Welcome · What a year · with Brevy',
  step: 0,
  frame: { width: 360, height: 782 },
  cardBox: { left: 0, top: 0, right: 0, bottom: 0 },

  render({ layers, controls, rerender, replay }) {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.createElement('div');
    root.className = 'intro';

    const steps = PARTS.map(({ file, at }) => {
      const url = (extension: string) => videoFiles[`../../video/01-${file}.${extension}`] ?? '';
      const video = mountVideo({ hevc: url('mov'), webm: url('webm') }, { width: 360, height: 782 });
      // Like the background: it covers the screen, keeps its proportions and stays centered.
      Object.assign(video.element.style, { width: '100%', height: '100%' });
      root.append(video.element);
      return { video, at };
    });

    // The texts of the Figma frame "01 Welcome · Gift", over the paper. The name is the user's.
    const year = document.createElement('p');
    year.className = 'intro__year';
    year.textContent = '2026';
    const line = document.createElement('p');
    line.className = 'intro__line';
    line.textContent = `Psst, ${name}.\nYour year is ready\nto unwrap`;
    root.append(year, line);
    layers.back.append(root);

    const intro = sequence(
      steps,
      SECONDS,
      (clock) => {
        // With reduced motion the screen is its last picture from the start: the logo, without these texts.
        if (still) return void gsap.set([year, line], { opacity: 0 });
        clock.fromTo(
          [year, line],
          { opacity: 0, y: TEXT.in.offsetY },
          { opacity: 1, y: 0, duration: TEXT.in.seconds, stagger: TEXT.in.stagger, ease: 'power2.out' },
          TEXT.in.at,
        );
        clock.to([year, line], { opacity: 0, duration: TEXT.out.seconds, ease: 'none' }, TEXT.out.at);
      },
      replay,
    );

    controls.text('Name', name, (value) => {
      name = value.trim() || 'Maria';
      rerender();
    });

    return {
      backdrop: {
        background: ['#023620', '#023620'],
        arc: null,
        tag: { bg: '#d7e4c9', color: '#023620' },
        highlight: { bg: '#fbd48a', color: '#734c1b' },
        headlineColor: '#fefdfc',
        bodyColor: '#e6eedc',
        dark: true,
      },
      copy: { tag: '', rows: [], body: '' },
      parts: [intro],
      duration: SECONDS,
      data: { name },
      // Figma has no progress bar on 01, and the header only on its first frame.
      hideProgress: true,
      headerOut: still ? { at: 0, seconds: 0.01 } : TEXT.out,
      destroy() {
        intro.destroy();
        root.remove();
      },
    };
  },
};
