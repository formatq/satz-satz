/**
 * Clamped (non-cyclic) search for the next index accepted by `isAvailable`,
 * starting one step away from `current` in `direction`. Returns `current`
 * when the edge is reached without finding one — the selector has fixed
 * positions and does not wrap.
 */
export function stepClamped(
  length: number,
  current: number,
  direction: 1 | -1,
  isAvailable: (index: number) => boolean,
): number {
  for (let index = current + direction; index >= 0 && index < length; index += direction) {
    if (isAvailable(index)) return index
  }
  return current
}
