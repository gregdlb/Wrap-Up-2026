export interface TopCaregiverCardData {
    /** The caregiver is in the top this-many percent, by hours of care: 10 for "Top 10%". */
    topPercent: number;
    /**
     * Optional: how many caregivers fall into each band of hours, from fewest to most hours.
     * Any positive numbers; the tallest bar is scaled to the chart. Defaults to the curve drawn in Figma (20 bars).
     */
    distribution?: number[];
}

export interface TopCaregiverCardLabels {
    /** Word before the percentage. */
    top: string;
    /** Pill next to it. */
    chip: string;
    /** Under the left and right ends of the chart. */
    fewer: string;
    more: string;
    /** The pin. */
    you: string;
}

export interface TopCaregiverCardOptions extends WrapUpOptions {
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<TopCaregiverCardLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description of the card. */
    ariaLabel?: string;
}

export interface TopCaregiverCardController extends WrapUpController {
    /** Number of bars on the right that are highlighted as the top group. */
    readonly topBars: number;
}

/**
 * Mounts the 10 "Top caregiver" rank card into `el` and scales it to fit that element.
 * A chart of all caregivers by hours; the bars of the caregiver's top group turn brand-500 and get the "You" pin.
 */
export declare function mountTopCaregiverCard(el: HTMLElement, data: TopCaregiverCardData, options?: TopCaregiverCardOptions): TopCaregiverCardController;

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
