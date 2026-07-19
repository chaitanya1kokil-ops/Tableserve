// TableServe app mark — a white rounded tile with a 3×3 grid of dots: ink top
// row + centre, a coral accent at bottom-centre, muted dots elsewhere. Used
// everywhere the brand icon appears; self-contained so it works on any surface.
export default function Logo({ className = 'h-8 w-8' }) {
  const bg = '#FFFFFF'
  const ink = '#18181B'
  const coral = '#FF5A43'
  const muted = '#DAD5CA'

  const dots = [
    [28, 28, ink], [48, 28, ink], [68, 28, ink],
    [28, 48, muted], [48, 48, ink], [68, 48, muted],
    [28, 68, muted], [48, 68, coral], [68, 68, muted],
  ]

  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="TableServe">
      <rect width="96" height="96" rx="26" fill={bg} />
      {dots.map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r="8.5" fill={fill} />
      ))}
    </svg>
  )
}
