/** Return the longest prefix that fits; reserve overflow space only when needed. */
export function visibleToolbarCount(
  available: number,
  widths: number[],
  moreWidth: number,
  gap: number,
): number {
  if (!widths.length) return 0;
  const total =
    widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  if (total <= available) return widths.length;
  let used = 0,
    count = 0;
  for (const width of widths) {
    // Each visible tool has a gap before the More button (including the last tool).
    if (used + width + gap + moreWidth > available) break;
    used += width + gap;
    count++;
  }
  return count;
}
