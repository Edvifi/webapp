/**
 * College logos via logo.dev, built client-side from the school's website domain
 * (the colleges table has no logo column). Falls back to an emoji glyph in the UI
 * when there's no domain / token or the image fails to load.
 */

const TOKEN = import.meta.env.VITE_LOGODEV_TOKEN as string | undefined

/** Reduce a school URL to a bare registrable domain, e.g. "https://www.wayne.edu/" → "wayne.edu". */
export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.host.replace(/^www\./, '')
    const parts = host.split('.')
    return parts.length > 2 ? parts.slice(-2).join('.') : host
  } catch {
    return null
  }
}

/** logo.dev image URL for a bare domain, or null when unavailable. */
export function logoUrlForDomain(domain: string | null | undefined): string | null {
  if (!domain || !TOKEN) return null
  return `https://img.logo.dev/${domain}?token=${TOKEN}&size=128&format=png&retina=true`
}
