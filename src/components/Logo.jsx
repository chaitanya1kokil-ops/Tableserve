// TableServe mark — a 3×3 QR-style grid of dots with a coral accent.
// `tone="dark"` inverts the neutral dots for use on dark backgrounds.
export default function Logo({ className = 'h-8 w-8', tone = 'light' }) {
  const ink = '#18181B'
  const soft = tone === 'dark' ? 'rgba(255,255,255,0.85)' : '#E7E4DC'
  const inkDot = tone === 'dark' ? '#F4F4F5' : ink
  const coral = '#FF5A43'

  const dots = [
    [20, 20, inkDot], [48, 20, inkDot], [76, 20, inkDot],
    [20, 48, soft], [48, 48, inkDot], [76, 48, soft],
    [20, 76, soft], [48, 76, coral], [76, 76, soft],
  ]

  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="TableServe">
      {dots.map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r={13} fill={fill} />
      ))}
    </svg>
  )
}
