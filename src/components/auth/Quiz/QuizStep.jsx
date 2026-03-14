export default function QuizStep({ title, options, multiSelect, selected, onChange, layout = 'grid' }) {
  function toggle(val) {
    if (multiSelect) {
      onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
    } else {
      onChange([val])
    }
  }

  return (
    <div className="quiz-step active" style={{ flex: 1 }}>
      <h2 className="quiz-title">{title}</h2>
      <div className={layout === 'grid' ? 'grid-options' : 'list-options'}>
        {options.map(opt => {
          const isSelected = selected.includes(opt.value)
          return (
            <div
              key={opt.value}
              className={`opt-card${isSelected ? ' selected' : ''}`}
              onClick={() => toggle(opt.value)}
            >
              <div>
                <div className="opt-title">{opt.label}</div>
                {opt.desc && <div className="opt-desc">{opt.desc}</div>}
              </div>
              <div className="check-circle" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
