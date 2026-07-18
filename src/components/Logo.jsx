// TableServe app mark — a dark rounded tile with a 3×3 grid of dots: cream top
// row + centre, a coral accent at bottom-centre, muted dots elsewhere. Used
// everywhere the brand icon appears; self-contained so it works on any surface.
export default function Logo({ className = 'h-8 w-8' }) {
  const bg = '#17161B'
  const cream = '#F7F3EC'
  const coral = '#FF5A43'
  const muted = '#2C2B31'

  const dots = [
    [28, 28, cream], [48, 28, cream], [68, 28, cream],
    [28, 48, muted], [48, 48, cream], [68, 48, muted],
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
