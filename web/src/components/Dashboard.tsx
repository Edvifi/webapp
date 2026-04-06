/**
 * Dashboard — static mockup
 *
 * Shows module cards, upcoming tasks (mini-timeline),
 * and overall progress. Right sidebar is collapsible.
 * Account button moves to header when sidebar is collapsed.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { yearGroupOf, YEAR_GROUPS } from '../data/timelineData'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [page, setPage] = useState<'dashboard' | 'timeline' | 'calendar' | 'profile' | 'settings'>('dashboard')

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

          {(page === 'timeline' || page === 'calendar' || page === 'profile' || page === 'settings') && (
            <motion.div key={page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
              <div className="dash-header">
                <h1 className="dash-title">{page.charAt(0).toUpperCase() + page.slice(1)}</h1>
                <p className="dash-subtitle">Coming soon.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sidebar toggle — fixed on the border */}
      <button
        className="dash-aside-toggle"
        onClick={() => setSidebarOpen(o => !o)}
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
