/**
 * DemographicSurvey — Grouped multi-step form
 *
 * Collects user demographics after the timeline.
 * Required fields must be filled, optional ones can be skipped.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEMO_STEPS, type DemoField } from '../data/demographicQuestions'
import type { Demographics } from '../types/user'

interface Props {
  onComplete: (data: Demographics) => void
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const TOTAL_STEPS = DEMO_STEPS.length

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: DemoField
  value: string
  onChange: (val: string) => void
}) {
  if (field.type === 'text') {
    return (
      <input
        className="demo-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    )
  }

  if (field.type === 'select') {
    const options = field.options ?? []
    return (
      <div className="demo-chips">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`demo-chip ${value === opt ? 'demo-chip--active' : ''}`}
            onClick={() => onChange(value === opt ? '' : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (field.type === 'yesno') {
    return (
      <div className="demo-chips">
        {['Yes', 'No', 'Prefer not to say'].map(opt => (
          <button
            key={opt}
            type="button"
            className={`demo-chip ${value === opt ? 'demo-chip--active' : ''}`}
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
  const [error, setError] = useState<string | null>(null)

  const step = DEMO_STEPS[stepIdx]

  const setValue = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setError(null)
  }, [])

  const canAdvance = () => {
    for (const field of step.fields) {
      if (field.required && !values[field.key]?.trim()) {
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!canAdvance()) {
      const missing = step.fields.find(f => f.required && !values[f.key]?.trim())
      setError(`${missing?.label} is required.`)
      return
    }
    setError(null)

    if (stepIdx < TOTAL_STEPS - 1) {
      setStepIdx(stepIdx + 1)
    } else {
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
      setError(null)
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
                    <label className="demo-field-label">
                      {field.label}
                      {field.required && <span className="demo-field-req">*</span>}
                      {!field.required && <span className="demo-field-opt">optional</span>}
                    </label>
                    <FieldInput
                      field={field}
                      value={values[field.key] ?? ''}
                      onChange={val => setValue(field.key, val)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="demo-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
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
