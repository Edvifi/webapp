/**
 * Aid Compare — cost of attendance against the aid each school's net price
 * calculator estimated, for every school on a list.
 *
 * Lives in Application Tracking and compares that module's list, so there is
 * one college list rather than a second one to keep in step. Estimates are still
 * stored where Financial Aid always kept them (`fafsa_user_module_state.npc_runs`),
 * so nothing a student already entered is lost by the move.
 *
 * Also home to the list states Financial Aid's own college views share.
 */

import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { getNpcRuns, saveNpcRun, type NpcRun } from '../lib/fafsaData'
import { useAidColleges } from '../lib/useAidColleges'
import { C } from '../lib/designTokens'
import { logoUrlForDomain } from '../lib/collegeLogo'
import { CollegeLogo, Tag } from './moduleUI'

/* The college list comes from the database, so these three states exist where
   an in-memory array could only ever be present. */
export const ListLoading = () => (
  <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>
    Loading your colleges...
  </div>
)

export const ListFailed = () => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>Couldn't load your colleges</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
      Your list is saved — this is a connection problem, not lost data. Refresh to try again.
    </div>
  </div>
)

/* A saved school that no longer resolves used to be dropped without a word, so
   the student just saw a shorter list than the one they had built. */
export const UnresolvedNotice = ({ ids, fix = 'try removing and re-adding them from the search above' }: { ids: string[]; fix?: string }) => (
  <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: '#FFF3E0', border: '1px solid #C47A1240', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#8A5A0E', lineHeight: 1.5 }}>
    {ids.length === 1 ? '1 school on your list' : `${ids.length} schools on your list`} could not be found in our college
    database, so {ids.length === 1 ? 'it is' : 'they are'} not shown here. Nothing has been deleted — {fix}.
  </div>
)

type NpcStatus = 'not-run' | 'estimated' | 'verified'

const NPC_STATUS_META: Record<NpcStatus, { label: string; color: string; bg: string }> = {
  'not-run': { label: 'Not Run', color: 'rgba(var(--ink-rgb), 0.40)', bg: C.bg },
  estimated: { label: 'Estimated', color: '#1D7FC4', bg: '#E8EEF5' },
  verified: { label: 'Verified', color: '#2D9E72', bg: '#EBF5F0' },
}

const extlink = <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"/><path d="M8 1h3v3"/><line x1="11" y1="1" x2="5.5" y2="6.5"/></svg>

interface Props {
  /** The list to compare, as saved ids (`sc-<scorecard_id>` or a legacy slug). */
  collegeIds: string[]
  accent: string
}

