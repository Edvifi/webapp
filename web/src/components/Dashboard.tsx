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
import { useToast } from '../contexts/ToastContext'
import { updateProfile, markIntroSeen } from '../lib/profiles'
import { yearGroupOf } from '../data/timelineData'
import { useDeadlineEvents } from '../lib/useDeadlineEvents'
import { reportError } from '../lib/errorTracking'
import { resolveDeadlinePreferences } from '../lib/preferences'
import WeekOverview from './WeekOverview'
import DeadlinePanel from './DeadlinePanel'
import OverviewRail, { RailToggle } from './OverviewRail'
import {
  nextDueForModule,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import { EASE_OUT, CARET_SELECT } from '../lib/designTokens'
import { DEMO_FIELDS, YES_NO_OPTIONS, demoFieldError } from '../data/demographicQuestions'
import TimelinePage from './TimelinePage'
import CalendarPage from './CalendarPage'
import SettingsPage from './SettingsPage'
import type { Demographics } from '../types/user'
import FinancialAidModule from './FinancialAidModule'
import ApplicationTrackingModule from './ApplicationTrackingModule'
import FeeWaiverNotice from './FeeWaiverNotice'
import { FEATURES, moduleEnabled } from '../lib/features'
import { useApplications } from '../contexts/ApplicationsContext'
import { moduleStatusLines } from '../lib/moduleStatus'
import { feeWaiverEligibility, shouldShowFeeWaiverNotice, FEE_WAIVER_NOTICE_KEY } from '../lib/feeWaivers'
import EssaysModule from './EssaysModule'
import KnowledgeLibraryModule from './KnowledgeLibraryModule'
import FafsaIntro from './FafsaIntro'
import FafsaDefinition from './FafsaDefinition'
import { readRoute, writeRoute, type Page } from '../lib/hashRoute'

class ModuleErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Module crash:', error, info)
    reportError(error, { kind: 'module-boundary', componentStack: info.componentStack ?? '' })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: 'var(--text)', margin: 0 }}>Something went wrong</h2>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: 'rgba(var(--ink-rgb), 0.5)', maxWidth: 400, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            The Financial Aid module hit an error. Your data is safe in Supabase.
          </p>
          <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#B93A3A', background: '#FAEAEA', padding: '8px 14px', borderRadius: 8, maxWidth: 500, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onClose() }}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#2D9E72', color: '#fff', border: 'none', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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

/**
 * Every module the dashboard knows. What it offers is this, filtered by the
 *  feature flags — see lib/features.ts.
 *
 * `blurb` says what the module is for, in the student's terms. The old cards
 * carried only a two-word tagline ("Scholarship Hunt"), which reads as
 * decoration rather than an answer to "what is this and why would I open it".
 */
const MODULES: { key: string; sub: string; blurb: string; color: string; emoji: string }[] = [
  {
    key: 'Knowledge Library', sub: 'Start Here', color: '#3F5BA9', emoji: '📚',
    blurb: 'What actually matters in getting into college and paying for it, and where to do each part.',
  },
  {
    key: 'Financial Aid', sub: 'Scholarship Hunt', color: '#C47A12', emoji: '💰',
    blurb: 'Find scholarships you qualify for, track what you have applied to, and work out what a college will really cost.',
  },
  {
    key: 'College Essays', sub: 'Drafting Season', color: '#1D7FC4', emoji: '🪶',
    blurb: 'Draft every essay in one place, with word counts and status, so nothing lives in a document you cannot find later.',
  },
  {
    key: 'Application Tracking', sub: 'Building Your List', color: '#7048C8', emoji: '📋',
    blurb: 'Build your college list, keep every deadline and requirement together, and see where each application stands.',
  },
]


