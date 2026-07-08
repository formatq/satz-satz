import type { Template } from './types'
import { KEY_SEPARATOR, initialIndices, keyFromIndices, nextValidIndex } from './navigation'

/**
 * Dataset invariants. Returns a list of human-readable violations (empty = valid).
 *
 * - every variant key is well-formed: one known value per dimension, in order
 * - every dimension value is used by at least one variant
 * - no empty sentences or translations
 * - connectivity: every variant is reachable from the initial one by
 *   single-dial moves (skip-invalid navigation must never strand the user)
 */
export function validateTemplate(template: Template): string[] {
  const errors: string[] = []
  const keys = Object.keys(template.variants)

  if (keys.length === 0) {
    return ['template has no variants']
  }

  for (const key of keys) {
    const parts = key.split(KEY_SEPARATOR)
    if (parts.length !== template.dimensions.length) {
      errors.push(`key "${key}": expected ${template.dimensions.length} parts, got ${parts.length}`)
      continue
    }
    parts.forEach((part, i) => {
      if (!template.dimensions[i].values.includes(part)) {
        errors.push(`key "${key}": "${part}" is not a value of dimension "${template.dimensions[i].id}"`)
      }
    })
  }

  template.dimensions.forEach((dim, i) => {
    for (const value of dim.values) {
      const used = keys.some((key) => key.split(KEY_SEPARATOR)[i] === value)
      if (!used) errors.push(`dimension "${dim.id}": value "${value}" is used by no variant`)
    }
  })

  for (const key of keys) {
    const variant = template.variants[key]
    if (!variant.de || variant.de.length === 0) errors.push(`variant "${key}": empty sentence`)
    if (!variant.ru || variant.ru.trim() === '') errors.push(`variant "${key}": empty translation`)
  }

  // Bail out before BFS if keys are malformed — indices would be garbage.
  if (errors.length > 0) return errors

  const reachable = new Set<string>()
  const queue = [initialIndices(template)]
  reachable.add(keyFromIndices(template, queue[0]))
  while (queue.length > 0) {
    const indices = queue.shift()!
    for (let dim = 0; dim < template.dimensions.length; dim++) {
      for (const direction of [1, -1] as const) {
        const next = indices.slice()
        next[dim] = nextValidIndex(template, indices, dim, direction)
        const key = keyFromIndices(template, next)
        if (!reachable.has(key)) {
          reachable.add(key)
          queue.push(next)
        }
      }
    }
  }
  for (const key of keys) {
    if (!reachable.has(key)) {
      errors.push(`variant "${key}" is unreachable from the initial variant by single-dial moves`)
    }
  }

  return errors
}
