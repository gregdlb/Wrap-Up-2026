export interface VisitsCountData {
    /** Visits completed in the year. */
    visits: number;
    /** First name of the person cared for, shown on the sticker ("With Rosa"). Without it there is no sticker. */
    personName?: string;
}

export interface VisitsCountLabels {
    /** Title on the plaque. Shown in capitals. */
    visits: string;
    /** Word before the name on the sticker. */
    with: string;
}

export interface VisitsCountOptions extends WrapUpOptions {
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<VisitsCountLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description. */
    ariaLabel?: string;
    /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
    assetBaseUrl?: string;
}

export type VisitsCountController = WrapUpController;

/**
 * Mounts the 03 "Visits" plaque with its counter and the "With …" sticker into `el`,
 * scaled to fit that element. Lay it over the door illustration, in the same box.
 */
export declare function mountVisitsCount(el: HTMLElement, data: VisitsCountData, options?: VisitsCountOptions): VisitsCountController;

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
