import gsap from 'gsap';
import type { DemoScreen, Playable } from '../screen';
import { mountVideo, type DemoVideo } from '../video';

const videoFiles = import.meta.glob<string>('../../video/01-*', { eager: true, query: '?url', import: 'default' });

/**
 * The gift paper stands still this long before it opens, so that the text on it can be read.
 * The animator's reference has no such pause; everything after it is that much later.
 */
const HOLD_SECONDS = 1.5;

/**
 * Screen 01 is three of the animator's videos, each as large as the screen (1080 x 2346 px for 360 x 782),
 * laid one over the other and started one after the other. Order and times are those of the animator's
 * reference video of the whole intro (`01 Full.mp4`, 30 frames a second), after the pause on the paper.
 * Listed from the bottom layer up.
 */
const PARTS = [
  // 01c with Brevy: the logo draws itself, then the arc comes in. Still 4.3 s after its start.
  { file: 'with-brevy', at: HOLD_SECONDS + 122 / 30 },
  // 01b What a year: "What a year" (in the video), 2026 and the confetti; it flies out 3.1-3.5 s after its start.
  { file: 'what-a-year', at: HOLD_SECONDS + 20 / 30 },
  // 01 Welcome: the gift paper. The bow unties and the paper tears open 0.5-1.0 s after its start,
  // showing what is under it.
  { file: 'welcome-gift', at: HOLD_SECONDS },
];

/** Length of the intro: the 10 s of the reference video and the pause. The last video has been still for 1.6 s by then. */
const SECONDS = HOLD_SECONDS + 10;

/** Seconds from the start: the texts of 01 Welcome come in, and leave with the header's logo while the paper opens. */
const TEXT = { in: { at: 0, seconds: 0.3, stagger: 0.08, offsetY: 12 }, out: { at: HOLD_SECONDS + 0.55, seconds: 0.3 } };

/** The first frame of the gift video as a picture: it is what shows during the pause. */
const PAPER = new URL('../../video/01-welcome-gift.jpg', import.meta.url).href;

let name = 'Maria';

/** A video this far behind the clock is put where the clock is, once this much of it has arrived beyond that point. */
const LATE_SECONDS = 0.3;
const CATCH_UP_BUFFER_SECONDS = 0.5;

interface Step {
  video: DemoVideo;
  at: number;
}

/**
 * Runs the videos on one clock, like a component: each starts `at` seconds in, and `seek` puts every one of them
 * where it is at that moment (not started yet: its first frame; over: its last one, which is empty for the first two).
 */
function sequence(
  steps: Step[],
  seconds: number,
  build: (clock: gsap.core.Timeline) => void,
  onComplete: () => void,
  onTime: (seconds: number) => void,
) {
  const clock = gsap.timeline({ paused: true, onComplete, onUpdate: () => onTime(clock.time()) });
  clock.to({}, { duration: seconds }, 0);
  for (const step of steps) {
    if (step.at > 0) clock.call(() => step.video.play(), undefined, step.at);
    // The clock leads. A video that is behind it (still downloading when its time came) jumps to where the
    // clock is as soon as that part has arrived, or to its end if its time has passed, so the layers never
    // run out of step: the gift paper must not open over the logo.
    const element = step.video.element;
    const catchUp = () => {
      const due = clock.time() - step.at;
      const length = element.duration;
      if (clock.paused() || !Number.isFinite(length) || due - element.currentTime < LATE_SECONDS) return;
      if (element.currentTime >= length - 0.05) return;
      if (due >= length - 0.05) {
        step.video.pause();
        step.video.seek(length);
        return;
      }
      for (let i = 0; i < element.buffered.length; i++) {
        if (element.buffered.start(i) <= due && due + CATCH_UP_BUFFER_SECONDS <= element.buffered.end(i)) {
          element.currentTime = due;
          return;
        }
      }
    };
    element.addEventListener('playing', catchUp);
    element.addEventListener('timeupdate', catchUp);
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
      onTime(t);
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

    // With reduced motion the screen is its last picture from the start. That is the last frame of the logo
    // video alone (the other two end empty), so only that one is fetched.
    const steps = (still ? PARTS.slice(0, 1) : PARTS).map(({ file, at }) => {
      const url = (extension: string) => videoFiles[`../../video/01-${file}.${extension}`] ?? '';
      // Only the gift paper, which the screen opens with, is fetched at once; see below.
      const video = mountVideo(
        { hevc: url('mov'), webm: url('webm') },
        { width: 360, height: 782 },
        { deferLoad: !still && at > HOLD_SECONDS },
      );
      // Like the background: it covers the screen, keeps its proportions and stays centered.
      Object.assign(video.element.style, { width: '100%', height: '100%' });
      root.append(video.element);
      return { video, at };
    });

    // The files are large (7 MB in all), so they are fetched in the order they are needed: each one once the
    // one shown before it can play through (or cannot be played). One that is still waiting when its time
    // comes starts to load then.
    const inOrder = [...steps].sort((a, b) => a.at - b.at);
    inOrder.forEach((step, index) => {
      const before = inOrder[index - 1]?.video.element;
      for (const event of ['canplaythrough', 'error']) before?.addEventListener(event, () => step.video.load(), { once: true });
    });

    // During the pause the gift video has not played yet, and a phone draws nothing of a video before it plays.
    // So its first frame lies under it as a picture, until the video shows frames of its own (or its time is over).
    const gift = steps.at(-1)!;
    const paper = document.createElement('img');
    paper.className = 'intro__paper';
    paper.alt = '';
    paper.src = PAPER;
    const showPaper = (seconds: number) => {
      const into = seconds - gift.at;
      const length = gift.video.element.duration;
      const videoShows = gift.video.element.currentTime > 0.03;
      paper.style.visibility = into < 0.03 || (!videoShows && !(into >= length)) ? '' : 'hidden';
    };
    if (!still) gift.video.element.before(paper);

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
        // With reduced motion there is no gift on the screen, so these texts do not show either.
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
      showPaper,
    );
    showPaper(0);

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
      // Figma has no progress bar on 01, and the Brevy logo of the header only on its first frame: the intro ends
      // with its own large logo. Sound and Close stay for the whole intro.
      hideProgress: true,
      logoOut: still ? { at: 0, seconds: 0.01 } : TEXT.out,
      destroy() {
        intro.destroy();
        root.remove();
      },
    };
  },
};
