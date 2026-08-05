/**
 * Dashboard — static mockup
 *
 * Shows module cards, upcoming tasks (mini-timeline),
 * and overall progress. Right sidebar is collapsible.
 * Account button moves to header when sidebar is collapsed.
 */

import { useState, useCallback, useEffect, useMemo, useRef, Component, type ReactNode, type ErrorInfo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile, markIntroSeen } from '../lib/profiles'
import { getModuleData } from '../lib/moduleProgress'
import { yearGroupOf, YEAR_GROUPS } from '../data/timelineData'
import type { ApplicationEntry } from '../data/applicationsChecklist'
import {
  deriveDeadlineEvents,
  nextDueForModule,
  upcomingEvents,
  APPLICATIONS_MODULE,
  APPLICATIONS_DATA_KEY,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import { EASE_OUT } from '../lib/designTokens'
import TimelinePage from './TimelinePage'
import CalendarPage from './CalendarPage'
import SettingsPage from './SettingsPage'
import type { Demographics } from '../types/user'
import FinancialAidModule from './FinancialAidModule'
import ApplicationTrackingModule from './ApplicationTrackingModule'
import EssaysModule from './EssaysModule'
import KnowledgeLibraryModule from './KnowledgeLibraryModule'
import FafsaIntro from './FafsaIntro'
import FafsaDefinition from './FafsaDefinition'

class ModuleErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Module crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: 'var(--text)', margin: 0 }}>Something went wrong</h2>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: 'rgba(var(--ink-rgb), 0.5)', maxWidth: 400, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            The Financial Aid module hit an error. Your data is safe in Supabase.
          </p>
          <pre style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-danger)', background: 'var(--tint-danger)', padding: '8px 14px', borderRadius: 8, maxWidth: 500, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onClose() }}
            style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--c-fresh)', color: '#fff', border: 'none', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Shared account dropdown content
function AccountDropdown({ firstName, onSignOut, onNavigate }: { firstName?: string | null; onSignOut?: () => void; onNavigate?: (page: string) => void }) {
  return (
    <>
      <div className="dash-dd-header">
        <span className="dash-dd-name">{firstName ?? 'User'}</span>
        <span className="dash-dd-role">Student</span>
      </div>
      <div className="dash-dd-divider" />
      <button className="dash-dd-item" onClick={() => onNavigate?.('profile')}><span>Profile</span></button>
      <button className="dash-dd-item" onClick={() => onNavigate?.('settings')}><span>Settings</span></button>
      <div className="dash-dd-divider" />
      <button className="dash-dd-item dash-dd-signout" onClick={onSignOut}>
        <span>Sign out</span>
      </button>
    </>
  )
}

interface Props {
  startIdx: number
  answers: Record<string, number>
  firstName?: string | null
  onSignOut?: () => void
}

const MODULES: { key: string; sub: string; color: string; emoji: string }[] = [
  { key: 'Knowledge Library',    sub: 'Start Here',         color: 'var(--c-lib)', emoji: '📚' },
  { key: 'Financial Aid',         sub: 'Scholarship Hunt',   color: 'var(--c-sen)', emoji: '💰' },
  { key: 'College Essays',        sub: 'Drafting Season',    color: 'var(--c-soph)', emoji: '🪶' },
  { key: 'Application Tracking',  sub: 'Building Your List', color: 'var(--c-jun)', emoji: '📋' },
]


