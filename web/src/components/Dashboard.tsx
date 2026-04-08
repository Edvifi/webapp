/**
 * Dashboard — static mockup
 *
 * Shows module cards, upcoming tasks (mini-timeline),
 * and overall progress. Right sidebar is collapsible.
 * Account button moves to header when sidebar is collapsed.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { yearGroupOf, YEAR_GROUPS } from '../data/timelineData'
import TimelinePage from './TimelinePage'
import CalendarPage from './CalendarPage'

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

const MODULES = [
  { key: 'Course Planning',       sub: 'Strategic Rigor',    color: '#2D9E72', emoji: '📐', base: 65 },
  { key: 'Standardized Testing',  sub: 'Test Season',        color: '#C47A12', emoji: '✏️', base: 70 },
  { key: 'Extracurriculars',      sub: 'Lead & Impact',      color: '#7048C8', emoji: '🎭', base: 60 },
  { key: 'College Essays',        sub: 'Drafting Season',    color: '#1D7FC4', emoji: '🪶', base: 50 },
  { key: 'Financial Aid',         sub: 'Scholarship Hunt',   color: '#C47A12', emoji: '💰', base: 40 },
  { key: 'Application Tracking',  sub: 'Building Your List', color: '#1D7FC4', emoji: '📋', base: 55 },
]

const UPCOMING = [
  { title: 'Complete PSAT registration', module: 'Standardized Testing', color: '#C47A12', due: 'Due Apr 5' },
  { title: 'Update 4-year course plan',  module: 'Course Planning',      color: '#2D9E72', due: 'Due Apr 8' },
  { title: 'Scholarship spreadsheet',    module: 'Financial Aid',        color: '#C47A12', due: 'Due Apr 12' },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function Dashboard({ startIdx, answers, firstName, onSignOut }: Props) {
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

  const navigateFromDropdown = (p: string) => {
    setPage(p as typeof page)
    setAccountOpen(false)
  }

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
          {page === 'dashboard' && (
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
                  >
                    <div className="dash-module-banner" style={{ background: mod.color }}>
                      <span className="dash-module-emoji">{mod.emoji}</span>
                    </div>
                    <div className="dash-module-body">
                      <h3 className="dash-module-name">{mod.key}</h3>
                      <p className="dash-module-sub">{mod.sub}</p>
                      <div className="dash-module-footer">
                        <div className="dash-module-bar">
                          <motion.div
                            className="dash-module-fill"
                            style={{ background: mod.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${mod.base}%` }}
                            transition={{ delay: 0.3 + i * 0.06, duration: 0.7, ease: EASE_OUT }}
                          />
                        </div>
                        <span className="dash-module-pct">{mod.base}%</span>
                        <span className="dash-module-open">Open →</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {page === 'timeline' && (
            <motion.div key="tl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <TimelinePage startIdx={startIdx} answers={answers} />
            </motion.div>
          )}

          {page === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <CalendarPage />
            </motion.div>
          )}

          {page === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <div className="dash-header">
                <h1 className="dash-title">Profile</h1>
                <p className="dash-subtitle">Coming soon.</p>
              </div>
            </motion.div>
          )}

          {page === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <div className="dash-header">
                <h1 className="dash-title">Settings</h1>
                <p className="dash-subtitle">Manage your preferences and account.</p>
              </div>
              <div className="pg-grid">
                <div className="pg-card">
                  <h3 className="pg-section-title">Notifications</h3>
                  {/* TODO: Wire up toggles — persist to Supabase `settings` JSON column */}
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Email Reminders</span>
                      <span className="st-row-desc">Get notified about upcoming deadlines</span>
                    </div>
                    <div className="st-toggle st-toggle--on"><div className="st-toggle-knob" /></div>
                  </div>
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Weekly Summary</span>
                      <span className="st-row-desc">Receive a weekly progress digest</span>
                    </div>
                    <div className="st-toggle st-toggle--on"><div className="st-toggle-knob" /></div>
                  </div>
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Push Notifications</span>
                      <span className="st-row-desc">Browser push for urgent tasks</span>
                    </div>
                    <div className="st-toggle"><div className="st-toggle-knob" /></div>
                  </div>
                </div>
                <div className="pg-card">
                  <h3 className="pg-section-title">Appearance</h3>
                  {/* TODO: Wire up theme selection — persist to Supabase + apply CSS vars */}
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Theme</span>
                      <span className="st-row-desc">Choose your visual preference</span>
                    </div>
                    <div className="st-chip-group">
                      <span className="st-chip st-chip--active">Light</span>
                      <span className="st-chip">Dark</span>
                      <span className="st-chip">System</span>
                    </div>
                  </div>
                </div>
                <div className="pg-card">
                  <h3 className="pg-section-title">Timeline</h3>
                  {/* TODO: Wire up timeline prefs — persist to Supabase, read in TimelinePage */}
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Show Completed Tasks</span>
                      <span className="st-row-desc">Display past milestones on the timeline</span>
                    </div>
                    <div className="st-toggle st-toggle--on"><div className="st-toggle-knob" /></div>
                  </div>
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Auto-advance Progress</span>
                      <span className="st-row-desc">Update timeline position based on current date</span>
                    </div>
                    <div className="st-toggle st-toggle--on"><div className="st-toggle-knob" /></div>
                  </div>
                </div>
                <div className="pg-card">
                  <h3 className="pg-section-title">Account</h3>
                  {/* TODO: Wire up change password — use supabase.auth.updateUser({ password }) */}
                  <div className="st-row">
                    <div className="st-row-text">
                      <span className="st-row-label">Change Password</span>
                      <span className="st-row-desc">Update your account password</span>
                    </div>
                    <button className="st-btn" disabled title="Coming soon">Change</button>
                  </div>
                  {/* TODO: Wire up delete account — call Supabase admin delete + sign out */}
                  <div className="st-row st-row--danger">
                    <div className="st-row-text">
                      <span className="st-row-label">Delete Account</span>
                      <span className="st-row-desc">Permanently remove your account and data</span>
                    </div>
                    <button className="st-btn st-btn--danger" disabled title="Coming soon">Delete</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
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
          {UPCOMING.map((task) => (
            <motion.div
              key={task.title}
              className="dash-upcoming-item"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: EASE_OUT }}
            >
              <div className="dash-upcoming-bar" style={{ background: task.color }} />
              <div className="dash-upcoming-text">
                <div className="dash-upcoming-title">{task.title}</div>
                <div className="dash-upcoming-meta">{task.module} · {task.due}</div>
              </div>
            </motion.div>
          ))}
          <button className="dash-show-all">Show All</button>
        </motion.div>

        {/* Progress */}
        <motion.div
          className="dash-progress"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: EASE_OUT }}
        >
          <h3 className="dash-aside-title">Overall Progress</h3>
          {MODULES.map((mod) => (
            <div key={mod.key} className="dash-progress-row">
              <span className="dash-progress-label">{mod.key}</span>
              <span className="dash-progress-pct" style={{ color: mod.color }}>{mod.base}%</span>
            </div>
          ))}
        </motion.div>
      </aside>
    </motion.div>
  )
}
