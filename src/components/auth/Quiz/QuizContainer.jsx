import { useState } from 'react'
import QuizStep from './QuizStep'

const STEPS = [
  {
    title: "What are you interested in?",
    multiSelect: true,
    layout: 'grid',
    key: 'categories',
    options: [
      { value: 'AI & Tech',        label: 'AI & Tech'         },
      { value: 'EVs & Clean Energy', label: 'EVs & Clean Energy' },
      { value: 'Healthcare',       label: 'Healthcare'        },
      { value: 'Finance',          label: 'Finance'           },
      { value: 'Energy',           label: 'Energy'            },
      { value: 'Retail',           label: 'Retail'            },
      { value: 'Gaming',           label: 'Gaming'            },
      { value: 'Real Estate',      label: 'Real Estate'       },
    ],
  },
  {
    title: "What's your experience level?",
    multiSelect: false,
    layout: 'list',
    key: 'experience',
    options: [
      { value: 'learning',      label: 'Just learning',      desc: "I'm new to investing and want to learn" },
      { value: 'intermediate',  label: 'Some experience',    desc: "I've bought stocks before but still learning" },
      { value: 'advanced',      label: 'Experienced investor', desc: "I actively manage my own portfolio" },
    ],
  },
  {
    title: "What's your investment time horizon?",
    multiSelect: false,
    layout: 'list',
    key: 'horizon',
    options: [
      { value: 'short',  label: 'Short-term',  desc: 'Less than 1 year — I trade frequently' },
      { value: 'medium', label: 'Medium-term', desc: '1–3 years — steady growth' },
      { value: 'long',   label: 'Long-term',   desc: '3+ years — buy and hold' },
    ],
  },
  {
    title: "What's your risk tolerance?",
    multiSelect: false,
    layout: 'list',
    key: 'risk',
    options: [
      { value: 'conservative', label: 'Conservative', desc: "I prefer stable, lower-risk investments" },
      { value: 'balanced',     label: 'Balanced',     desc: "Mix of growth and stability" },
      { value: 'aggressive',   label: 'Aggressive',   desc: "I can handle big swings for big gains" },
    ],
  },
  {
    title: "Any stocks you already know?",
    multiSelect: true,
    layout: 'grid',
    key: 'knownStocks',
    options: [
      { value: 'AAPL',  label: 'AAPL' },
      { value: 'TSLA',  label: 'TSLA' },
      { value: 'AMZN',  label: 'AMZN' },
      { value: 'MSFT',  label: 'MSFT' },
      { value: 'NVDA',  label: 'NVDA' },
      { value: 'GOOGL', label: 'GOOGL' },
      { value: 'META',  label: 'META'  },
      { value: 'NFLX',  label: 'NFLX'  },
    ],
  },
]

export default function QuizContainer({ onComplete }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ categories: [], experience: [], horizon: [], risk: [], knownStocks: [] })

  const current = STEPS[step]
  const selected = answers[current.key] || []
  const canContinue = current.multiSelect ? selected.length > 0 : selected.length === 1

  function next() {
    if (!canContinue) return
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      onComplete({
        categories:  answers.categories,
        experience:  answers.experience[0] || 'learning',
        horizon:     answers.horizon[0]    || 'medium',
        risk:        answers.risk[0]       || 'balanced',
        knownStocks: answers.knownStocks,
      })
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  return (
    <div className="quiz-container active">
      {/* Progress dots */}
      <div className="progress-dots">
        {STEPS.map((_, i) => (
          <div key={i} className={`dot${i === step ? ' active' : ''}`} />
        ))}
      </div>

      <QuizStep
        title={current.title}
        options={current.options}
        multiSelect={current.multiSelect}
        layout={current.layout}
        selected={selected}
        onChange={val => setAnswers(a => ({ ...a, [current.key]: val }))}
      />

      {/* Footer */}
      <div className="quiz-footer active">
        {step > 0 && (
          <button className="btn-back" onClick={back}>←</button>
        )}
        <button
          className={`btn-next${canContinue ? ' enabled' : ''}`}
          onClick={next}
          disabled={!canContinue}
        >
          {step === STEPS.length - 1 ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
