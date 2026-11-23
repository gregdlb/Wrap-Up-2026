export interface ThankYouCardData {
    /** The caregiver's first name, for the headline of the share image: "Maria’s year in care". */
    name: string;
    /** Day of the first visit as `YYYY-MM-DD`, for the footer of the share image: "Caring for Rosa since March 4". */
    since: string;
    /** Visits completed in the year. */
    visits: number;
    /**
     * First name of the person cared for: "visits with Rosa". Without it the line is just "visits",
     * and the share image has no "Caring for … since …" line.
     */
    personName?: string;
    /** Hours of care in the year. */
    hours: number;
    /** The same hours in full 24 h days, for the small title of the hours tile. */
    fullDays: number;
    /** Length of the streak of weeks with a visit. */
    weeksInARow: number;
    /** Name of the clock-in personality as it should read: "The Early Bird". */
    personality: string;
    /** Time for the line under the personality: "5:48 AM". */
    earliestClockIn: string;
}

export interface ThankYouCardLabels {
    youWereThere: string;
    visit: string;
    visits: string;
    /** Word before the person's name. */
    with: string;
    /** Title of the hours tile; `{days}` is filled in. */
    fullDays: string;
    hours: string;
    weeks: string;
    inARow: string;
    personalityTitle: string;
    /** Line under the personality; `{time}` is filled in. Replace it for personalities that are not about a time. */
    personalityNote: string;
    /** Share image: the tag in the top right corner. */
    shareTag: string;
    /** Share image: the headline; `{name}` is filled in. */
    shareTitle: string;
    /** Share image: bottom left. */
    shareSite: string;
    /** Share image: bottom right; `{name}` (the person cared for) and `{date}` are filled in. */
    shareSince: string;
}

export interface ThankYouCardOptions extends WrapUpOptions {
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<ThankYouCardLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
}

export interface ThankYouExportOptions {
    /** Pixels per Figma px. Defaults to 3, which gives a 1080 x 1920 image (9:16). */
    scale?: number;
}

export interface ThankYouCardController extends WrapUpController {
    /**
     * Renders the share image, the Figma frame "Base / 11 Share image" (9:16): the Brevy logo and the
     * "Wrap Up 2026" tag, the headline with the caregiver's name, the four tiles with their final numbers,
     * and the footer. No buttons, and nothing about pay. Resolves with a PNG blob for `@capacitor/share`.
     */
    exportImage(options?: ThankYouExportOptions): Promise<Blob>;
}

/**
 * Mounts the 11 "Thank you" tiles into `el` and scales them to fit that element.
 * The controller's `exportImage()` renders the same tiles as the image to share.
 */
export declare function mountThankYouCard(el: HTMLElement, data: ThankYouCardData, options?: ThankYouCardOptions): ThankYouCardController;

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
