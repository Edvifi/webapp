/**
 * DemographicSurvey — Grouped multi-step form
 *
 * Collects user demographics after the timeline.
 * Required fields must be filled, optional ones can be skipped.
 */

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEMO_STEPS, YES_NO_OPTIONS, demoFieldError, type DemoField } from '../data/demographicQuestions'
import type { Demographics } from '../types/user'

interface Props {
  onComplete: (data: Demographics) => void
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const TOTAL_STEPS = DEMO_STEPS.length
const MAX_TEXT_LENGTH = 120

function FieldInput({
  field,
  value,
  onChange,
  invalid,
}: {
  field: DemoField
  value: string
  onChange: (val: string) => void
  invalid: boolean
}) {
  const a11y = {
    'aria-invalid': invalid || undefined,
    'aria-describedby': `demo-${field.key}-note`,
  }
  if (field.type === 'text') {
    const max = field.maxLength ?? MAX_TEXT_LENGTH
    return (
      <input
        id={`demo-${field.key}`}
        className="demo-input"
        type="text"
        inputMode={field.inputMode}
        value={value}
        onChange={e => onChange(e.target.value.slice(0, max))}
        placeholder={field.placeholder}
        maxLength={max}
        {...a11y}
      />
    )
  }

  if (field.type === 'select' || field.type === 'yesno') {
    const options = field.type === 'yesno' ? YES_NO_OPTIONS : field.options ?? []
    return (
      <div className="demo-chips" role="group" aria-labelledby={`demo-${field.key}-label`} {...a11y}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`demo-chip ${value === opt ? 'demo-chip--active' : ''}`}
            aria-pressed={value === opt}
            onClick={() => onChange(value === opt ? '' : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  return null
}

export default function DemographicSurvey({ onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  // Every problem on the step at once, each under its own field: one at a
  // time at the foot of the card meant a Continue click per mistake.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const finishing = useRef(false)

  const step = DEMO_STEPS[stepIdx]

  const setValue = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setErrors(prev => {
      if (!(key in prev)) return prev
      const rest = { ...prev }
      delete rest[key]
      return rest
    })
  }, [])

  const handleNext = () => {
    const found: Record<string, string> = {}
    for (const field of step.fields) {
      const problem = demoFieldError(field, values[field.key] ?? '')
      if (problem) found[field.key] = problem
    }
    const first = Object.keys(found)[0]
    if (first) {
      setErrors(found)
      document.querySelector<HTMLElement>(`#demo-${first}, [aria-labelledby="demo-${first}-label"] button`)?.focus()
      return
    }
    setErrors({})

    if (stepIdx < TOTAL_STEPS - 1) {
      setStepIdx(stepIdx + 1)
    } else {
      if (finishing.current) return
      finishing.current = true

      // Build demographics object
      const demo: Demographics = {
        first_name: values.first_name ?? '',
        age: values.age ?? '',
        gender: values.gender ?? '',
        nationality: values.nationality ?? '',
        race: values.race || null,
        hispanic: values.hispanic || null,
        native_american: values.native_american || null,
        religion: values.religion || null,
        zipcode: values.zipcode ?? '',
        school: values.school ?? '',
        gpa: values.gpa || null,
        income_level: values.income_level || null,
        parent_education: values.parent_education || null,
        parent_immigrants: values.parent_immigrants || null,
      }
      onComplete(demo)
    }
  }

  const handleBack = () => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1)
      setErrors({})
    }
  }

  return (
    <motion.div
      className="demo-survey"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
    >
      <div className="demo-grain" />
      <div className="demo-orb demo-orb--1" />
      <div className="demo-orb demo-orb--2" />

      <div className="demo-container">
        {/* Progress */}
        <motion.div
          className="demo-progress"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <div className="demo-progress-bar">
            <motion.div
              className="demo-progress-fill"
              animate={{ width: `${((stepIdx + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          </div>
          <span className="demo-progress-text">
            {stepIdx + 1} of {TOTAL_STEPS}
          </span>
        </motion.div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIdx}
            className="demo-card"
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <div className="demo-card-grain" />
            <div className="demo-card-paper" />

            <div className="demo-card-inner">
              <h2 className="demo-card-title">{step.title}</h2>
              <p className="demo-card-subtitle">{step.subtitle}</p>

              <div className="demo-fields">
                {step.fields.map((field, i) => (
                  <motion.div
                    key={field.key}
                    className="demo-field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE_OUT }}
                  >
                    <label className="demo-field-label" id={`demo-${field.key}-label`} htmlFor={field.type === 'text' ? `demo-${field.key}` : undefined}>
                      {field.label}
                      {field.required && <span className="demo-field-req">*</span>}
                      {!field.required && <span className="demo-field-opt">optional</span>}
                    </label>
                    <FieldInput
                      field={field}
                      value={values[field.key] ?? ''}
                      onChange={val => setValue(field.key, val)}
                      invalid={!!errors[field.key]}
                    />
                    {/* Why we are asking, before they answer rather than after.
                        These are teenagers handing over income and background;
                        an unexplained box is the thing that makes people lie or
                        leave. A problem takes its place, so the card barely moves. */}
                    {errors[field.key]
                      ? <p className="demo-field-error" id={`demo-${field.key}-note`} role="alert">{errors[field.key]}</p>
                      : field.why && <p className="demo-field-why" id={`demo-${field.key}-note`}>{field.why}</p>}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          className="demo-nav"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT }}
        >
          <button
            className="demo-nav-btn demo-nav-btn--back"
            onClick={handleBack}
            disabled={stepIdx === 0}
            type="button"
          >
            ← Back
          </button>
          <button
            className="demo-nav-btn demo-nav-btn--next"
            onClick={handleNext}
            type="button"
          >
            {stepIdx === TOTAL_STEPS - 1 ? 'Finish' : 'Continue →'}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
