/**
 * ModuleChat — Guided LLM chat for a module
 *
 * Renders a chat interface with suggestion chips.
 * Uses the abstracted LLM provider (mock by default).
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chat, type ChatMessage } from '../lib/llm'

interface Props {
  /** Module-specific system prompt context */
  systemPrompt: string
  /** Suggested starter questions */
  suggestions: string[]
  /** Accent color for the module */
  color: string
  /** Module name shown in header */
  moduleName: string
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function ModuleChat({ systemPrompt, suggestions, color, moduleName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const response = await chat(updated, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const showSuggestions = messages.length === 0

  return (
    <div className="mchat">
      <div className="mchat-header">
        <div className="mchat-header-dot" style={{ background: color }} />
        <span className="mchat-header-title">{moduleName} Assistant</span>
        <span className="mchat-header-badge">AI</span>
      </div>

      <div className="mchat-body" ref={scrollRef}>
        {/* Welcome + suggestions */}
        {showSuggestions && (
          <motion.div
            className="mchat-welcome"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <p className="mchat-welcome-text">
              Ask me anything about <strong style={{ color }}>{moduleName.toLowerCase()}</strong>, or pick a question below.
            </p>
            <div className="mchat-suggestions">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  className="mchat-chip"
                  style={{ borderColor: color + '30', color }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: EASE_OUT }}
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`mchat-msg mchat-msg--${msg.role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              {msg.role === 'assistant' && (
                <div className="mchat-msg-avatar" style={{ background: color }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <div className={`mchat-bubble mchat-bubble--${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <div className="mchat-markdown" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            className="mchat-msg mchat-msg--assistant"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mchat-msg-avatar" style={{ background: color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mchat-bubble mchat-bubble--assistant mchat-typing">
              <span className="mchat-dot" />
              <span className="mchat-dot" />
              <span className="mchat-dot" />
            </div>
          </motion.div>
        )}

        {/* Follow-up suggestions after first response */}
        {messages.length > 0 && !loading && messages[messages.length - 1].role === 'assistant' && (
          <motion.div
            className="mchat-followups"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {suggestions
              .filter(s => !messages.some(m => m.content === s))
              .slice(0, 3)
              .map(s => (
                <button
                  key={s}
                  className="mchat-chip mchat-chip--small"
                  style={{ borderColor: color + '30', color }}
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form className="mchat-input-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="mchat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button
          className="mchat-send"
          type="submit"
          disabled={!input.trim() || loading}
          style={{ background: input.trim() ? color : undefined }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      <div className="mchat-disclaimer">
        AI responses are informational only. Verify with your school's financial aid office.
      </div>
    </div>
  )
}

/** Minimal markdown → HTML (bold, italic, headers, lists, line breaks) */
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/⚠️/g, '<span class="mchat-warn">⚠️</span>')
    .replace(/💡/g, '<span class="mchat-tip">💡</span>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}
