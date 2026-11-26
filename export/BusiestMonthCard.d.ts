export interface BusiestMonthCardLabels {
    /** Unit next to the number when it is exactly 1. */
    visit: string;
    visits: string;
    /** Unit of the `steady` variant, where the number is a monthly average. */
    perMonth: string;
}

export interface BusiestMonthCardOptions extends WrapUpOptions {
    /** See `BusiestMonthCardAnalyzeOptions.steadyThreshold`. */
    steadyThreshold?: number;
    /** Locale for the month letters and number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<BusiestMonthCardLabels>;
    /** Replaces the generated screen reader description of the card. */
    ariaLabel?: string;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /**
     * Month of the screen's garland and leaves, 1 = January: the number FallingLeaves gets.
     * It only sets `duration`: in March the garland video plays once and makes the screen longer than 6 s.
     * Defaults to the busiest month. Pass it with `weeks`, where the card cannot tell the month.
     */
    month?: number;
}

export interface BusiestMonthCardController extends WrapUpController {
    /** Variant and highlighted bars computed from the data, for the host's headline, copy and illustration. */
    readonly analysis: BusiestMonthCardAnalysis;
}

/**
 * Mounts the 05 "Busiest month" card into `el` and scales it to fit that element.
 * The card picks its own variant (peak, tie, steady, busiest week) from the data.
 */
export declare function mountBusiestMonthCard(el: HTMLElement, data: BusiestMonthCardData, options?: BusiestMonthCardOptions): BusiestMonthCardController;

export interface BusiestMonthCardWeek {
    /** Shown under the bar, e.g. "10/12". */
    label: string;
    value: number;
}

export interface BusiestMonthCardData {
    /** Visits for January..December. Exactly 12 numbers. */
    visitsPerMonth: number[];
    year: number;
    /** When provided, the card shows these weeks instead of the months (the "busiest week" variant). */
    weeks?: BusiestMonthCardWeek[];
}

export type BusiestMonthCardVariant = 'peak' | 'tie' | 'steady' | 'busiest_week';

export interface BusiestMonthCardBar {
    label: string;
    value: number;
    highlighted: boolean;
}

export interface BusiestMonthCardAnalysis {
    variant: BusiestMonthCardVariant;
    bars: BusiestMonthCardBar[];
    /** Indices of the bars that end up on brand-500. */
    highlighted: number[];
    /**
     * The bar the screen is about: its month drives the headline, the garland and the background.
     * With several equal maxima this is the latest one, as in the Figma "Tie" screen
     * (October in the headline, "same as July" in the body).
     */
    primaryIndex: number;
    /** The big number: the maximum, or the monthly average for `steady`. */
    value: number;
    /** What the big number counts. */
    unit: 'visits' | 'per_month';
    max: number;
    average: number;
}

export interface BusiestMonthCardAnalyzeOptions {
    /**
     * A year counts as `steady` when (max - min) / average is below this value.
     * Defaults to 0.22.
     */
    steadyThreshold?: number;
    /** Labels under the month bars, January first. Defaults to J F M A M J J A S O N D. */
    monthLabels?: string[];
}

/** Decides which variant of the card a user gets and which bars are highlighted. */
export declare function analyzeBusiestMonthCard(data: BusiestMonthCardData, options?: BusiestMonthCardAnalyzeOptions): BusiestMonthCardAnalysis;

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
