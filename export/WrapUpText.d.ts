/**
 * Keeps a number and what belongs to it on one line by turning the space between them into a no-break space:
 * "10 AM", "5:48 AM", "214 visits", "42 full days", "7h 20m", "Oct 12–18", "March 4", "Top 10%".
 * Everything else in the text can still wrap. Safe to call twice.
 */
export declare function keepTogether(text: string): string;
