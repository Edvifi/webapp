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
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

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
      if (!mountedRef.current) return
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      if (!mountedRef.current) return
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
                  <div className="mchat-markdown">{renderMarkdown(msg.content)}</div>
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
        AI responses are for informational purposes only. Always verify details with your school's financial aid office.
      </div>
    </div>
  )
}

/** Safe markdown → React elements (no dangerouslySetInnerHTML) */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length === 0) return
    elements.push(<ul key={key++}>{listItems.map((li, i) => <li key={i}>{inlineFormat(li)}</li>)}</ul>)
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { flushList(); elements.push(<br key={key++} />); continue }
    const headerMatch = trimmed.match(/^(#{2,4})\s+(.+)$/)
    if (headerMatch) {
      flushList()
      const Tag = headerMatch[1].length === 2 ? 'h3' : 'h4'
      elements.push(<Tag key={key++}>{inlineFormat(headerMatch[2])}</Tag>)
      continue
    }
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/)
    if (listMatch) { listItems.push(listMatch[1]); continue }
    flushList()
    elements.push(<p key={key++} style={{ margin: '2px 0' }}>{inlineFormat(trimmed)}</p>)
  }
  flushList()
  return elements
}

/** Format inline markdown (bold, italic) safely as React elements */
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const remaining = text
  let key = 0
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push(remaining.slice(lastIndex, match.index))
    if (match[1]) parts.push(<strong key={key++}>{match[1]}</strong>)
    else if (match[2]) parts.push(<em key={key++}>{match[2]}</em>)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex))
  return parts.length === 1 ? parts[0] : parts
}
