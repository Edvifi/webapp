/**
 * FafsaModule — FAFSA & Financial Aid module page
 *
 * Left side: checklist of FAFSA steps with progress tracking.
 * Right side: guided AI chat for FAFSA questions.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import ModuleChat from './ModuleChat'

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const COLOR = '#C47A12'

interface ChecklistItem {
  id: string
  title: string
  description: string
  category: 'prepare' | 'apply' | 'after'
}

const CHECKLIST: ChecklistItem[] = [
  // Prepare
  { id: 'fsa-id',     title: 'Create your FSA ID',                description: 'You and a parent each need one at studentaid.gov', category: 'prepare' },
  { id: 'tax-docs',   title: 'Gather tax documents',              description: 'Prior-prior year federal tax returns and W-2s', category: 'prepare' },
  { id: 'bank-info',  title: 'Collect bank & investment info',    description: 'Current balances for savings, checking, investments', category: 'prepare' },
  { id: 'school-list', title: 'List your schools',                description: 'Add up to 20 schools to receive your FAFSA data', category: 'prepare' },
  // Apply
  { id: 'fill-fafsa', title: 'Complete the FAFSA',                description: 'File at studentaid.gov — takes about 30 minutes', category: 'apply' },
  { id: 'irs-link',   title: 'Link IRS data',                     description: 'Use direct data exchange for accurate tax info', category: 'apply' },
  { id: 'css-check',  title: 'Check if schools need CSS Profile', description: 'Some private colleges require an additional form', category: 'apply' },
  // After
  { id: 'sar-review', title: 'Review your SAI',                   description: 'Check your Student Aid Index on your submission summary', category: 'after' },
  { id: 'compare',    title: 'Compare award letters',             description: 'Look at net price, not just total aid offered', category: 'after' },
  { id: 'verify',     title: 'Complete verification if selected',  description: 'Submit requested documents to your school promptly', category: 'after' },
  { id: 'appeal',     title: 'Appeal if circumstances changed',    description: 'Contact financial aid office for professional judgment', category: 'after' },
]

const CATEGORIES = [
  { key: 'prepare' as const, label: 'Prepare', emoji: '📋' },
  { key: 'apply' as const,   label: 'Apply',   emoji: '✏️' },
  { key: 'after' as const,   label: 'After',   emoji: '✅' },
]

const SUGGESTIONS = [
  'What is the FAFSA?',
  'When is the deadline?',
  'Am I eligible for aid?',
  'What documents do I need?',
  'Am I dependent or independent?',
  'What is the SAI?',
  'FAFSA vs CSS Profile?',
  'Do I qualify for Pell Grants?',
]

const SYSTEM_PROMPT = `You are a helpful financial aid advisor for high school students navigating the FAFSA process.
You provide clear, accurate guidance about federal student aid, the FAFSA form, eligibility, deadlines, and related topics.
Always note when information may vary by state or institution. Recommend students verify specific details with their school's financial aid office.
Be encouraging and supportive — many students find this process intimidating.
If you're unsure about a specific detail (especially dollar amounts or dates), say so rather than guessing.`

const STORAGE_KEY = 'fafsa-checklist-v1'

function loadChecked(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

export default function FafsaModule({ onBack }: { onBack: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(loadChecked)

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const total = CHECKLIST.length
  const done = checked.size
  const pct = Math.round((done / total) * 100)

  return (
    <div className="fmod">
      {/* Header */}
      <motion.div
        className="fmod-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <button className="fmod-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div className="fmod-title-row">
          <span className="fmod-emoji">💰</span>
          <div>
            <h1 className="fmod-title">Financial Aid & FAFSA</h1>
            <p className="fmod-subtitle">Everything you need to file your FAFSA and maximize your aid.</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="fmod-progress">
          <div className="fmod-progress-bar">
            <motion.div
              className="fmod-progress-fill"
              style={{ background: COLOR }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          </div>
          <span className="fmod-progress-text" style={{ color: COLOR }}>{done}/{total} steps</span>
        </div>
      </motion.div>

      {/* Body: checklist + chat */}
      <div className="fmod-body">
        {/* Checklist */}
        <motion.div
          className="fmod-checklist"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE_OUT }}
        >
          {CATEGORIES.map((cat, ci) => (
            <div key={cat.key} className="fmod-cat">
              <motion.h3
                className="fmod-cat-title"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + ci * 0.08, duration: 0.4, ease: EASE_OUT }}
              >
                <span className="fmod-cat-emoji">{cat.emoji}</span>
                {cat.label}
              </motion.h3>
              {CHECKLIST.filter(item => item.category === cat.key).map((item, i) => {
                const isDone = checked.has(item.id)
                return (
                  <motion.div
                    key={item.id}
                    className={`fmod-item ${isDone ? 'fmod-item--done' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + ci * 0.08 + i * 0.04, duration: 0.35, ease: EASE_OUT }}
                    onClick={() => toggle(item.id)}
                  >
                    <div className={`fmod-check ${isDone ? 'fmod-check--done' : ''}`} style={isDone ? { background: COLOR, borderColor: COLOR } : {}}>
                      {isDone && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="fmod-item-text">
                      <span className="fmod-item-title">{item.title}</span>
                      <span className="fmod-item-desc">{item.description}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </motion.div>

        {/* Chat */}
        <motion.div
          className="fmod-chat-col"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
        >
          <ModuleChat
            systemPrompt={SYSTEM_PROMPT}
            suggestions={SUGGESTIONS}
            color={COLOR}
            moduleName="Financial Aid"
          />
        </motion.div>
      </div>

    </div>
  )
}
