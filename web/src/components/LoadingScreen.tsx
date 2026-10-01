/**
 * LoadingScreen — what the app shows before it knows who you are.
 *
 * This used to be an empty parchment rectangle: the right background, the
 * grain overlay, and nothing else. On a cold load the profile fetch can take
 * several seconds (its first attempt races Supabase's own token rotation and
 * times out, and only the retry succeeds), and for all of it the page looked
 * broken rather than busy. People refreshed, which worked — the second load
 * has a warm token — and so the app taught them to refresh it.
 *
 * Two rules here:
 *
 * The spinner waits a moment before appearing. A load that resolves in 200ms
 * should not flash a spinner at anyone; that reads as jank, not speed.
 *
 * A load that is taking far too long says so, and offers the reload that
 * people were doing anyway. Staring at a spinner with no end is the same
 * failure as staring at a blank page, one step along.
 */

import { useEffect, useState } from 'react'

/** Long enough that a fast load shows nothing at all. */
const SPINNER_AFTER_MS = 400
/** By here something is wrong: the profile fetch has had a timeout and a retry. */
const STUCK_AFTER_MS = 9000

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'quiet' | 'busy' | 'stuck'>('quiet')

  useEffect(() => {
    const busy = setTimeout(() => setPhase('busy'), SPINNER_AFTER_MS)
    const stuck = setTimeout(() => setPhase('stuck'), STUCK_AFTER_MS)
    return () => { clearTimeout(busy); clearTimeout(stuck) }
  }, [])

  return (
    <div className="wb-screen" role="status" aria-live="polite">
      <div className="wb-grain" />
      {phase !== 'quiet' && (
        <div className="ld-box">
          <span className="ld-spinner" aria-hidden="true" />
          <p className="ld-text">
            {phase === 'stuck' ? 'Still loading…' : 'Loading your dashboard…'}
          </p>
          {phase === 'stuck' && (
            <>
              <p className="ld-note">
                This is taking longer than it should. Your connection may have dropped.
              </p>
              <button type="button" className="ld-retry" onClick={() => window.location.reload()}>
                Reload
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
