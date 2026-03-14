export default function RangeSelector({ ranges, active, onChange, color }) {
  return (
    <div className="time-range">
      {ranges.map(r => (
        <span
          key={r}
          className={`time-pill${active === r ? ' active' : ''}`}
          onClick={() => onChange(r)}
        >
          {r}
        </span>
      ))}
    </div>
  )
}
