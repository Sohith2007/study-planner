import type { BlockKind } from '@/types'

/** Random UUID for new rows. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for very old runtimes (not expected in supported browsers).
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

/** Deterministic id for an auto-generated block: `auto:<topicId>:<kind>:<n>`. */
export function autoBlockId(topicId: string, kind: Exclude<BlockKind, 'task'>, n: number): string {
  return `auto:${topicId}:${kind}:${n}`
}
