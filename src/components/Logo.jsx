// TableServe mark — a dark rounded tile with a 3×3 QR-style dot grid and a
// coral accent. Self-contained (its own background), so it sits on any surface.
export default function Logo({ className = 'h-8 w-8' }) {
  const bg = '#18181B'
  const on = '#F5F1EA' // lit dots
  const off = '#2E2E33' // dim dots
  const coral = '#FF5A43'

  const dots = [
    [28, 28, on], [48, 28, on], [68, 28, on],
    [28, 48, off], [48, 48, on], [68, 48, off],
    [28, 68, off], [48, 68, coral], [68, 68, off],
  ]

  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="TableServe">
      <rect x="0" y="0" width="96" height="96" rx="26" fill={bg} />
      {dots.map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r="9.5" fill={fill} />
      ))}
    </svg>
  )
}
