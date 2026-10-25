/**
 * Line icons for the module shells: sidebar tabs, checklist item types, the
 * header's close button. One set, so Financial Aid, Application Tracking and
 * Essays draw the same glyph for the same thing instead of a mix of emoji.
 */

import type { ReactNode } from 'react'

export const MODULE_ICONS: Record<string, ReactNode> = {
  dashboard: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="4" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="8" width="7" height="10" rx="1.5"/></svg>,
  article: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="1.5" width="12" height="13" rx="1.5"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="7.5" x2="11" y2="7.5"/><line x1="5" y1="10" x2="9" y2="10"/></svg>,
  quiz: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.2-1.5 2.5"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor"/></svg>,
  assignment: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1.5H3.5A1.5 1.5 0 002 3v10a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 13V6.5L9 1.5z"/><path d="M9 1.5V6.5H14"/></svg>,
  task: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 8l2 2 4-4"/></svg>,
  resource: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l3 3 5-5"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4"/></svg>,
  overview: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l6-5.5L14 8"/><path d="M4 7v6.5h3V10h2v3.5h3V7"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="8,1.5 10,6 14.5,6 11,9.5 12.5,14 8,11.5 3.5,14 5,9.5 1.5,6 6,6"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5" y1="1.5" x2="5" y2="4.5"/><line x1="11" y1="1.5" x2="11" y2="4.5"/></svg>,
  compass: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.2"/><polygon points="10.6,5.4 9,9 5.4,10.6 7,7"/></svg>,
  chart: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="14" x2="14" y2="14"/><rect x="3" y="8" width="2.5" height="6"/><rect x="6.75" y="4" width="2.5" height="10"/><rect x="10.5" y="6" width="2.5" height="8"/></svg>,
  scale: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="3" y1="4" x2="13" y2="4"/><path d="M3 4l-2 5h4z"/><path d="M13 4l-2 5h4z"/><line x1="5" y1="14" x2="11" y2="14"/></svg>,
  pen: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2.5l2.5 2.5L6 12.5 2.5 13.5 3.5 10z"/><line x1="9.5" y1="4" x2="12" y2="6.5"/></svg>,
  bulb: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 10.5C4.3 9.6 3.5 8.2 3.5 6.6a4.5 4.5 0 019 0c0 1.6-.8 3-2 3.9V12h-5z"/><line x1="6" y1="14.5" x2="10" y2="14.5"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.5V8l2.5 1.5"/></svg>,
  plus: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>,
  extlink: <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"/><path d="M8 1h3v3"/><line x1="11" y1="1" x2="5.5" y2="6.5"/></svg>,
  info: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4.5" r="0.5" fill="currentColor" stroke="none"/></svg>,
  trash: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,4 12,4"/><path d="M5 4V2.5h4V4"/><path d="M3 4l.8 8h6.4l.8-8"/></svg>,
  pencil: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z"/><path d="M8.5 3.5l2 2"/></svg>,
  sparkle: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M7 1v2m0 8v2M1 7h2m8 0h2M3.2 3.2l1.4 1.4m4.8 4.8l1.4 1.4M3.2 10.8l1.4-1.4m4.8-4.8l1.4-1.4"/><circle cx="7" cy="7" r="2"/></svg>,
  close: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>,
}
