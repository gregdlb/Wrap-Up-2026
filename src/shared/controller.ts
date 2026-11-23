import gsap from 'gsap';
import { createStartGate } from './images';

/** Playback handle returned by every `mount*` function. */
export interface WrapUpController {
  /**
   * Resolves when all images of the component are downloaded and decoded.
   * Await it (for all components of a screen) before `play()`, so the screen starts complete.
   */
  readonly ready: Promise<void>;
  /**
   * Starts the animation, optionally after `delay` seconds. All timings are counted from this call.
   * Resumes when paused midway, restarts from 0 when already finished.
   * Called before `ready`, it waits for the images (2 s at most) and only then starts the clock;
   * an image that is still missing after that fades in when it arrives.
   */
  play(delay?: number): void;
  /** Freezes the animation (and a pending start delay) where it is. */
  pause(): void;
  /** Jumps to `t` seconds on the timeline. Keeps the current playing/paused state. */
  seek(t: number): void;
  /** Stops everything and removes the component's DOM from the host element. */
  destroy(): void;
  /**
   * Length of the whole screen in seconds, counted from `play()`.
   * The animation itself ends earlier and the component holds its final state until then.
   */
  readonly duration: number;
}

export interface WrapUpOptions {
  /** Called every time the timeline reaches its end, i.e. when the screen's time is up. */
  onComplete?: () => void;
  /** Start right after mounting. Defaults to false: the host calls `play()` when the screen is in. */
  autoplay?: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** A paused timeline that only lasts `seconds`, so animations added to it share the screen's length. */
export function holdTimeline(seconds: number): gsap.core.Timeline {
  return gsap.timeline({ paused: true }).to({}, { duration: seconds }, 0);
}

interface ControllerConfig {
  timeline: gsap.core.Timeline;
  /** When the component's images are in; without images it is ready at once. */
  ready?: Promise<void>;
  onComplete?: () => void;
  onDestroy: () => void;
}

/**
 * Wraps a paused GSAP timeline in the shared controller API.
 * When the system asks for reduced motion, the final state is rendered at once and
 * the controller only keeps the screen's time, so `duration` and `onComplete` stay the same.
 */
export function createController(config: ControllerConfig): WrapUpController {
  const { timeline: animation, ready, onComplete, onDestroy } = config;
  const gate = createStartGate(ready);
  let timeline = animation;
  if (prefersReducedMotion()) {
    const screenSeconds = animation.duration();
    animation.progress(1, true).kill();
    timeline = holdTimeline(screenSeconds);
  }

  let pendingStart: gsap.core.Tween | null = null;
  let destroyed = false;

  const cancelPendingStart = () => {
    pendingStart?.kill();
    pendingStart = null;
  };

  timeline.eventCallback('onComplete', () => onComplete?.());
  timeline.time(0, true);

  const start = (delay: number) => {
    if (destroyed) return;
    if (pendingStart) {
      pendingStart.resume();
      return;
    }
    if (timeline.progress() === 1) timeline.pause(0, true);
    if (delay <= 0 || timeline.time() > 0) {
      timeline.play();
      return;
    }
    pendingStart = gsap.delayedCall(delay, () => {
      pendingStart = null;
      timeline.play();
    });
  };

  return {
    ready: ready ?? Promise.resolve(),
    play(delay = 0) {
      if (destroyed) return;
      gate.whenOpen(() => start(delay));
    },
    pause() {
      gate.cancel();
      pendingStart?.pause();
      timeline.pause();
    },
    seek(t) {
      if (destroyed) return;
      cancelPendingStart();
      timeline.time(Math.min(Math.max(t, 0), timeline.duration()), true);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gate.cancel();
      cancelPendingStart();
      timeline.kill();
      onDestroy();
    },
    get duration() {
      return timeline.duration();
    },
  };
}
