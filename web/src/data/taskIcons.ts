/**
 * Simple hand-drawn style SVG icons for task bullet points.
 * Each milestone gets an array of 3 icons matching its 3 tasks.
 * These are inline SVG strings rendered as small illustrations.
 */

// Shared style: 18×18 viewBox, sketchy strokes
const S = 'stroke-linecap="round" stroke-linejoin="round" fill="none"'

export const TASK_ICONS: string[][] = [
  // f1: Set the Foundation — GPA, clubs, teachers
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 14l3-8 3 5 2-3 4 6" stroke="currentColor" stroke-width="1.5" ${S}/><circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.4"/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 15V6l4-3 4 3v9" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 15v-4h4v4" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 16c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
  ],
  // f2: Find Your Thing — activity, shadow, notes
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M9 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M10 10l5 5" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 3h10v12H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 7h4M7 10h3" stroke="currentColor" stroke-width="1.2" ${S}/></svg>`,
  ],
  // f3: Build Relationships — teachers, office hours, wins
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="6" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3" ${S}/><circle cx="12" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3" ${S}/><path d="M2 15c0-2 2-4 4-4 1 0 2 .3 3 1 1-.7 2-1 3-1 2 0 4 2 4 4" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 14V5a1 1 0 011-1h8a1 1 0 011 1v9" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M2 14h14" stroke="currentColor" stroke-width="1.5" ${S}/><circle cx="9" cy="8" r="1" fill="currentColor"/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 9l3 3 5-6" stroke="currentColor" stroke-width="2" ${S}/></svg>`,
  ],
  // s1: Level Up — AP, PSAT, leadership
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 15l4-5 3 2 5-7" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M12 5h3v3" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 4h10v10H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 8h4M7 11h2" stroke="currentColor" stroke-width="1.2" ${S}/><path d="M4 4l2-2h6l2 2" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M9 3v5M6 6l3 2 3-2" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M4 10c0 4 5 5 5 5s5-1 5-5" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
  ],
  // s2: Start the Vision — colleges, majors, info night
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 13l3-4 2 2 4-5 3 3" stroke="currentColor" stroke-width="1.5" ${S}/><circle cx="9" cy="5" r="1" fill="currentColor" opacity="0.5"/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M9 5v4l3 2" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 5h12v9H3z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 5l6 5 6-5" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
  ],
  // s3: Make Summer Count — program, read, activities
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M5 12c0 2 2 3 4 3s4-1 4-3" stroke="currentColor" stroke-width="1.3" ${S}/><path d="M9 3v-1M13 5l1-1M5 5l-1-1" stroke="currentColor" stroke-width="1.2" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 3v12M5 3c2 0 4 1 4 3s-2 3-4 3" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M5 9c2 0 5 1 5 3s-3 3-5 3" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 4h10v11H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 4V2h4v2" stroke="currentColor" stroke-width="1.3" ${S}/><path d="M7 8h4M7 11h3" stroke="currentColor" stroke-width="1.2" ${S}/></svg>`,
  ],
  // j1: Enter Prep Mode — SAT, tests, school list
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 14l3-4 2 1 4-6 3 4" stroke="currentColor" stroke-width="1.5" ${S}/><circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.3"/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 3h8v12H5z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M8 7h2M8 9.5h2M8 12h1" stroke="currentColor" stroke-width="1.2" ${S}/><circle cx="6.5" cy="7" r="0.6" fill="currentColor"/><circle cx="6.5" cy="9.5" r="0.6" fill="currentColor"/><circle cx="6.5" cy="12" r="0.6" fill="currentColor"/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 4h12v10H3z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 7h12" stroke="currentColor" stroke-width="1" ${S}/><path d="M6 10h6M6 12h4" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
  ],
  // j2: Test Season — SAT/ACT, recs, grades
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 4h10v10H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 8l2 2 3-4" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 3h10v12H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 7h4M7 10h3M7 13h2" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 15l4-5 3 2 5-8" stroke="currentColor" stroke-width="1.8" ${S}/></svg>`,
  ],
  // j3: Build College List — balance, aid, fair
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 14h14M5 14V8M9 14V5M13 14V9" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M9 6v6M7 8.5h4M7 11h4" stroke="currentColor" stroke-width="1.2" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 15V6l4-3 4 3v9" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M2 6h14" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
  ],
  // j4: Get on Campus — visit, recs, counselor
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 14h12M6 14V8h6v6M9 4l5 4H4z" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 3h10v12H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 7h4M7 10h3" stroke="currentColor" stroke-width="1" ${S}/><path d="M4 3l2-1h6l2 1" stroke="currentColor" stroke-width="1.2" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M4 16c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
  ],
  // sr1: Craft Your Story — essay, activities, transcripts
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 3c1 4 3 7 5 9s4 3 5 3" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 15l1-3 2 2z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M4 4h10v11H4z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M7 4V2h4v2" stroke="currentColor" stroke-width="1.3" ${S}/><path d="M7 8h4M7 11h3" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 3h8v12H5z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M5 6h8" stroke="currentColor" stroke-width="1" ${S}/><path d="M7 9h4M7 11h3" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
  ],
  // sr2: Launch Early Apps — ED/EA, FAFSA, scores
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M9 14V4M6 7l3-3 3 3" stroke="currentColor" stroke-width="1.8" ${S}/><path d="M4 14h10" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M9 6v6M7 9h4" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 5l6 4 6-4v9H3z" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
  ],
  // sr3: RD Push — apps, scholarships, portals
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 5l6 4 6-4v9H3z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 5h12" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M9 2l2 4h4l-3 3 1 5-4-3-4 3 1-5-3-3h4z" stroke="currentColor" stroke-width="1.3" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 4h12v10H3z" stroke="currentColor" stroke-width="1.5" ${S}/><path d="M3 7h12" stroke="currentColor" stroke-width="1" ${S}/><circle cx="9" cy="11" r="1" fill="currentColor"/></svg>`,
  ],
  // sr4: Your Moment — compare, visit, commit
  [
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 14h14M5 14V8M9 14V5M13 14V9" stroke="currentColor" stroke-width="1.5" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M3 14h12M6 14V8h6v6M9 4l5 4H4z" stroke="currentColor" stroke-width="1.3" ${S}/><path d="M8 11h2v3H8z" stroke="currentColor" stroke-width="1" ${S}/></svg>`,
    `<svg viewBox="0 0 18 18" width="18" height="18"><path d="M5 9l3 3 5-6" stroke="currentColor" stroke-width="2.2" ${S}/></svg>`,
  ],
]
