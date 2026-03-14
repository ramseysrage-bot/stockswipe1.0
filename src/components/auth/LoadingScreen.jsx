import { useEffect, useState } from 'react'

export default function LoadingScreen({ categories = [], onComplete }) {
  const [progress, setProgress] = useState(0)
  const [visiblePills, setVisiblePills] = useState([])

  useEffect(() => {
    // Animate progress bar
    let p = 0
    const interval = setInterval(() => {
      p += 1.5
      setProgress(Math.min(p, 100))
      if (p >= 100) clearInterval(interval)
    }, 40)

    // Pop in pills with stagger
    categories.forEach((_, i) => {
      setTimeout(() => {
        setVisiblePills(prev => [...prev, i])
      }, 300 + i * 200)
    })

    // Complete after ~3s
    const done = setTimeout(onComplete, 2800)
    return () => { clearInterval(interval); clearTimeout(done) }
  }, [categories, onComplete])

  return (
    <div className="loading-screen active">
      <p className="loader-title">Building your feed…</p>
      <div className="loader-bar-bg">
        <div className="loader-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="loader-pills">
        {categories.map((cat, i) => (
          <div key={cat} className={`loader-pill${visiblePills.includes(i) ? ' visible' : ''}`}>
            {cat}
          </div>
        ))}
      </div>
    </div>
  )
}
