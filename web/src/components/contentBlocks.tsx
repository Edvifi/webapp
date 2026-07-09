/**
 * Shared content-block renderer for module checklist articles/quizzes.
 *
 * Used by FinancialAidModule (and any future
 * module with educational content). Pass `accentColor` to theme the
 * primary (link cards, list bullets, selected radio, etc.). The "completed"
 * / success green and the callout colors are intentionally fixed since
 * they convey semantic state, not module identity.
 */

import { useCallback, useState } from 'react'
import { C } from '../lib/designTokens'
import type { ContentBlock, QuizQuestion } from '../data/checklistContent'
import { CALLOUT_VARIANT } from './contentBlocks.constants'

const SUCCESS_GREEN = '#2D9E72'

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l3 3 5-5" />
  </svg>
)

const ExtLink = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7" />
    <path d="M8 1h3v3" />
    <line x1="11" y1="1" x2="5.5" y2="6.5" />
  </svg>
)

export function ChecklistTaskItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false)
  return (
    <button
      onClick={() => setChecked((v) => !v)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
        background: checked ? `${SUCCESS_GREEN}08` : C.bg, border: `1px solid ${checked ? `${SUCCESS_GREEN}30` : C.border}`,
        borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s ease',
        width: '100%',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${checked ? SUCCESS_GREEN : C.borderStrong}`,
        background: checked ? SUCCESS_GREEN : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', transition: 'all 0.12s ease',
      }}>
        {checked && <Check />}
      </span>
      <span style={{
        fontFamily: "'Outfit',sans-serif", fontSize: 13, color: checked ? C.textMuted : C.text,
        lineHeight: 1.5, textDecoration: checked ? 'line-through' : 'none',
      }}>
        {label}
      </span>
    </button>
  )
}

export function QuizBlock({ questions, accentColor }: { questions: QuizQuestion[]; accentColor: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const totalAnswered = Object.keys(revealed).length
  const totalCorrect = Object.entries(revealed).filter(
    ([qi]) => answers[Number(qi)] === questions[Number(qi)].correctIndex,
  ).length
  const allDone = totalAnswered === questions.length

  const select = useCallback((qi: number, oi: number) => {
    if (revealed[qi]) return
    setAnswers((prev) => ({ ...prev, [qi]: oi }))
  }, [revealed])

  const reveal = useCallback((qi: number) => {
    if (answers[qi] == null) return
    setRevealed((prev) => ({ ...prev, [qi]: true }))
  }, [answers])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {questions.map((q, qi) => {
        const isRevealed = revealed[qi] === true
        const isCorrect = isRevealed && answers[qi] === q.correctIndex
        return (
          <div key={qi} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>
              {qi + 1}. {q.question}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt, oi) => {
                const isSelected = answers[qi] === oi
                const isOptionCorrect = oi === q.correctIndex
                let borderColor = C.border
                let bg = C.bg
                let fontWeight = 400
                if (isSelected && !isRevealed) {
                  borderColor = `${accentColor}60`
                  bg = `${accentColor}08`
                  fontWeight = 500
                }
                if (isRevealed && isOptionCorrect) {
                  borderColor = `${SUCCESS_GREEN}60`
                  bg = `${SUCCESS_GREEN}12`
                  fontWeight = 600
                }
                if (isRevealed && isSelected && !isOptionCorrect) {
                  borderColor = '#B93A3A50'
                  bg = '#B93A3A0A'
                }
                return (
                  <button
                    key={oi}
                    onClick={() => select(qi, oi)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
                      borderRadius: 8, border: `1.5px solid ${borderColor}`, background: bg,
                      cursor: isRevealed ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.12s ease',
                      fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, fontWeight, lineHeight: 1.45,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${isSelected ? accentColor : C.borderStrong}`,
                      background: isSelected ? accentColor : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 10, transition: 'all 0.12s ease',
                    }}>
                      {isSelected && (isRevealed ? (isOptionCorrect ? '✓' : '✕') : '●')}
                    </span>
                    {opt}
                    {isRevealed && isOptionCorrect && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: SUCCESS_GREEN, flexShrink: 0 }}>Correct</span>
                    )}
                  </button>
                )
              })}
            </div>
            {!isRevealed && answers[qi] != null && (
              <button
                onClick={() => reveal(qi)}
                style={{
                  marginTop: 10, padding: '6px 16px', borderRadius: 8,
                  background: accentColor, color: '#fff', border: 'none',
                  fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Check Answer
              </button>
            )}
            {isRevealed && (
              <div style={{
                marginTop: 10, padding: '10px 13px', borderRadius: 8,
                background: isCorrect ? `${SUCCESS_GREEN}0D` : '#C47A120D',
                border: `1px solid ${isCorrect ? `${SUCCESS_GREEN}25` : '#C47A1225'}`,
              }}>
                <div style={{
                  fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700,
                  color: isCorrect ? SUCCESS_GREEN : '#C47A12',
                  marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {isCorrect ? 'Correct!' : 'Not quite'}
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.55 }}>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        )
      })}
      {allDone && (
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: totalCorrect === questions.length ? `${SUCCESS_GREEN}0D` : '#C47A120D',
          border: `1.5px solid ${totalCorrect === questions.length ? `${SUCCESS_GREEN}30` : '#C47A1230'}`,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: totalCorrect === questions.length ? SUCCESS_GREEN : '#C47A12', marginBottom: 4 }}>
            {totalCorrect}/{questions.length}
          </div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, fontWeight: 500 }}>
            {totalCorrect === questions.length
              ? 'Perfect score! You\'ve nailed this one.'
              : totalCorrect >= questions.length * 0.7
                ? 'Great job! Review the explanations above for the ones you missed.'
                : 'Good effort! Re-read the article to strengthen your understanding.'}
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentBlockRenderer({ block, accentColor }: { block: ContentBlock; accentColor: string }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 17, fontWeight: 400, color: C.text, margin: '22px 0 8px', lineHeight: 1.3 }}>
          {block.text}
        </h2>
      )
    case 'paragraph':
      return (
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.7, margin: '0 0 12px' }}>
          {block.text}
        </p>
      )
    case 'list':
      return (
        <ul style={{ margin: '0 0 14px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, lineHeight: 1.55, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, flexShrink: 0, marginTop: 7 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'callout': {
      const v = CALLOUT_VARIANT[block.variant] ?? CALLOUT_VARIANT.info
      return (
        <div style={{ padding: '12px 15px', borderRadius: 10, background: v.bg, border: `1px solid ${v.color}22`, display: 'flex', gap: 10, alignItems: 'flex-start', margin: '8px 0 14px' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${v.color}18`, color: v.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1, fontFamily: "'Outfit',sans-serif" }}>
            {v.icon}
          </span>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: v.color, marginBottom: 2 }}>
              {block.title}
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.6 }}>
              {block.text}
            </div>
          </div>
        </div>
      )
    }
    case 'quiz':
      return <QuizBlock questions={block.questions} accentColor={accentColor} />
    case 'checklist':
      return (
        <div style={{ margin: '8px 0 14px' }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
            {block.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {block.items.map((item, i) => (
              <ChecklistTaskItem key={i} label={item} />
            ))}
          </div>
        </div>
      )
    case 'link':
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px',
            background: C.surface, border: `1px solid ${accentColor}30`, borderRadius: 10,
            textDecoration: 'none', margin: '8px 0 14px', transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}60` }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}30` }}
        >
          <span style={{ color: accentColor, display: 'flex', flexShrink: 0 }}><ExtLink /></span>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: accentColor }}>
              {block.label}
            </div>
            {block.description && (
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                {block.description}
              </div>
            )}
          </div>
        </a>
      )
    default:
      return null
  }
}
