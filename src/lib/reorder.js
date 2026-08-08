/**
 * Move one menu item within its category.
 *
 * Only used for items — category ordering is untouched and keeps its own
 * existing implementation. Pure on purpose: the ordering maths is the part
 * worth testing.
 *
 * @param {Array<{id: string}>} list      rows in their current display order
 * @param {string}              id        the row being moved
 * @param {'up'|'down'|'top'}   direction where to move it
 * @returns {{ list: Array, orderMap: Map<string, number> } | null}
 *          the reordered list plus id -> new sort_order, or null when the move
 *          is impossible (unknown id, already at the end it is moving toward).
 */
export function reorder(list, id, direction) {
  const from = list.findIndex((row) => row.id === id)
  if (from === -1) return null
  return moveTo(list, id, direction === 'top' ? 0 : direction === 'up' ? from - 1 : from + 1)
}

/**
 * Move a row to an absolute position — what a drag-and-drop lands on.
 *
 * Insert-and-shift, so dropping the 21st row onto the 2nd makes it the 2nd and
 * pushes the old 2nd down to 3rd, rather than swapping the two.
 *
 * @param {Array<{id: string}>} list
 * @param {string} id       the row being moved
 * @param {number} toIndex  destination index, clamped into range
 * @returns {{ list: Array, orderMap: Map<string, number> } | null}
 */
export function moveTo(list, id, toIndex) {
  const from = list.findIndex((row) => row.id === id)
  if (from === -1) return null

  const to = Math.max(0, Math.min(toIndex, list.length - 1))
  if (to === from) return null

  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)

  return { list: next, orderMap: new Map(next.map((row, i) => [row.id, i])) }
}

/**
 * Apply an orderMap to the full collection and re-sort it.
 *
 * `all` holds every row across every group (all categories' items, say), so
 * rows outside the group keep their existing sort_order and simply sort around
 * the ones that moved.
 */
export function applyOrder(all, orderMap) {
  return [...all]
    .map((row) => (orderMap.has(row.id) ? { ...row, sort_order: orderMap.get(row.id) } : row))
    .sort((a, b) => a.sort_order - b.sort_order)
}
