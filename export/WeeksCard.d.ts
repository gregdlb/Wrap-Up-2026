export interface WeeksCardData {
    /** Length of the streak: weeks in a row with at least one visit. */
    weeksInARow: number;
    /** Weeks shown in the grid, e.g. 48 for January to November. */
    totalWeeks: number;
    /**
     * Optional, one entry per week of the grid: true when the week had a visit.
     * Weeks with visits outside the streak are then shown in the lighter color, and the streak sits on the
     * longest run of true values. Without it the streak is the last `weeksInARow` weeks and the rest is empty.
     */
    weeks?: boolean[];
}

export interface WeeksCardLabels {
    /** Unit next to the number when it is exactly 1. */
    week: string;
    weeks: string;
    /** Text of the pill. */
    legend: string;
    /** Under the first and the last column. Default: "Jan" and the month the last week falls in. */
    from: string;
    to: string;
}

export interface WeeksCardOptions extends WrapUpOptions {
    /** Locale for month names and number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<WeeksCardLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description of the card. */
    ariaLabel?: string;
}

export interface WeeksCardController extends WrapUpController {
    /** Where the streak sits in the grid: 0-based index of its first and last week. */
    readonly streak: {
        start: number;
        end: number;
    };
}

/**
 * Mounts the 07 "Weeks in a row" card into `el` and scales it to fit that element.
 * One square per week; the streak fills in the brand color, square by square.
 */
export declare function mountWeeksCard(el: HTMLElement, data: WeeksCardData, options?: WeeksCardOptions): WeeksCardController;

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
