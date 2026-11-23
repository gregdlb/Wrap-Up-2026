export interface FallingLeavesLayers {
    /** Goes under the card. Gets the pieces Figma paints below the card's pages, and the snow. */
    back: HTMLElement;
    /** Goes above the card and the text. Gets the pieces Figma paints over the card's pages. Ignores taps. */
    front: HTMLElement;
}

export interface FallingLeavesData {
    /** 1 = January … 12 = December. Each month has its own watercolor pieces. */
    month: number;
    /**
     * The element BusiestMonthCard is mounted in. The pieces are then arranged around the card as in Figma.
     * Without it the card is assumed to sit centred at the bottom of the layers, as on the Figma screen.
     */
    anchor?: HTMLElement;
}

export interface FallingLeavesOptions {
    /** Start right after mounting. Defaults to false. */
    autoplay?: boolean;
    /** Largest scale relative to the Figma size. Defaults to 1.15, the same as the card. */
    maxScale?: number;
    /** Folder with the sprites, ending in "/". Defaults to the `assets` folder next to this module. */
    assetBaseUrl?: string;
}

export interface FallingLeavesController {
    /** Resolves when all sprites of the month are downloaded and decoded. Await it before `play()`. */
    readonly ready: Promise<void>;
    /**
     * Starts or resumes the loop. Called before `ready`, it waits for the sprites (2 s at most);
     * one that is still missing after that fades in when it arrives.
     */
    play(): void;
    pause(): void;
    /** Jumps to `t` seconds after the start, in both layers. Keeps the current playing/paused state. */
    seek(t: number): void;
    /** Stops the loop and removes both layers from their host elements. */
    destroy(): void;
}

/**
 * Mounts the month's falling watercolor pieces as two layers with one shared clock:
 * `layers.back` goes under the card, `layers.front` above it, following the layer order in Figma.
 * Each layer fills its element. Independent of BusiestMonthCard.
 */
export declare function mountFallingLeaves(layers: FallingLeavesLayers, data: FallingLeavesData, options?: FallingLeavesOptions): FallingLeavesController;
