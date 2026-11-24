/** Which screen the button sits on: the light ones, or the dark emerald ones (09, 10, 11). */
export type SoundButtonTone = 'light' | 'dark';

export interface SoundButtonLabels {
    /** Name of the button for screen readers. Its pressed state says whether the music is muted. */
    mute: string;
}

export interface SoundButtonOptions {
    /** State to start in. Defaults to false: the music plays. */
    muted?: boolean;
    /** Fill and icon color, the same as the Close button of the screen. Defaults to "light". */
    tone?: SoundButtonTone;
    /**
     * Called with the new state when the user taps the button (or `toggle()` is called).
     * Mute or unmute the app's music here. `setMuted()` does not call it.
     */
    onChange?: (muted: boolean) => void;
    labels?: Partial<SoundButtonLabels>;
}

export interface SoundButtonController {
    /** Whether the music is muted right now. */
    readonly muted: boolean;
    /** Shows the given state without calling `onChange`: for when the app changes the music by itself. */
    setMuted(muted: boolean): void;
    /** Switches the state, like a tap: the icon changes and `onChange` is called. */
    toggle(): void;
    /** Switches fill and icon color when the story moves to a screen of the other kind. */
    setTone(tone: SoundButtonTone): void;
    /** Removes the button from the host element. */
    destroy(): void;
}

/**
 * Mounts the mute / unmute button of the story's header into `el`: left of Close, 8 px apart.
 * It only shows and reports the state; the music itself is the app's.
 */
export declare function mountSoundButton(el: HTMLElement, options?: SoundButtonOptions): SoundButtonController;
