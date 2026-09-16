/**
 * Edvifi wordmark/glyph. Swaps to the white logo in dark mode — the colour
 * logo's dark quill disappears against the dark background otherwise.
 */

import { useResolvedTheme } from '../lib/theme'

export default function Logo({ className }: { className?: string }) {
  const theme = useResolvedTheme()
  const src = theme === 'dark' ? '/logos/logo-white.png' : '/logos/logo-color.png'
  return <img src={src} alt="Edvifi" className={className} />
}