export default function Dashboard({ startIdx, answers, firstName, onSignOut }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const group = yearGroupOf(startIdx)
  const [accountOpen, setAccountOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [page, setPage] = useState<'dashboard' | 'timeline' | 'calendar' | 'profile' | 'settings'>('dashboard')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click-outside or Escape
  useEffect(() => {
    if (!accountOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [accountOpen])

  // Profile editing state — seeded from Supabase profile
  const demo = profile?.demographics
  const [editingField, setEditingField] = useState<string | null>(null)
  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const startEdit = (field: string, currentValue: string) => {
    setProfileDraft(d => ({ ...d, [field]: currentValue }))
    setEditingField(field)
  }

  const saveField = useCallback(async (field: string) => {
    // Guard: prevent double-save (Enter fires saveField, then blur fires it again)
    if (editingField !== field) return
    if (!user || !profile) return
    const val = profileDraft[field]?.trim()
    if (val === undefined) { setEditingField(null); return }

    // Skip save if value hasn't changed
    const originalVal = field === 'display_name'
      ? (profile.display_name ?? '').trim()
      : ((demo as Record<string, string | null> | null)?.[field] ?? '').trim()
    if (val === originalVal) { setEditingField(null); return }

    setEditingField(null) // close editor immediately to prevent double-save from blur
    setSaving(true)

    const demoFallback: Demographics = {
      first_name: '', age: '', gender: '', nationality: '',
      race: null, hispanic: null, native_american: null, religion: null,
      zipcode: '', school: '', gpa: null, income_level: null, parent_education: null,
      parent_immigrants: null,
    }

    try {
      if (field === 'display_name') {
        const updatedDemo: Demographics = { ...(demo ?? demoFallback), first_name: val }
        await updateProfile(user.id, { display_name: val, demographics: updatedDemo })
      } else {
        const updatedDemo: Demographics = { ...(demo ?? demoFallback), [field]: val || null }
        await updateProfile(user.id, { demographics: updatedDemo })
      }
      await refreshProfile()
    } catch {
      // Re-open editor so user can retry
      setEditingField(field)
    }
    setSaving(false)
  }, [editingField, user, profile, demo, profileDraft, refreshProfile])

  const navigateFromDropdown = (p: string) => {
    setPage(p as typeof page)
    setAccountOpen(false)
  }

  const [openModule, setOpenModule] = useState<string | null>(null)
  const [showFafsaIntro, setShowFafsaIntro] = useState(false)
  const [showFafsaDef, setShowFafsaDef] = useState(false)
  // Next-due deadline per module card, derived from the student's college list.
  // Re-fetch whenever we return to the dashboard so newly-added colleges surface.
  const [apps, setApps] = useState<ApplicationEntry[]>([])
  useEffect(() => {
    if (openModule) return
    let cancelled = false
    getModuleData<ApplicationEntry[]>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY)
      .then((data) => { if (!cancelled) setApps(data ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [openModule])
  const deadlineEvents = useMemo(
    () => deriveDeadlineEvents(apps, { gradeStartIdx: startIdx }),
    [apps, startIdx],
  )
  const nextDueByModule = useMemo(() => {
    const now = new Date()
    const map: Record<string, DeadlineEvent | null> = {
      'Application Tracking': nextDueForModule(deadlineEvents, 'Application Tracking', now),
      'Financial Aid': nextDueForModule(deadlineEvents, 'Financial Aid', now),
    }
    return map
  }, [deadlineEvents])
  // Real upcoming deadlines for the "Upcoming" aside (replaces the old mock).
  const upcomingDeadlines = useMemo(() => upcomingEvents(deadlineEvents, new Date()), [deadlineEvents])

  // Sort modules by need (lower answer = higher priority)
  // TODO: use shared constants for module key mapping
  const sorted = [...MODULES].sort((a, b) => {
    const aScore = answers[a.key.toLowerCase().replace(/ /g, '-')] ?? 2
    const bScore = answers[b.key.toLowerCase().replace(/ /g, '-')] ?? 2
    return aScore - bScore
  })

  return (
    <motion.div
      className={`dash ${sidebarOpen ? '' : 'dash--aside-collapsed'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dash-grain" />

      {/* Left sidebar */}
      <nav className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <img src="/logos/logo-color.png" alt="Edvifi" className="dash-sidebar-logo-img" />
        </div>
        <div className="dash-sidebar-nav">
          {([
            { icon: '⊞', label: 'Dashboard', key: 'dashboard' as const },
            { icon: '◎', label: 'Timeline', key: 'timeline' as const },
            { icon: '▤', label: 'Calendar', key: 'calendar' as const },
            { icon: '◉', label: 'Profile', key: 'profile' as const },
            { icon: '⚙', label: 'Settings', key: 'settings' as const },
          ]).map((item, i) => (
            <motion.button
              key={item.label}
              className={`dash-nav-item ${page === item.key ? 'active' : ''}`}
              aria-current={page === item.key ? 'page' : undefined}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: EASE_OUT }}
              onClick={() => setPage(item.key)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Main content — switches based on page */}
      <main className="dash-main">
        {/* Header with account (collapsed sidebar) */}
        <div className="dash-header-bar">
          {!sidebarOpen && (
            <div className="dash-account" ref={dropdownRef}>
              <button
                className="dash-account-btn dash-account-btn--compact"
                onClick={() => setAccountOpen(o => !o)}
              >
                <span className="dash-account-avatar">
                  {firstName ? firstName[0].toUpperCase() : '?'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    className="dash-account-dropdown dash-account-dropdown--down"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                  >
                    <AccountDropdown firstName={firstName} onSignOut={onSignOut} onNavigate={navigateFromDropdown} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {page === 'dashboard' ? (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <div className="dash-header">
                <h1 className="dash-title">{firstName ? `Hey, ${firstName}` : 'Dashboard'}</h1>
                <p className="dash-subtitle">Your college prep modules. Click any module to open it.</p>
              </div>
              <div className="dash-modules">
                {sorted.map((mod, i) => (
                  <motion.div
                    key={mod.key}
                    className="dash-module"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: EASE_OUT }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    onClick={() => {
                      if (mod.key === 'Financial Aid' && !profile?.settings?.intros_seen?.includes('fafsa')) {
                        setShowFafsaIntro(true)
                      } else {
                        setOpenModule(mod.key)
                      }
                    }}
                  >
                    <div className="dash-module-banner" style={{ background: mod.color }}>
                      <span className="dash-module-emoji">{mod.emoji}</span>
                    </div>
                    <div className="dash-module-body">
                      <div className="dash-module-name-row">
                        <h3 className="dash-module-name">{mod.key}</h3>
                        {/* The chip's wash and border go through the event's `-rgb` twin:
                            `color + '18'` would render `var(--c-sen)18`, which browsers drop. */}
                        {nextDueByModule[mod.key] && (
                          <button
                            className="dash-module-due"
                            style={{ color: nextDueByModule[mod.key]!.color, background: `rgba(${nextDueByModule[mod.key]!.colorRgb}, 0.09)`, borderColor: `rgba(${nextDueByModule[mod.key]!.colorRgb}, 0.20)` }}
                            title={`Next due: ${nextDueByModule[mod.key]!.title} — ${nextDueByModule[mod.key]!.dateDisplay} · open in calendar`}
                            onClick={(e) => { e.stopPropagation(); setPage('calendar') }}
                          >
                            ⏰ <span className="dash-due-date">{nextDueByModule[mod.key]!.date.toLocaleString('default', { month: 'short', day: 'numeric' })}</span><span className="dash-due-sep"> · </span>{nextDueByModule[mod.key]!.shortTitle}
                          </button>
                        )}
                      </div>
                      <p className="dash-module-sub">{mod.sub}</p>
                      <div className="dash-module-footer">
                        <span className="dash-module-open">Open →</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}

          {page === 'timeline' && (
            <motion.div key="tl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <TimelinePage startIdx={startIdx} answers={answers} />
            </motion.div>
          )}

          {page === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <CalendarPage startIdx={startIdx} />
            </motion.div>
          )}

          {page === 'profile' && (() => {
            const displayName = profile?.display_name ?? firstName ?? 'Student'
            const email = profile?.email ?? user?.email ?? ''

            const editableField = (field: string, label: string, value: string | null | undefined, placeholder: string) => {
              const display = value || ''
              const isEditing = editingField === field
              return (
                <div className="pg-field">
                  <label className="pg-label">{label}</label>
                  {isEditing ? (
                    <div className="pg-input-row">
                      <input
                        className="pg-input pg-input--edit"
                        autoFocus
                        value={profileDraft[field] ?? ''}
                        onChange={e => setProfileDraft(d => ({ ...d, [field]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingField(null) }}
                        onBlur={() => saveField(field)}
                        disabled={saving}
                      />
                    </div>
                  ) : (
                    <div
                      className={`pg-input pg-input--clickable ${!display ? 'pg-input--empty' : ''}`}
                      onClick={() => startEdit(field, display)}
                    >
                      {display || placeholder}
                      <span className="pg-edit-icon">✎</span>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                <div className="dash-header">
                  <h1 className="dash-title">Profile</h1>
                  <p className="dash-subtitle">Your personal information and academic details.</p>
                </div>
                <div className="pg-grid">
                  <div className="pg-card">
                    <div className="pg-card-header">
                      <div className="pg-avatar" style={{ background: group.color }}>
                        {displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="pg-name">{displayName}</div>
                        <div className="pg-role">{group.label} · {group.grade} Grade</div>
                      </div>
                    </div>
                  </div>
                  <div className="pg-card">
                    <h3 className="pg-section-title">Personal Info</h3>
                    {editableField('display_name', 'Full Name', displayName, 'Enter your name')}
                    <div className="pg-field">
                      <label className="pg-label">Email</label>
                      <div className="pg-input pg-input--readonly">{email}</div>
                    </div>
                    {editableField('age', 'Age', demo?.age, 'Not set')}
                    {editableField('gender', 'Gender', demo?.gender, 'Not set')}
                    {editableField('nationality', 'Nationality', demo?.nationality, 'Not set')}
                  </div>
                  <div className="pg-card">
                    <h3 className="pg-section-title">Academic Details</h3>
                    <div className="pg-field-row">
                      <div className="pg-field">
                        <label className="pg-label">Grade Level</label>
                        <div className="pg-input pg-input--readonly">{group.grade} Grade</div>
                      </div>
                      <div className="pg-field">
                        <label className="pg-label">Year</label>
                        <div className="pg-input pg-input--readonly">{group.label}</div>
                      </div>
                    </div>
                    {editableField('school', 'School', demo?.school, 'Enter your school')}
                    {editableField('gpa', 'GPA (unweighted)', demo?.gpa, 'e.g. 3.7')}
                    {editableField('zipcode', 'Zip Code', demo?.zipcode, 'Enter zip code')}
                  </div>
                  <div className="pg-card">
                    <h3 className="pg-section-title">Background</h3>
                    {editableField('race', 'Race / Ethnicity', demo?.race, 'Not set')}
                    {editableField('religion', 'Religion', demo?.religion, 'Not set')}
                    {editableField('income_level', 'Household Income', demo?.income_level, 'Not set')}
                    {editableField('parent_education', 'Parent Education Level', demo?.parent_education, 'Not set')}
                  </div>
                </div>
              </motion.div>
            )
          })()}

          {page === 'settings' && <SettingsPage key="settings" />}
        </AnimatePresence>
      </main>

      {/* Sidebar toggle — fixed on the border */}
      <button
        className="dash-aside-toggle"
        onClick={() => { setSidebarOpen(o => !o); setAccountOpen(false) }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {sidebarOpen ? (
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>

      {/* Right sidebar — collapsible */}
      <aside className={`dash-aside ${sidebarOpen ? '' : 'dash-aside--collapsed'}`}>
        {/* Account — only in sidebar when open */}
        <div className="dash-account" ref={sidebarOpen ? dropdownRef : undefined}>
          <button
            className="dash-account-btn"
            onClick={() => setAccountOpen(o => !o)}
          >
            <span className="dash-account-avatar">
              {firstName ? firstName[0].toUpperCase() : '?'}
            </span>
            <span className="dash-account-name">{firstName ?? 'Account'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
              <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <AnimatePresence>
            {accountOpen && (
              <motion.div
                className="dash-account-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <AccountDropdown firstName={firstName} onSignOut={onSignOut} onNavigate={navigateFromDropdown} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current year */}
        <motion.div
          className="dash-year-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: EASE_OUT }}
        >
          <span className="dash-year-eyebrow">CURRENT YEAR</span>
          <div className="dash-year-row">
            <span className="dash-year-emoji">{
              group === YEAR_GROUPS[0] ? '🌱' :
              group === YEAR_GROUPS[1] ? '📚' :
              group === YEAR_GROUPS[2] ? '⚡' : '🎓'
            }</span>
            <div>
              <div className="dash-year-name">{group.label} Year</div>
              <div className="dash-year-grade">{group.grade} Grade</div>
            </div>
          </div>
        </motion.div>

        {/* Upcoming */}
        <motion.div
          className="dash-upcoming"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
        >
          <h3 className="dash-aside-title">Upcoming</h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="dash-upcoming-empty">
              Add colleges in Application Tracking to see their deadlines here.
            </p>
          ) : (
            upcomingDeadlines.slice(0, 4).map((event) => (
              <motion.div
                key={event.id}
                className="dash-upcoming-item"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.4, ease: EASE_OUT }}
              >
                <div className="dash-upcoming-bar" style={{ background: event.color }} />
                <div className="dash-upcoming-text">
                  <div className="dash-upcoming-title">{event.shortTitle}</div>
                  <div className="dash-upcoming-meta">
                    {event.module} · Due {event.date.toLocaleString('default', { month: 'short', day: 'numeric' })}{event.estimated ? ' · est.' : ''}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {upcomingDeadlines.length > 0 && (
            <button className="dash-show-all" onClick={() => setPage('calendar')}>
              {upcomingDeadlines.length > 4 ? `Show All (${upcomingDeadlines.length})` : 'Open Calendar'}
            </button>
          )}
        </motion.div>
      </aside>

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <FinancialAidModule
          open={openModule === 'Financial Aid'}
          onClose={() => setOpenModule(null)}
          year={startIdx <= 0 ? 9 : startIdx <= 1 ? 10 : startIdx <= 2 ? 11 : 12}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <KnowledgeLibraryModule
          open={openModule === 'Knowledge Library'}
          onClose={() => setOpenModule(null)}
          onOpenModule={(key) => setOpenModule(key)}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <ApplicationTrackingModule
          open={openModule === 'Application Tracking'}
          onClose={() => setOpenModule(null)}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <EssaysModule
          open={openModule === 'College Essays'}
          onClose={() => setOpenModule(null)}
        />
      </ModuleErrorBoundary>

      {/* FAFSA intro → definition → module chain */}
      <AnimatePresence>
        {showFafsaIntro && (
          <FafsaIntro
            onComplete={() => {
              setShowFafsaIntro(false)
              setShowFafsaDef(true)
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFafsaDef && (
          <FafsaDefinition
            onDismiss={() => {
              if (user) markIntroSeen('fafsa').then(refreshProfile).catch(() => {})
              setShowFafsaDef(false)
              setOpenModule('Financial Aid')
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
