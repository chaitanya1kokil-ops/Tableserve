import { describe, it, expect } from 'vitest'
import { reorder, moveTo, applyOrder } from './reorder'

const rows = (...ids) => ids.map((id) => ({ id }))
const ids = (list) => list.map((r) => r.id)

describe('reorder', () => {
  const list = rows('a', 'b', 'c', 'd')

  it('moves a row up one place', () => {
    expect(ids(reorder(list, 'c', 'up').list)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('moves a row down one place', () => {
    expect(ids(reorder(list, 'b', 'down').list)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('moves a row to the top from anywhere', () => {
    expect(ids(reorder(list, 'd', 'top').list)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('refuses to move the first row up, or to the top again', () => {
    expect(reorder(list, 'a', 'up')).toBeNull()
    expect(reorder(list, 'a', 'top')).toBeNull()
  })

  it('refuses to move the last row down', () => {
    expect(reorder(list, 'd', 'down')).toBeNull()
  })

  it('returns null for an id that is not in the list', () => {
    expect(reorder(list, 'zzz', 'up')).toBeNull()
  })

  it('handles a single-row list', () => {
    expect(reorder(rows('only'), 'only', 'up')).toBeNull()
    expect(reorder(rows('only'), 'only', 'down')).toBeNull()
  })

  it('does not mutate the list it was given', () => {
    const original = rows('a', 'b', 'c')
    reorder(original, 'c', 'top')
    expect(ids(original)).toEqual(['a', 'b', 'c'])
  })

  it('numbers the result 0..n with no gaps', () => {
    const { orderMap } = reorder(list, 'd', 'top')
    expect([...orderMap.entries()].sort((x, y) => x[1] - y[1])).toEqual([
      ['d', 0],
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  })
})

describe('moveTo (drag and drop)', () => {
  it('inserts and shifts rather than swapping — #21 dropped on #2', () => {
    // 1..21, so index 20 is "#21" and index 1 is "#2".
    const list = rows(...Array.from({ length: 21 }, (_, i) => `i${i + 1}`))
    const { list: next } = moveTo(list, 'i21', 1)

    expect(ids(next).slice(0, 4)).toEqual(['i1', 'i21', 'i2', 'i3'])
    // the old #2 moved to #3, nothing was overwritten, nothing was lost
    expect(next).toHaveLength(21)
    expect(new Set(ids(next)).size).toBe(21)
  })

  it('shifts upward when dragging an early row later', () => {
    const list = rows('a', 'b', 'c', 'd', 'e')
    expect(ids(moveTo(list, 'a', 3).list)).toEqual(['b', 'c', 'd', 'a', 'e'])
  })

  it('is a no-op when dropped on itself', () => {
    expect(moveTo(rows('a', 'b', 'c'), 'b', 1)).toBeNull()
  })

  it('clamps an out-of-range destination instead of losing the row', () => {
    const list = rows('a', 'b', 'c')
    expect(ids(moveTo(list, 'a', 99).list)).toEqual(['b', 'c', 'a'])
    expect(ids(moveTo(list, 'c', -5).list)).toEqual(['c', 'a', 'b'])
  })

  it('returns null for an unknown id', () => {
    expect(moveTo(rows('a', 'b'), 'nope', 0)).toBeNull()
  })

  it('agrees with the buttons: moveTo(0) === reorder "top"', () => {
    const list = rows('a', 'b', 'c', 'd')
    expect(ids(moveTo(list, 'c', 0).list)).toEqual(ids(reorder(list, 'c', 'top').list))
  })
})

describe('applyOrder', () => {
  it('reorders the moved rows and leaves the rest alone', () => {
    const all = [
      { id: 'a', sort_order: 0 },
      { id: 'b', sort_order: 1 },
      { id: 'other', sort_order: 2 },
    ]
    const { orderMap } = reorder(rows('a', 'b'), 'b', 'up')
    expect(ids(applyOrder(all, orderMap))).toEqual(['b', 'a', 'other'])
  })

  it('leaves items in other categories untouched', () => {
    // Two categories whose sort_order values overlap — reindexing one must not
    // renumber or drop the other's rows.
    const all = [
      { id: 'cat1-x', category_id: 'c1', sort_order: 0 },
      { id: 'cat1-y', category_id: 'c1', sort_order: 1 },
      { id: 'cat2-p', category_id: 'c2', sort_order: 0 },
      { id: 'cat2-q', category_id: 'c2', sort_order: 1 },
    ]
    const cat1 = all.filter((r) => r.category_id === 'c1')
    const { orderMap } = reorder(cat1, 'cat1-y', 'up')
    const next = applyOrder(all, orderMap)

    // c1 flipped…
    expect(ids(next.filter((r) => r.category_id === 'c1'))).toEqual(['cat1-y', 'cat1-x'])
    // …and c2 kept both its rows in their original order.
    expect(ids(next.filter((r) => r.category_id === 'c2'))).toEqual(['cat2-p', 'cat2-q'])
    expect(next).toHaveLength(4)
  })

  it('does not mutate the collection it was given', () => {
    const all = [
      { id: 'a', sort_order: 0 },
      { id: 'b', sort_order: 1 },
    ]
    const { orderMap } = reorder(all, 'b', 'up')
    applyOrder(all, orderMap)
    expect(ids(all)).toEqual(['a', 'b'])
  })
})
