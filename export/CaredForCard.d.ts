export interface CaredForPerson {
    /** First name, shown in the highlight. */
    name: string;
    /** Visits with this person in the year. */
    visits: number;
}

export interface CaredForCardData {
    /** One or more people, in the order they should appear (most visits first). */
    people: CaredForPerson[];
    /** Day of the first visit as `YYYY-MM-DD`. With one person the sticker reads "Since March 4". */
    since?: string;
}

export interface CaredForCardTargets {
    /**
     * Goes into the headline area, in the text flow under the tag: the name rows are drawn here.
     * The block is as tall as its rows; text placed after it moves down with the number of people.
     */
    names: HTMLElement;
    /** Covers the hands illustration (the 360 x 360 frame): the sticker is drawn here. Leave out for no sticker. */
    sticker?: HTMLElement;
}

export interface CaredForCardLabels {
    visit: string;
    visits: string;
    /** Word before the date on the sticker: "Since March 4". */
    since: string;
    /** Word after the count on the sticker for several people: "2 people, 214 visits". */
    people: string;
}

export interface CaredForCardOptions extends WrapUpOptions {
    /** Locale for the date and number formatting. Defaults to "en-US". */
    locale?: string;
    labels?: Partial<CaredForCardLabels>;
    /** Largest scale of the sticker layer relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
    assetBaseUrl?: string;
}

export type CaredForCardController = WrapUpController;

/**
 * Mounts the 08 "Who you cared for" pieces: the name rows into `targets.names` (the headline area)
 * and the sticker into `targets.sticker` (over the hands illustration). One controller runs both.
 *
 * One person gets a highlighted name with a heart and the sticker "Since March 4".
 * Several people get a row each, with a badge that counts their visits, and the sticker "2 people, 214 visits".
 */
export declare function mountCaredForCard(targets: CaredForCardTargets, data: CaredForCardData, options?: CaredForCardOptions): CaredForCardController;

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
