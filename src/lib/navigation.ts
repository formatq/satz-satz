import type { Template } from './types'

export const KEY_SEPARATOR = '|'

/**
 * Cyclic search for the next index accepted by `isOk`, starting one step away
 * from `current` in `direction`. Returns `current` if nothing else is valid.
 */
export function findNextValid(
  length: number,
  current: number,
  direction: 1 | -1,
  isOk: (index: number) => boolean,
): number {
  for (let step = 1; step <= length; step++) {
    const index = (((current + direction * step) % length) + length) % length
    if (isOk(index)) return index
  }
  return current
}

export function keyFromIndices(template: Template, indices: number[]): string {
  return template.dimensions
    .map((dim, i) => dim.values[indices[i]])
    .join(KEY_SEPARATOR)
}

export function indicesFromKey(template: Template, key: string): number[] {
  const parts = key.split(KEY_SEPARATOR)
  return template.dimensions.map((dim, i) => dim.values.indexOf(parts[i]))
}

/** Dial positions of the first key present in `variants` (never assume all-zeros is valid). */
export function initialIndices(template: Template): number[] {
  const firstKey = Object.keys(template.variants)[0]
  return indicesFromKey(template, firstKey)
}

/**
 * Next valid index for dimension `dim`, keeping all other dials where they are.
 * Skips values that don't combine into an existing variant.
 */
export function nextValidIndex(
  template: Template,
  indices: number[],
  dim: number,
  direction: 1 | -1,
): number {
  const values = template.dimensions[dim].values
  return findNextValid(values.length, indices[dim], direction, (candidate) => {
    const probe = indices.slice()
    probe[dim] = candidate
    return keyFromIndices(template, probe) in template.variants
  })
}
