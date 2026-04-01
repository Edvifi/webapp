/**
 * QuestionCard
 *
 * Appears in the timeline at year boundaries. Asks the user
 * a question about a module area with emoji response options.
 * Styled as a planner page like MilestoneCard but with a
 * different layout for the question + options.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { TimelineQuestion } from '../data/questions'

interface Props {
  question: TimelineQuestion
  side: 'left' | 'right'
  onAnswer: (questionId: string, value: number) => void
  onNext?: () => void
  currentAnswer?: number
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function QuestionCard({ question, side, onAnswer, onNext, currentAnswer }: Props) {
  const [selected, setSelected] = useState<number | undefined>(currentAnswer)

  const handleSelect = (value: number) => {
    setSelected(value)
    onAnswer(question.id, value)
    // Auto-advance after a brief pause so user sees their selection
    if (onNext) setTimeout(onNext, 500)
  }

  const fromX = side === 'right' ? 36 : -36

  return (
    <motion.div
      className="planner-card question-card"
      initial={{ opacity: 0, x: fromX, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -fromX * 0.6, scale: 0.96 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      style={{ '--accent': question.accent } as React.CSSProperties}
    >
      {/* Paper layers */}
      <div className="planner-paper planner-paper--back" />
      <div className="planner-paper planner-paper--mid" />

      <div className="planner-page question-page">
        <div className="planner-grain" />
        <div className="planner-lines" />

        {/* Binding holes */}
        <div className="planner-binding">
          {[0,1,2,3].map(i => <div key={i} className="binding-hole" />)}
        </div>

        {/* Question badge */}
        <motion.div
          className="question-badge"
          style={{ background: question.accent }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 20 }}
        >
          ?
        </motion.div>

        <div className="question-content">
          {/* Module label */}
          <motion.span
            className="question-module"
            style={{ color: question.accent }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14, duration: 0.4 }}
          >
            {question.module}
          </motion.span>

          {/* Question text */}
          <motion.h3
            className="question-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
          >
            {question.question}
          </motion.h3>

          {/* Options */}
          <div className="question-options">
            {question.options.map((opt, i) => (
              <motion.button
                key={opt.value}
                className={`question-option ${selected === opt.value ? 'selected' : ''}`}
                style={{
                  '--opt-accent': question.accent,
                  '--opt-bg': selected === opt.value ? question.accent + '18' : 'transparent',
                  '--opt-border': selected === opt.value ? question.accent + '44' : 'rgba(60,35,10,0.12)',
                } as React.CSSProperties}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.06, duration: 0.35, ease: EASE_OUT }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(opt.value)}
              >
                <span className="question-option-emoji">{opt.emoji}</span>
                <span className="question-option-label">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
