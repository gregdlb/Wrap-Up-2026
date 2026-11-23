export interface MoneyRainOptions {
    /**
     * The element the money bursts out from, e.g. the container of PayCard.
     * Without it the burst starts at the middle of the layer, 70 % down, where the amount is on the Figma screen.
     */
    origin?: HTMLElement;
    /** Start right after mounting. Defaults to false: call `play()` from PayCard's `onRevealed`. */
    autoplay?: boolean;
    /** Called when the last bill has left the layer, about 3 s after `play()`. */
    onComplete?: () => void;
    /** Largest scale relative to the Figma size. Defaults to 1.15. */
    maxScale?: number;
}

export interface MoneyRainController {
    /** Resolved from the start: the rain is drawn in code and has no images to wait for. */
    readonly ready: Promise<void>;
    /** Starts the burst, or resumes it when paused. After it has finished, starts a new one. */
    play(): void;
    pause(): void;
    /** Stops and removes the layer. */
    destroy(): void;
}

/**
 * Mounts the 09 money rain as a canvas that fills `el`: bills and coins burst out from behind the amount
 * across the whole layer, into the arrangement of the Figma frame, then fall like confetti and leave through
 * the bottom, about 3 s in all. Drawn in code, no images.
 * Put the layer over the whole screen, above the card, and call `play()` from PayCard's `onRevealed`.
 * With the system's reduced motion there is no rain.
 */
export declare function mountMoneyRain(el: HTMLElement, options?: MoneyRainOptions): MoneyRainController;
