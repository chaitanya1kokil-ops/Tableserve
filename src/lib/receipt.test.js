import { describe, it, expect } from 'vitest'
import { buildReceiptText } from './receipt'

const W = 32

// Minimal order shaped like the rows the print paths load from Supabase.
function makeOrder(overrides = {}) {
  return {
    id: 'a1b2c3d4-0000-0000-0000-00000000abcde',
    created_at: '2026-07-31T18:05:00.000Z',
    total: 24.5,
    items: [{ quantity: 2, name_snapshot: 'Butter Chicken', selected_options: [] }],
    ...overrides,
  }
}

const lines = (text) => text.split('\n')

describe('buildReceiptText', () => {
  it('fits every line within the 58mm roll width', () => {
    const text = buildReceiptText(
      makeOrder({
        notes: 'Extra napkins please',
        items: [{ quantity: 1, name_snapshot: 'Paneer Tikka', selected_options: [] }],
      }),
      { name: 'Royal Paan', currency: 'CAD' }
    )
    for (const line of lines(text)) {
      expect(line.length).toBeLessThanOrEqual(W)
    }
  })

  it('centers the restaurant name in caps and the short order id', () => {
    const text = buildReceiptText(makeOrder(), { name: 'Royal Paan', currency: 'CAD' })
    const [name, id] = lines(text)

    expect(name.trim()).toBe('ROYAL PAAN')
    // Last 5 chars of the id, uppercased.
    expect(id.trim()).toBe('#ABCDE')
    // Centered: leading pad is half the slack.
    expect(name.length - name.trimStart().length).toBe(Math.floor((W - 'ROYAL PAAN'.length) / 2))
  })

  it('truncates a name too long for the roll instead of wrapping', () => {
    const longName = 'The Extremely Long Restaurant Name That Overflows'
    const text = buildReceiptText(makeOrder(), { name: longName, currency: 'CAD' })
    const first = lines(text)[0]

    expect(first).toHaveLength(W)
    expect(first).toBe(longName.toUpperCase().slice(0, W))
  })

  it('lists each item with quantity and indents its selected options', () => {
    const text = buildReceiptText(
      makeOrder({
        items: [
          {
            quantity: 2,
            name_snapshot: 'Masala Chai',
            selected_options: [{ value: 'Extra hot' }, { name: 'Oat milk' }, { label: 'No sugar' }],
          },
          { quantity: 1, name_snapshot: 'Samosa', selected_options: null },
        ],
      }),
      { name: 'Royal Paan', currency: 'CAD' }
    )
    const rows = lines(text)

    expect(rows).toContain('2x Masala Chai')
    // value / name / label are all accepted option shapes.
    expect(rows).toContain('   - Extra hot')
    expect(rows).toContain('   - Oat milk')
    expect(rows).toContain('   - No sugar')
    // A non-array selected_options must not throw or emit option rows.
    expect(rows).toContain('1x Samosa')
    expect(rows.filter((r) => r.startsWith('   - '))).toHaveLength(3)
  })

  it('prints the total in the restaurant currency', () => {
    const cad = buildReceiptText(makeOrder({ total: 24.5 }), { name: 'R', currency: 'CAD' })
    expect(cad).toContain('TOTAL  $24.50')

    const inr = buildReceiptText(makeOrder({ total: 240 }), { name: 'R', currency: 'INR' })
    expect(inr).toMatch(/TOTAL {2}₹240\.00/)
  })

  it('falls back to a plain amount when the currency code is invalid', () => {
    const text = buildReceiptText(makeOrder({ total: 8 }), { name: 'R', currency: 'NOPE' })
    expect(text).toContain('TOTAL  $8.00')
  })

  it('defaults a missing or non-numeric total to zero', () => {
    expect(buildReceiptText(makeOrder({ total: null }), { name: 'R' })).toContain('TOTAL  $0.00')
    expect(buildReceiptText(makeOrder({ total: 'abc' }), { name: 'R' })).toContain('TOTAL  $0.00')
  })

  it('shows the customer name, falling back to the table label', () => {
    const named = buildReceiptText(
      makeOrder({ customer_name: 'Asha', table: { label: 'Table 4' } }),
      { name: 'R', currency: 'CAD' }
    )
    expect(lines(named)[3].trim()).toBe('Asha')

    const tableOnly = buildReceiptText(makeOrder({ table: { label: 'Table 4' } }), {
      name: 'R',
      currency: 'CAD',
    })
    expect(lines(tableOnly)[3].trim()).toBe('Table 4')
  })

  it('omits the who line entirely when there is no name or table', () => {
    const text = buildReceiptText(makeOrder(), { name: 'R', currency: 'CAD' })
    // Row 3 is the first rule when there is nobody to name.
    expect(lines(text)[3]).toBe('-'.repeat(W))
  })

  it('includes an order note only when one was left', () => {
    const withNote = buildReceiptText(makeOrder({ notes: 'Allergy: peanuts' }), { name: 'R' })
    expect(withNote).toContain('Note: Allergy: peanuts')

    const withoutNote = buildReceiptText(makeOrder(), { name: 'R' })
    expect(withoutNote).not.toContain('Note:')
  })

  it('survives an order with no items and no restaurant record', () => {
    const text = buildReceiptText(makeOrder({ items: null }), null)
    expect(lines(text)[0].trim()).toBe('ORDER')
    expect(text).toContain('TOTAL')
  })

  it('ends with blank feed lines so the ticket clears the cutter', () => {
    const text = buildReceiptText(makeOrder(), { name: 'R', currency: 'CAD' })
    expect(text.endsWith('\n\n\n\n')).toBe(true)
  })
})
