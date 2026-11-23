const NBSP = ' ';

/**
 * Keeps a number and what belongs to it on one line by turning the space between them into a no-break space:
 * "10 AM", "5:48 AM", "214 visits", "42 full days", "7h 20m", "Oct 12–18", "March 4", "Top 10%".
 * Everything else in the text can still wrap. Safe to call twice.
 */
export function keepTogether(text: string): string {
  return (
    text
      // A number and the word after it: "10 AM", "214 visits", "30 minutes".
      .replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`)
      // "42 full days" is one unit.
      .replace(/(\d full) (?=days?(?!\p{L}))/giu, `$1${NBSP}`)
      // Two short parts of one value: "7h 20m".
      .replace(/(\d\p{L}{1,3}) (?=\d)/gu, `$1${NBSP}`)
      // A name or month and its number: "Oct 12–18", "March 4", "Top 10%". Years stay free: "March 2026".
      .replace(/(\p{Lu}\p{Ll}{1,8}\.?) (?=\d{1,3}(?!\d))/gu, `$1${NBSP}`)
  );
}
