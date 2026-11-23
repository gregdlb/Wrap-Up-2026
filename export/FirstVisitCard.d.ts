export interface FirstVisitCardData {
    /** Day of the first visit as `YYYY-MM-DD`, e.g. "2026-03-04". */
    date: string;
}

export interface FirstVisitCardLabels {
    /** Text of the sticker. */
    sticker: string;
}

export interface FirstVisitCardOptions extends WrapUpOptions {
    /** Locale for the month and weekday names. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<FirstVisitCardLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description of the card. */
    ariaLabel?: string;
    /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
    assetBaseUrl?: string;
}

export interface FirstVisitCardController extends WrapUpController {
    /** The dates the calendar flips through, as `YYYY-MM-DD`: the first one is on top at the start, the last is `date`. */
    readonly flipDates: string[];
}

/**
 * Mounts the 02 "First visit" calendar into `el` and scales it to fit that element.
 * The calendar flips from 1 January to `data.date`, a marker circles the day, and the "First visit" sticker pops in.
 */
export declare function mountFirstVisitCard(el: HTMLElement, data: FirstVisitCardData, options?: FirstVisitCardOptions): FirstVisitCardController;

/** Playback handle returned by every `mount*` function. */
interface WrapUpController {
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

interface WrapUpOptions {
    /** Called every time the timeline reaches its end, i.e. when the screen's time is up. */
    onComplete?: () => void;
    /** Start right after mounting. Defaults to false: the host calls `play()` when the screen is in. */
    autoplay?: boolean;
}
