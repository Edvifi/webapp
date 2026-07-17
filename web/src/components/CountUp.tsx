/**
 * CountUp — animates a number from 0 to `value` on mount / when value changes.
 */

import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

export default function CountUp({ value, duration = 0.9, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setN(x) })
    return () => controls.stop()
  }, [value, duration])
  return <>{Math.round(n)}{suffix}</>
}
