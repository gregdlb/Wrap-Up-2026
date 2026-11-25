import { READY_TIMEOUT_SECONDS, createStartGate } from '../src/shared/images';
import type { Playable } from './screen';

/**
 * The animator's video on a demo screen, run like a component: `ready`, `play`, `pause`, `seek`,
 * and its last frame at once under `prefers-reduced-motion`.
 * The files have a transparent background: HEVC with alpha for Safari and iOS, WebM (VP9) with alpha
 * for the other browsers. It plays once and stays on its last frame.
 */
export interface VideoSources {
  /** HEVC with alpha in a `.mov`. */
  hevc: string;
  /** VP9 with alpha in a `.webm`. */
  webm: string;
}

export interface DemoVideo extends Playable {
  /** Place it on the screen; its size is the one passed to `mountVideo`. */
  element: HTMLVideoElement;
  ready: Promise<void>;
  /** Stops the video, frees its decoder and removes the element. */
  destroy(): void;
}

/** Just inside the last frame: a seek to the very end may show nothing in some browsers. */
const BEFORE_END_SECONDS = 0.01;
/** A drawn frame this close to the end counts as the last one. */
const LAST_FRAMES_SECONDS = 0.5;

function source(src: string, type: string): HTMLSourceElement {
  const node = document.createElement('source');
  node.src = src;
  node.type = type;
  return node;
}

/** Builds the `<video>` at `size` (CSS px). It does not start until `play()`. */
export function mountVideo(sources: VideoSources, size: { width: number; height: number }): DemoVideo {
  const video = document.createElement('video');
  // Attributes, not only properties: iOS reads `muted` and `playsinline` from the markup.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  video.className = 'demo-video';
  video.style.width = `${size.width}px`;
  video.style.height = `${size.height}px`;

  // The order matters. Safari takes the first one. A browser that plays HEVC but not its alpha (Chrome)
  // turns the bare "hvc1" down, because it only accepts a full codec string, and goes on to the WebM.
  const last = source(sources.webm, 'video/webm');
  video.append(source(sources.hevc, 'video/mp4; codecs="hvc1"'), last);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let destroyed = false;

  // Resolves when the video can play through (reduced motion: when its last frame is shown).
  // Also when it cannot be played, or does not load in time: the screen must not wait forever.
  const ready = new Promise<void>((resolve) => {
    const done = () => resolve();
    last.addEventListener('error', done, { once: true });
    video.addEventListener('error', done, { once: true });
    setTimeout(done, READY_TIMEOUT_SECONDS * 1000);
    if (still) {
      // Safari can report the jump as done about a second before the frame is on screen,
      // so where the browser can tell, the last frame must also have been drawn.
      let jumped = false;
      let drawn = typeof video.requestVideoFrameCallback !== 'function';
      const settle = () => {
        if (jumped && drawn) done();
      };
      video.addEventListener(
        'loadedmetadata',
        () => {
          const end = Math.max(video.duration - BEFORE_END_SECONDS, 0);
          const watch = () =>
            video.requestVideoFrameCallback((_now, frame) => {
              if (frame.mediaTime < end - LAST_FRAMES_SECONDS) return void watch();
              drawn = true;
              settle();
            });
          if (!drawn) watch();
          video.currentTime = end;
        },
        { once: true },
      );
      video.addEventListener(
        'seeked',
        () => {
          jumped = true;
          settle();
        },
        { once: true },
      );
    } else {
      video.addEventListener('canplaythrough', done, { once: true });
    }
  });
  const gate = createStartGate(ready);

  return {
    element: video,
    ready,
    play() {
      if (destroyed || still) return;
      gate.whenOpen(() => {
        if (destroyed) return;
        if (video.ended) video.currentTime = 0;
        // A start that a pause or the next screen interrupts rejects; that is not an error.
        video.play().catch(() => undefined);
      });
    },
    pause() {
      gate.cancel();
      video.pause();
    },
    seek(t) {
      if (destroyed || still) return;
      const end = Number.isFinite(video.duration) ? video.duration - BEFORE_END_SECONDS : t;
      video.currentTime = Math.min(Math.max(t, 0), end);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gate.cancel();
      video.pause();
      // Without its sources the element lets go of the decoder: phones only have a few.
      video.replaceChildren();
      video.load();
      video.remove();
    },
  };
}
