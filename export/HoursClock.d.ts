export interface HoursClockData {
    /** Hours of care in the year, in full 24 h days: the number in the middle of the clock. */
    fullDays: number;
    /** The same care in hours, e.g. 1011. Used for the screen reader description. */
    hours: number;
}

export interface HoursClockLabels {
    /** Under the number. Shown in capitals. */
    fullDays: string;
    /** Singular of it, for exactly one day. */
    fullDay: string;
    /** Unit of `hours` in the screen reader description. */
    hours: string;
}

export interface HoursClockOptions extends WrapUpOptions {
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<HoursClockLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description of the clock. */
    ariaLabel?: string;
}

export type HoursClockController = WrapUpController;

/**
 * Mounts the 04 "Hours" clock into `el` and scales it to fit that element.
 * A round clock face; the progress arc sweeps round while the number counts up to the full days.
 */
export declare function mountHoursClock(el: HTMLElement, data: HoursClockData, options?: HoursClockOptions): HoursClockController;

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
