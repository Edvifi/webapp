import { useState, useEffect } from 'react'

/**
 * Subscribes to a `(max-width: …px)` media query and returns whether it
 * currently matches. SSR-safe: returns `false` when `window` is unavailable
 * and only subscribes once mounted on the client.
 */
export function useIsNarrow(maxWidth = 820): boolean {
  const query = `(max-width: ${maxWidth}px)`

  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync in case the query changed between render and effect
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
