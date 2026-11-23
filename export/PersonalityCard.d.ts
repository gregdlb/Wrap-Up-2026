/** The clock-in personalities of screen 06. The card looks the same for all of them; only the data differs. */
export type PersonalityType = 'early_bird' | 'night_owl' | 'midday_hero' | 'rock' | 'steady_one' | 'every_day_hero' | 'marathoner' | 'weekend_warrior' | 'juggler';

export type PersonalityValueType = 'time' | 'number' | 'percent' | 'duration';

export interface PersonalityCardData {
    /** Which personality this is. Kept on the card as `data-type`; decides the default of `chipCheck`. */
    type: PersonalityType | (string & {});
    /** Small title above the value, e.g. "Earliest clock-in". Shown in capitals. */
    label: string;
    /**
     * The big value, counted up from zero:
     * - `time`: "5:48" (shown as written, 12 or 24 hour) or minutes after midnight;
     * - `duration`: minutes, or text like "7h 20m";
     * - `percent`: 38 for "38%";
     * - `number`: a plain number.
     */
    value: number | string;
    valueType: PersonalityValueType;
    /** Line under the value, e.g. "AM · Tue, Mar 10". */
    sub: string;
    /** Text of the chip at the bottom, e.g. "Clocked in". */
    chip: string;
    /** Check mark in the chip. Defaults to true for `early_bird` and `night_owl`, as in Figma. */
    chipCheck?: boolean;
}

export interface PersonalityCardOptions extends WrapUpOptions {
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
    /** Replaces the generated screen reader description of the card. */
    ariaLabel?: string;
}

export type PersonalityCardController = WrapUpController;

/**
 * Mounts the 06 "Clock-in personality" stat card into `el` and scales it to fit that element.
 * One component for every personality type: label, a value that counts up, a sub line and a chip.
 */
export declare function mountPersonalityCard(el: HTMLElement, data: PersonalityCardData, options?: PersonalityCardOptions): PersonalityCardController;

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
