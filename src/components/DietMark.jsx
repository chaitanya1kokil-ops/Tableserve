// The classic Indian menu label: green square + dot = vegetarian,
// red = non-vegetarian. Renders nothing for unmarked items.
export default function DietMark({ diet }) {
  if (!diet) return null
  const color = diet === 'veg' ? '#16a34a' : '#dc2626'
  return (
    <span
      className="inline-grid h-4 w-4 flex-shrink-0 place-items-center rounded-[4px] border-2 bg-white"
      style={{ borderColor: color }}
      title={diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}