export default function Dashboard({ startIdx, answers, firstName, onSignOut }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  // A greeting takes the first name; firstName is the whole display name.
  const greetName = profile?.demographics?.first_name || firstName?.split(' ')[0]
  const toast = useToast()
  const group = yearGroupOf(startIdx)
  const [accountOpen, setAccountOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Page and open module come from the URL (#/page/module/tab), so a refresh
  // keeps the student where they were. See lib/hashRoute.
  const [page, setPage] = useState<Page>(() => readRoute().page)
  // Set when the week strip's "and N more" opens the calendar, so it lands on
  // the day the student clicked rather than today.
  const [calendarDay, setCalendarDay] = useState<Date | null>(null)
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
  const [fieldError, setFieldError] = useState<string | null>(null)
  // What was just saved, shown until the refreshed profile carries it.
  // Without it the old answer sat there for a second, so the edit looked lost.
  const [justSaved, setJustSaved] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const storedValue = useCallback((field: string) => field === 'display_name'
    ? (profile?.display_name ?? '').trim()
    : ((demo as Record<string, string | null> | null)?.[field] ?? '').trim(), [profile, demo])

  const startEdit = (field: string, currentValue: string) => {
    setProfileDraft(d => ({ ...d, [field]: currentValue }))
    setFieldError(null)
    setEditingField(field)
  }

  const saveValue = useCallback(async (field: string, val: string) => {
    if (!user || !profile || val === storedValue(field)) return true
    const forget = () => setJustSaved(s => { const rest = { ...s }; delete rest[field]; return rest })
    setJustSaved(s => ({ ...s, [field]: val }))
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
      return true
    } catch {
      toast.error("Couldn't save that — check your connection and try again.")
      return false
    } finally {
      forget()
      setSaving(false)
    }
  }, [user, profile, demo, storedValue, refreshProfile, toast])

  const saveField = useCallback(async (field: string) => {
    // Guard: prevent double-save (Enter fires saveField, then blur fires it again)
    if (editingField !== field) return
    const val = (profileDraft[field] ?? '').trim()
    // The same rules onboarding applies, so a GPA of 5.7 or a ZIP with letters
    // can't come in through the back door.
    const rules = field === 'display_name' ? { key: field, label: 'Name', type: 'text' as const, required: true } : DEMO_FIELDS[field]
    const problem = rules ? demoFieldError(rules, val) : null
    // Back into the box: Enter saves by blurring it, so a refused answer
    // otherwise leaves the student outside the field they need to fix.
    if (problem) { setFieldError(problem); document.getElementById(`pg-${field}`)?.focus(); return }
    setEditingField(null) // close editor immediately to prevent double-save from blur
    // Re-open the editor so the student can retry. On its own the field just
    // springs back, which reads as the app rejecting what they typed.
    if (!(await saveValue(field, val))) setEditingField(field)
  }, [editingField, profileDraft, saveValue])

  // The income question itself, not the top of a long page: the fee-waiver
  // prompt's "Add your income" used to land on Full Name.
  const [profileFocus, setProfileFocus] = useState<string | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const editIncome = () => { setOpenModule(null); setProfileFocus('income_level'); setPage('profile') }

  const navigateFromDropdown = (p: string) => {
    setPage(p as typeof page)
    setAccountOpen(false)
  }

  const [openModule, setOpenModule] = useState<string | null>(() => readRoute().module)
  // State → URL (a history entry per move), and back/forward → state. A
  // module's tab is its own (useRoutedTab); this leaves it in place.
  useEffect(() => {
    const r = readRoute()
    if (r.page !== page || r.module !== openModule) writeRoute({ page, module: openModule, tab: null })
  }, [page, openModule])
  useEffect(() => {
    const onHash = () => { const r = readRoute(); setPage(r.page); setOpenModule(r.module) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  // Dismissal persists via mark_intro_seen, but that round-trips through a
  // profile refresh; track it locally so the card goes away on the click.
  const [feeWaiverDismissed, setFeeWaiverDismissed] = useState(false)
  const [showFafsaIntro, setShowFafsaIntro] = useState(false)
  const [showFafsaDef, setShowFafsaDef] = useState(false)
  // Settings decide which dates are visible at all, and what counts as
  // urgent; resolved once here so every dated view on the page agrees.
  const deadlinePrefs = useMemo(
    () => resolveDeadlinePreferences(profile?.settings),
    [profile?.settings],
  )
  // Next-due deadline per module card, derived from the student's college list.
  const deadlines = useDeadlineEvents(startIdx, {
    // Entering or leaving a module refetches, so a scholarship added in one
    // shows up without the panel ever going dark.
    refreshKey: openModule ?? '',
    visibility: deadlinePrefs,
    // A tick edits a record in another module; say which, or the student
    // never learns the two are the same thing.
    onNotice: toast.info,
  })
  const {
    events: deadlineEvents, failed: deadlinesFailed, toggleDone, addOwn, removeOwn, correctDate,
    setNote, trackedScholarships,
  } = deadlines
  const { apps } = useApplications()
  const moduleStatus = useMemo(() => moduleStatusLines({
    colleges: apps.length,
    submitted: apps.filter((a) => a.status === 'submitted').length,
    scholarships: trackedScholarships,
  }), [apps, trackedScholarships])

  // One clock for every dated view on this page, so the week strip, the panel
  // and the module chips can't disagree about which day is today.
  const now = useMemo(() => new Date(), [])
  // The same panel the sidebar shows, handed to each module's Overview so a
  // student can see and tick what's due without leaving the module. Built
  // here, from the one hook above, so every copy writes through the same
  // handlers — a module loading its own would put a second owner on the
  // student's ticked-off list.
  const deadlineRail = (
    <DeadlinePanel
      events={deadlineEvents}
      now={now}
      failed={deadlinesFailed}
      onToggle={toggleDone}
      onAdd={addOwn}
      onRemove={removeOwn}
      onCorrect={correctDate}
      onNote={setNote}
      urgentWindow={deadlinePrefs.urgentWindow}
      onOpenCalendar={() => { setOpenModule(null); setCalendarDay(null); setPage('calendar') }}
      onOpenDay={(day) => { setOpenModule(null); setCalendarDay(day); setPage('calendar') }}
    />
  )

  // The same rail inside each module's Overview, sharing this page's open state.
  const moduleRail = (
    <OverviewRail open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)}>
      {deadlineRail}
    </OverviewRail>
  )

  const nextDueByModule = useMemo(() => {
    // A module card's "next due": not something already ticked off, and not a
    // date the student put on one of its tasks (those are steps toward a
    // deadline). Personal dates filed under a module still count, as they did
    // before task dates existed: the student chose to file them there.
    // Nor the federal FAFSA cut-off: it is a backstop twenty months out, and as
    // a new senior's "next" date it read as "no hurry", when their colleges'
    // and state's dates come far sooner.
    const pending = deadlineEvents.filter((e) => !e.done && !e.isTask && e.id !== 'fafsa-federal')
    const map: Record<string, DeadlineEvent | null> = {
      'Application Tracking': nextDueForModule(pending, 'Application Tracking', now),
      'Financial Aid': nextDueForModule(pending, 'Financial Aid', now),
    }
    return map
  }, [deadlineEvents, now])

  // Sort modules by need (lower answer = higher priority)
  // TODO: use shared constants for module key mapping
  const sorted = MODULES.filter((m) => moduleEnabled(m.key)).sort((a, b) => {
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

      {/* The page behind an open module is out of reach for a mouse; inert puts
          it out of reach for Tab and screen readers too. Contents, so the
          grid still sees the sidebar, main and aside as its own children. */}
      <div style={{ display: 'contents' }} inert={!!openModule}>
      {/* Left sidebar */}
      <nav className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <img src="/logos/logo-color.png" alt="Edvifi" className="dash-sidebar-logo-img" />
        </div>
        <div className="dash-sidebar-nav">
          {([
            { icon: '⊞', label: 'Dashboard', key: 'dashboard' as const },
            { icon: '▤', label: 'Calendar', key: 'calendar' as const },
            { icon: '◉', label: 'Profile', key: 'profile' as const },
            { icon: '⚙', label: 'Settings', key: 'settings' as const },
          ]).map((item, i) => (
            <motion.button
              key={item.label}
              className={`dash-nav-item ${page === item.key ? 'active' : ''}`}
              aria-current={page === item.key ? 'page' : undefined}
              // The label hides on a phone, which left only a glyph to read out.
              aria-label={item.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: EASE_OUT }}
              onClick={() => setPage(item.key)}
            >
              <span className="dash-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Main content — switches based on page */}
      <main className="dash-main" ref={mainRef}>
        {/* Header with account (collapsed sidebar) */}
        <div className="dash-header-bar">
          {!sidebarOpen && (
            <div className="dash-account" ref={dropdownRef}>
              <button
                className="dash-account-btn dash-account-btn--compact"
                onClick={() => setAccountOpen(o => !o)}
                // Collapsed, the only text in here was the avatar's letter, so
                // a photo would leave the button with no name at all.
                aria-label={firstName ? `Account: ${firstName}` : 'Account'}
                aria-expanded={accountOpen}
              >
                <Avatar url={profile?.avatar_url} firstName={firstName} />
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
          )}
        </div>

        {/* Each page starts at its top. The scroller is shared, so Settings
            used to open as far down as Profile had been read. */}
        <AnimatePresence mode="wait" onExitComplete={() => mainRef.current?.scrollTo(0, 0)}>
          {page === 'dashboard' ? (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <div className="dash-header">
                <h1 className="dash-title">{greetName ? `Hey, ${greetName}` : 'Dashboard'}</h1>
                {/* Day one is otherwise an empty room: four cards with no
                    dates, an empty week and a panel whose only instruction is
                    buried in its own empty state. The cards are already
                    ordered by the onboarding answers — least confident first —
                    and nothing said so, which made the ordering invisible. */}
                <p className="dash-subtitle">
                  {deadlineEvents.length === 0 && sorted[0]
                    ? <>New here? Start with <button className="dash-subtitle-link" onClick={() => setOpenModule(sorted[0].key)}>{sorted[0].key}</button> — we put it first based on your answers.</>
                    : 'Your college prep modules. Click any module to open it.'}
                </p>
              </div>
              {!feeWaiverDismissed
                && shouldShowFeeWaiverNotice(demo?.income_level, profile?.settings?.intros_seen) && (
                <FeeWaiverNotice
                  eligibility={feeWaiverEligibility(demo?.income_level)}
                  variant="dashboard"
                  // Students who (may) qualify go straight to the Applications module,
                  // where the fee-waiver guidance and their school list live;
                  // students with no income on file go to the profile to add it.
                  onPrimary={() => {
                    if (feeWaiverEligibility(demo?.income_level) === 'unknown') editIncome()
                    else setOpenModule('Application Tracking')
                  }}
                  onDismiss={() => {
                    setFeeWaiverDismissed(true)
                    if (user) markIntroSeen(FEE_WAIVER_NOTICE_KEY).then(refreshProfile).catch(() => {})
                  }}
                />
              )}
              <div className="dash-modules">
                {sorted.map((mod, i) => (
                  <motion.div
                    key={mod.key}
                    className="dash-module"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: EASE_OUT }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    onClick={() => {
                      if (mod.key === 'Financial Aid' && !profile?.settings?.intros_seen?.includes('fafsa')) {
                        setShowFafsaIntro(true)
                      } else {
                        setOpenModule(mod.key)
                      }
                    }}
                  >
                    <span
                      className="dash-module-tile"
                      style={{ background: mod.color }}
                      aria-hidden="true"
                    >
                      {mod.emoji}
                    </span>
                    <div className="dash-module-body">
                      <h3 className="dash-module-name">{mod.key}</h3>
                      <p className="dash-module-sub">{mod.blurb}</p>
                      {/* What is in there, and what is next. The pill used to
                          sit beside the title in the module's own colour,
                          which made the loudest thing on the row a date the
                          panel to the right already lists. */}
                      <div className="dash-module-meta">
                        {moduleStatus[mod.key] && <span>{moduleStatus[mod.key]}</span>}
                        {moduleStatus[mod.key] && nextDueByModule[mod.key] && (
                          <span className="dash-module-sep" aria-hidden="true">·</span>
                        )}
                        {nextDueByModule[mod.key] && (
                          <button
                            className="dash-module-due"
                            title={`Next due: ${nextDueByModule[mod.key]!.title} — ${nextDueByModule[mod.key]!.dateDisplay} · open in calendar`}
                            onClick={(e) => { e.stopPropagation(); setPage('calendar') }}
                          >
                            Next{' '}
                            <span className="dash-due-date">
                              {/* A junior's next date can be a year out; without the year, "Nov 1" reads as next week. */}
                              {nextDueByModule[mod.key]!.date.toLocaleString('default', {
                                month: 'short', day: 'numeric',
                                ...(nextDueByModule[mod.key]!.date.getTime() - now.getTime() > 183 * 86_400_000 ? { year: 'numeric' } : {}),
                              })}
                            </span>
                            <span className="dash-due-sep"> · </span>
                            {nextDueByModule[mod.key]!.shortTitle}
                            {nextDueByModule[mod.key]!.estimated ? ' · est.' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="dash-module-open" aria-hidden="true">Open →</span>
                  </motion.div>
                ))}
              </div>
              <WeekOverview
                events={deadlineEvents}
                now={now}
                onOpenDay={(day) => { setCalendarDay(day); setPage('calendar') }}
                onToggle={toggleDone}
                onRemove={removeOwn}
                onCorrect={correctDate}
                onNote={setNote}
              />
            </motion.div>
          ) : null}

          {page === 'timeline' && (
            <motion.div key="tl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <TimelinePage startIdx={startIdx} answers={answers} />
            </motion.div>
          )}

          {page === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <CalendarPage deadlines={deadlines} initialDay={calendarDay} />
            </motion.div>
          )}

          {page === 'profile' && (() => {
            const displayName = profile?.display_name ?? firstName ?? 'Student'
            const email = profile?.email ?? user?.email ?? ''

            // One row per answer. Questions onboarding asked with fixed choices
            // stay fixed choices here: income and the rest feed fee-waiver and
            // scholarship matching, which can't read free text.
            const profileField = (field: string, label?: string) => {
              const rules = DEMO_FIELDS[field]
              const name = label ?? rules?.label ?? field
              const value = justSaved[field] ?? storedValue(field)
              const labelId = `pg-${field}-label`
              if (rules && rules.type !== 'text') {
                const options = rules.type === 'yesno' ? YES_NO_OPTIONS : rules.options ?? []
                return (
                  <div className="pg-field">
                    <label className="pg-label" id={labelId} htmlFor={`pg-${field}`}>{name}</label>
                    <select
                      id={`pg-${field}`}
                      className={`pg-input pg-select ${!value ? 'pg-input--empty' : ''}`}
                      style={CARET_SELECT}
                      value={value}
                      disabled={saving}
                      autoFocus={profileFocus === field}
                      onBlur={() => setProfileFocus(null)}
                      onChange={e => void saveValue(field, e.target.value)}
                    >
                      <option value="">Not set</option>
                      {/* An older free-text answer still shows, rather than reading as unset. */}
                      {value && !options.includes(value) && <option value={value}>{value}</option>}
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )
              }
              // The example lives in the box; an empty row read "e.g. American,
              // Indian, Nigerian" as if that were the answer.
              const placeholder = field === 'display_name' ? 'Enter your name' : 'Not set'
              const isEditing = editingField === field
              return (
                <div className="pg-field">
                  <label className="pg-label" id={labelId} htmlFor={isEditing ? `pg-${field}` : undefined}>{name}</label>
                  {isEditing ? (
                    <>
                      <div className="pg-input-row">
                        <input
                          id={`pg-${field}`}
                          className="pg-input pg-input--edit"
                          autoFocus
                          inputMode={rules?.inputMode}
                          maxLength={rules?.maxLength ?? 120}
                          placeholder={rules?.placeholder}
                          value={profileDraft[field] ?? ''}
                          aria-invalid={!!fieldError || undefined}
                          aria-describedby={fieldError ? `pg-${field}-error` : undefined}
                          onChange={e => { setFieldError(null); setProfileDraft(d => ({ ...d, [field]: e.target.value })) }}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setFieldError(null); setEditingField(null) } }}
                          onBlur={() => saveField(field)}
                          disabled={saving}
                        />
                      </div>
                      {fieldError && <p className="pg-field-error" id={`pg-${field}-error`} role="alert">{fieldError}</p>}
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`pg-input pg-input--clickable ${!value ? 'pg-input--empty' : ''}`}
                      aria-labelledby={`${labelId} pg-${field}-value`}
                      onClick={() => startEdit(field, value)}
                    >
                      <span id={`pg-${field}-value`}>{value || placeholder}</span>
                      <span className="pg-edit-icon" aria-hidden="true">✎</span>
                    </button>
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
                    {profileField('display_name', 'Full Name')}
                    <div className="pg-field">
                      <label className="pg-label">Email</label>
                      <div className="pg-input pg-input--readonly">{email}</div>
                    </div>
                    {profileField('age')}
                    {profileField('gender')}
                    {profileField('nationality')}
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
                    {profileField('school', 'School')}
                    {profileField('gpa')}
                    {profileField('zipcode')}
                  </div>
                  <div className="pg-card">
                    <h3 className="pg-section-title">Background</h3>
                    {profileField('race')}
                    {profileField('hispanic')}
                    {profileField('native_american')}
                    {profileField('religion')}
                  </div>
                  <div className="pg-card" id="profile-family">
                    <h3 className="pg-section-title">Family</h3>
                    {profileField('income_level')}
                    {profileField('parent_education')}
                    {profileField('parent_immigrants')}
                  </div>
                </div>
              </motion.div>
            )
          })()}

          {page === 'settings' && <SettingsPage key="settings" />}
        </AnimatePresence>
      </main>

      {/* Sidebar toggle — fixed on the border */}
      <RailToggle
        className="dash-aside-toggle"
        open={sidebarOpen}
        onClick={() => { setSidebarOpen(o => !o); setAccountOpen(false) }}
      />

      {/* Right sidebar — collapsible */}
      <aside className={`dash-aside ${sidebarOpen ? '' : 'dash-aside--collapsed'}`}>
        {/* Account — only in sidebar when open */}
        <div className="dash-account" ref={sidebarOpen ? dropdownRef : undefined}>
          <button
            className="dash-account-btn"
            onClick={() => setAccountOpen(o => !o)}
          >
            <Avatar url={profile?.avatar_url} firstName={firstName} />
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

        {/* Deadlines — headed buckets, so "what now" reads off the shape
            rather than out of four compared dates. */}
        <motion.div
          className="dash-upcoming"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
        >
          {deadlineRail}
        </motion.div>
      </aside>
      </div>

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <FinancialAidModule
          open={openModule === 'Financial Aid'}
          onClose={() => setOpenModule(null)}
          year={parseInt(group.grade, 10)}
          aside={moduleRail}
        />
      </ModuleErrorBoundary>

      {FEATURES.knowledgeLibrary && (
        <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
          <KnowledgeLibraryModule
            open={openModule === 'Knowledge Library'}
            onClose={() => setOpenModule(null)}
            onOpenModule={(key) => setOpenModule(key)}
          />
        </ModuleErrorBoundary>
      )}

      <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
        <ApplicationTrackingModule
          open={openModule === 'Application Tracking'}
          onClose={() => setOpenModule(null)}
          onEditIncome={editIncome}
          aside={moduleRail}
          year={parseInt(group.grade, 10)}
        />
      </ModuleErrorBoundary>

      {FEATURES.essays && (
        <ModuleErrorBoundary onClose={() => setOpenModule(null)}>
          <EssaysModule
            open={openModule === 'College Essays'}
            onClose={() => setOpenModule(null)}
            aside={moduleRail}
            year={parseInt(group.grade, 10)}
          />
        </ModuleErrorBoundary>
      )}

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

/**
 * The account picture: the one from the sign-in provider where there is one,
 * and the initial otherwise.
 *
 * `avatar_url` has been fetched and typed since the first migration and never
 * drawn, so signing in with Google got you a letter like everyone else.
 *
 * `referrerPolicy="no-referrer"` because Google's image host refuses requests
 * that carry a referrer it does not know, which would leave a broken image
 * where the letter used to be. A load failure falls back to the letter too.
 */
function Avatar({ url, firstName }: { url?: string | null; firstName?: string | null }) {
  const [failed, setFailed] = useState(false)
  const letter = firstName ? firstName[0].toUpperCase() : '?'
  if (!url || failed) return <span className="dash-account-avatar">{letter}</span>
  return (
    <img
      className="dash-account-avatar dash-account-avatar--photo"
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
