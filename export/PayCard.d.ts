export interface PayCardData {
    /** Amount earned in the year, in whole currency units. */
    earned: number;
    /** Number of paychecks. */
    paychecks: number;
    /** Year in the line under the amount. Defaults to the current year. */
    year?: number;
}

export interface PayCardLabels {
    /** Text on the cover. */
    scratch: string;
    /** Line under the amount; `{paychecks}` and `{year}` are filled in. */
    paychecks: string;
}

export interface PayCardOptions extends WrapUpOptions {
    /**
     * Called once, when the cover is wiped far enough (or tapped) and the amount is revealed.
     * Start MoneyRain and resume the story from here.
     */
    onRevealed?: () => void;
    /** Share of the cover (0–1) that has to be wiped before the rest is revealed. Defaults to 0.6. */
    revealAt?: number;
    /** Locale for number formatting. Defaults to "en-US". */
    locale?: string;
    /** ISO currency code. Defaults to "USD". */
    currency?: string;
    labels?: Partial<PayCardLabels>;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
}

export interface PayCardController extends WrapUpController {
    /** Reveals the amount without scratching, e.g. from an accessibility action. */
    reveal(): void;
    /** True once the amount is revealed. */
    readonly revealed: boolean;
}

/**
 * Mounts the 09 "Pay" scratch card into `el` and scales it to fit that element.
 * The card slides in, then waits: the user wipes the cover with a finger or the mouse (or taps it),
 * at about 60 % the rest is revealed, `onRevealed` fires and the amount counts up from 0.
 * The amount is private: it is not part of anything the share card exports.
 */
export declare function mountPayCard(el: HTMLElement, data: PayCardData, options?: PayCardOptions): PayCardController;

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