export default function AidCompare({ collegeIds, accent: MC }: Props) {
  const toast = useToast()
  const { colleges, loading, failed, unresolved } = useAidColleges(collegeIds)
  const [npcRuns, setNpcRuns] = useState<Record<string, NpcRun>>({})
  const [editingNpc, setEditingNpc] = useState<string | null>(null)
  const [aidInput, setAidInput] = useState('')
  const [showOutOfState, setShowOutOfState] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    getNpcRuns()
      .then((runs) => { if (!cancelled) setNpcRuns(runs) })
      .catch(() => { /* estimates are optional; the costs still compare */ })
    return () => { cancelled = true }
  }, [])

  const handleSaveAid = async (collegeId: string) => {
    const val = parseInt(aidInput.replace(/[^0-9]/g, ''), 10)
    if (isNaN(val) || val <= 0) return
    const run: NpcRun = { estimatedAid: val, dateRun: new Date().toISOString().split('T')[0], status: 'estimated' }
    const prev = npcRuns
    setNpcRuns((r) => ({ ...r, [collegeId]: run }))
    setEditingNpc(null)
    setAidInput('')
    try { await saveNpcRun(collegeId, run); toast.success('Aid estimate saved') }
    catch { setNpcRuns(prev); toast.error('Could not save your aid estimate — try again') }
  }

  return (
    <div style={{ padding: '28px 30px' }}>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Aid Compare</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
        Compare estimated net costs across your school list. Run each school's Net Price Calculator for a personalized estimate.
      </p>

      {failed ? <ListFailed /> : loading ? <ListLoading /> : colleges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>No colleges to compare</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
            Add schools from Discover to compare their costs and estimated aid side by side.
          </div>
        </div>
      ) : (
        <>
          {unresolved.length > 0 && <UnresolvedNotice ids={unresolved} fix="they are still on your list in Application Status" />}
          <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { swatch: '#B93A3A30', label: 'Cost of Attendance (COA)' },
              { swatch: MC, label: 'Estimated Aid' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 24, height: 9, borderRadius: 3, background: l.swatch, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{l.label}</span>
              </div>
            ))}
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginLeft: 'auto' }}>Annual estimates</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {colleges.map((college) => {
              // Estimates saved from Financial Aid's own list may be under the
              // school's legacy slug rather than the id this list uses.
              const npcRun = npcRuns[college.id] ?? npcRuns[college.canonicalId]
              const aidEstimate = npcRun?.estimatedAid ?? null
              const npcStatus: NpcStatus = npcRun?.status ?? 'not-run'
              const nm = NPC_STATUS_META[npcStatus]
              const isOos = showOutOfState[college.id] ?? false
              const coa = isOos && college.costOutOfState ? college.costOutOfState : college.costOfAttendance
              // Cost is absent for about half the table. Everything derived from it
              // has to stay null rather than quietly become 0, which would render a
              // school as free.
              const oop = aidEstimate !== null && coa !== null ? coa - aidEstimate : null
              const aidPct = aidEstimate !== null && coa ? aidEstimate / coa : 0
              const oopColor = oop !== null ? (oop < 15000 ? '#2D9E72' : oop < 30000 ? '#C47A12' : '#B93A3A') : C.textMuted
              const isEditing = editingNpc === college.id

              return (
                <div key={college.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 18px', boxShadow: C.shadow1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <CollegeLogo logoUrl={logoUrlForDomain(college.domain)} emoji={college.emoji} size={22} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text }}>{college.name}</span>
                        <Tag label={college.control} color={C.textMuted} bg={C.bg} />
                      </div>
                      {college.isPublic && college.costOutOfState !== null && (
                        <button
                          onClick={() => setShowOutOfState((p) => ({ ...p, [college.id]: !p[college.id] }))}
                          style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                        >
                          {isOos ? 'Show in-state' : 'Show out-of-state'}
                        </button>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: nm.color, background: nm.bg, padding: '3px 10px', borderRadius: 99, border: `1px solid ${nm.color}30` }}>{nm.label}</span>
                  </div>

                  <div style={{ position: 'relative', height: 18, borderRadius: 5, background: '#B93A3A22', overflow: 'hidden', marginBottom: 12 }}>
                    {aidEstimate !== null && aidEstimate > 0 && (
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${aidPct * 100}%`, background: MC, opacity: 0.8, borderRadius: 5 }} />
                    )}
                    <div style={{ position: 'absolute', right: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color: '#B93A3A' }}>{coa !== null ? `$${coa.toLocaleString()}/yr` : 'Cost not published'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: isOos ? 'COA (Out-of-State)' : 'Cost of Attendance', value: coa !== null ? `$${coa.toLocaleString()}` : '—', color: C.text },
                      { label: 'Est. Aid Package', value: aidEstimate !== null ? `$${aidEstimate.toLocaleString()}` : '—', color: MC },
                      { label: 'Est. Out of Pocket', value: oop !== null ? `$${oop.toLocaleString()}` : '—', color: oopColor },
                    ].map((d, j) => (
                      <div key={j} style={{ background: C.bg, borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{d.label}</div>
                        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: d.color }}>{d.value}</div>
                      </div>
                    ))}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        autoFocus
                        value={aidInput}
                        onChange={(e) => setAidInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveAid(college.id); if (e.key === 'Escape') { setEditingNpc(null); setAidInput('') } }}
                        placeholder="e.g. 25000"
                        aria-label={`Estimated aid from ${college.name}`}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, outline: 'none' }}
                      />
                      <button onClick={() => void handleSaveAid(college.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: MC, color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => { setEditingNpc(null); setAidInput('') }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { if (college.npcUrl) window.open(college.npcUrl, '_blank') }}
                        disabled={!college.npcUrl}
                        title={college.npcUrl ? undefined : "We don't have this school's net price calculator. Every college is required to publish one — search its financial aid page."}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}0D`, cursor: college.npcUrl ? 'pointer' : 'not-allowed', opacity: college.npcUrl ? 1 : 0.5, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: MC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        Run Net Price Calculator {extlink}
                      </button>
                      <button
                        onClick={() => { setEditingNpc(college.id); setAidInput(aidEstimate !== null ? String(aidEstimate) : '') }}
                        style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {aidEstimate !== null ? 'Edit Aid' : 'Enter Aid'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
