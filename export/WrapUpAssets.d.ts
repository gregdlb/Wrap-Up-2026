export interface PreloadOptions {
    /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
    assetBaseUrl?: string;
}

/**
 * Downloads and decodes the images the Wrap Up components use, ahead of the story:
 * the watercolor heart of the stickers and the FallingLeaves sprites of the given months
 * (1 = January; all twelve when left out). Resolves when everything is in; it never rejects.
 */
export declare function preloadWrapUpAssets(months?: number[], options?: PreloadOptions): Promise<void>;
