/* ═══════════════════════════════════════════════════════════════
   APPLICATION TRACKING — checklist article content
   For high-school juniors and seniors navigating applications.
   ═══════════════════════════════════════════════════════════════ */

import type { ChecklistContent } from './checklistContent'

export const APPLICATIONS_CONTENT: ChecklistContent[] = [
  /* ─── Building Your College List ─── */
  {
    id: 'bl-1',
    title: 'How to Research Colleges That Fit You',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Start With Fit, Not Rankings' },
      {
        kind: 'paragraph',
        text: 'Rankings are noise. The U.S. News list is built from inputs that mostly correlate with wealth and selectivity, not with whether you\'ll thrive there. The right college is the one where you\'ll learn the most, find your people, and graduate without crushing debt — and that\'s a different school for different students.',
      },
      { kind: 'heading', text: 'The Six Fit Factors' },
      {
        kind: 'list',
        items: [
          'Academic fit — does the school have your major? Strong programs in what you actually want to study?',
          'Size — 1,500-student LAC vs. 50,000-student state flagship are wildly different experiences',
          'Location — urban / suburban / rural; close to home or far; weather you can stand',
          'Cost — what will you actually pay after aid? Run the Net Price Calculator before falling in love with a school',
          'Culture — Greek life vs. not, athletics, political climate, religious affiliation, arts vs. STEM emphasis',
          'Career outcomes — for your major specifically, not "the school" overall',
        ],
      },
      { kind: 'heading', text: 'Where to Look' },
      {
        kind: 'list',
        items: [
          'The Discover tab in this module — a financially-ranked reach / match / safety mix you can filter by admission level, school type, and state to surface schools that fit your budget',
          'College websites — read course catalogs and student newspapers, not just admissions pages',
          'Reddit\'s r/ApplyingToCollege and individual school subreddits — unfiltered student perspectives',
          'CollegeXpress, Niche, College Scorecard — for outcome data and student reviews',
          'Visits — virtual tours are fine; in-person is much better if you can swing it',
        ],
      },
      {
        kind: 'callout',
        title: 'Reality Check',
        text: 'You will be surprised how many colleges you\'ve never heard of would be a great fit. Don\'t limit your list to "schools my parents have heard of." There are 4,000+ four-year colleges in the U.S.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'bl-2',
    title: 'Reach, Match, and Safety — The Balanced List',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Three Categories' },
      {
        kind: 'paragraph',
        text: 'Every college on your list should fall into one of three categories based on your odds of admission. A balanced list typically has 2-3 reaches, 4-6 matches, and 2-3 safeties. Heavy on reaches = high stress and possible no acceptances. Heavy on safeties = settling. Balance is the goal.',
      },
      { kind: 'heading', text: 'Reach Schools (3 of 8-12)' },
      {
        kind: 'paragraph',
        text: 'Schools where your stats are at or below the school\'s 25th percentile, or schools with admit rates under 20% (which are reaches for almost everyone). You want to apply, but you cannot count on getting in. Stanford, MIT, the Ivies, and other ultra-selectives are reaches even for valedictorians with 1600 SATs.',
      },
      { kind: 'heading', text: 'Match Schools (4-6 of 8-12)' },
      {
        kind: 'paragraph',
        text: 'Schools where your stats are within or above the school\'s middle 50%. Realistic but not guaranteed. These should make up the bulk of your list — they\'re schools you\'d be excited to attend and have a real shot at.',
      },
      { kind: 'heading', text: 'Safety Schools (2-3 of 8-12)' },
      {
        kind: 'paragraph',
        text: 'Schools where your stats are well above the 75th percentile AND admit rate is 50%+. Critically, a safety must be a school you\'d genuinely be happy attending and one you can afford. A "safety" you don\'t want to go to is not a safety — it\'s a sunk cost.',
      },
      {
        kind: 'callout',
        title: 'The "Affordable Safety" Rule',
        text: 'For at least one of your safety schools, run the Net Price Calculator and confirm your family can pay it without significant loans. This is your absolute floor — the school you can afford and would be okay attending if everything else falls through.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'When Stats Don\'t Tell the Whole Story' },
      {
        kind: 'list',
        items: [
          'Holistic admissions: Yale and similar schools care about more than numbers — but stats are the floor for serious consideration',
          'Demonstrated interest: at some schools (Tufts, BU, Northeastern), showing interest meaningfully helps',
          'Hooks: legacy, recruited athlete, underrepresented minority, first-gen — can shift category',
          'Application strategy: ED can boost your odds at reaches by 2-3x at some schools',
        ],
      },
    ],
  },
  {
    id: 'bl-3',
    title: 'Major Considerations: Undecided Is Fine',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You Don\'t Need to Know' },
      {
        kind: 'paragraph',
        text: 'About 30% of college students change their major at least once. Going in "undecided" is completely normal at most schools and does not hurt your application. The exception: certain competitive majors at certain schools (CS at top schools, engineering, business) where you apply directly to the program and switching in later is hard or impossible.',
      },
      { kind: 'heading', text: 'When Major Choice Matters Most' },
      {
        kind: 'list',
        items: [
          'Engineering programs — usually require direct admission; transferring in is competitive',
          'Computer Science at top schools — UCLA CS, Berkeley EECS, CMU SCS are among the most selective programs in the country',
          'Business at undergrad B-schools — Wharton, Ross, McIntire have separate admissions',
          'BFA programs (theater, music, art) — often require auditions or portfolios',
          'Nursing, architecture, some education programs — require direct admission',
        ],
      },
      { kind: 'heading', text: 'When Major Choice Doesn\'t Matter' },
      {
        kind: 'paragraph',
        text: 'At most liberal arts colleges and universities, you can declare any major after one or two years. Harvard, Yale, Stanford, and similar schools admit you to the school, not a program — you can switch from English to Math freely. This means your application "intended major" is not binding.',
      },
      {
        kind: 'callout',
        title: 'Strategic Choice',
        text: 'If applying undecided would not hurt and you genuinely don\'t know, choose undecided. If a specific major is more selective and you do not really want it, listing it can hurt you. If a specific major is less selective and you can pivot later, listing it can help.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'bl-4',
    title: 'Build Your College List',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Action Step' },
      {
        kind: 'paragraph',
        text: 'Spend 2-3 hours building a balanced list of 8-12 colleges. Start from the Discover tab for financially-ranked suggestions and add the ones you keep; your list builds at the top of that page. Aim for 2-3 reaches, 4-6 matches, and 2-3 safeties.',
      },
      {
        kind: 'checklist',
        title: 'Before You Finalize',
        items: [
          'Each school has at least one academic program you\'re interested in',
          'You\'ve checked the financial fit — the Discover tab gives a rough estimate; the Financial Aid module has each school\'s Net Price Calculator for the real number',
          'At least one school is an affordable safety',
          'You\'ve confirmed the application deadlines and types (ED/EA/RD)',
          'The list mixes geographies / sizes / cultures so you have options',
        ],
      },
      {
        kind: 'callout',
        title: 'Common Mistake',
        text: 'A list of 12 schools that are all reaches is not a college list — it\'s a wishlist. Be honest with yourself about admit rates and stats overlap.',
        variant: 'warning',
      },
    ],
  },

  /* ─── Application Strategy ─── */
  {
    id: 'as-1',
    title: 'ED, EA, REA, and RD — What Each One Means',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Four Application Plans' },
      { kind: 'heading', text: 'Early Decision (ED)' },
      {
        kind: 'paragraph',
        text: 'You apply early (deadline usually November 1 or 15) and IF accepted, you commit. ED is binding — you withdraw all other applications and enroll. You can only ED to one school. Decisions come in mid-December. ED is best when you\'re certain about your top choice and the financial fit works.',
      },
      { kind: 'heading', text: 'Early Action (EA)' },
      {
        kind: 'paragraph',
        text: 'You apply early but it\'s NOT binding — you can decline if accepted. You can EA to multiple schools (with some exceptions). Decisions come in mid-December to January. EA is lower stakes than ED and gives you early answers without commitment.',
      },
      { kind: 'heading', text: 'Restrictive Early Action (REA / SCEA)' },
      {
        kind: 'paragraph',
        text: 'Used by Harvard, Yale, Princeton, Stanford, and a few others. Like EA (non-binding) but you cannot apply ED elsewhere or to other private REA schools. You can still EA to public universities. Decisions usually mid-December.',
      },
      { kind: 'heading', text: 'Regular Decision (RD)' },
      {
        kind: 'paragraph',
        text: 'The standard plan. Deadlines are usually January 1-15, decisions come March-April, commit by May 1. Use RD for most of your applications. There\'s no admissions disadvantage to RD compared to EA at most schools.',
      },
      {
        kind: 'callout',
        title: 'Mixing & Matching',
        text: 'A common strategy: ED to your top choice (binding to one) + EA to several non-restrictive schools + RD to the rest. Or REA to a top private + EA to public state schools + RD to the rest. Read each school\'s policy carefully — they vary.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'as-2',
    title: 'Should You Apply Early Decision?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Real Tradeoff' },
      {
        kind: 'paragraph',
        text: 'ED admit rates are often 2-3x higher than RD rates at competitive private schools. That sounds great, but the reality is more complicated: a chunk of the ED bump comes from recruited athletes, legacies, and other "hooked" applicants who use ED. The unhooked-applicant bump is smaller, maybe 1.3-1.5x.',
      },
      { kind: 'heading', text: 'Apply ED If…' },
      {
        kind: 'list',
        items: [
          'You have a clear #1 choice and would attend regardless of financial aid (or your family can afford it)',
          'Your application is strong and ready by November 1 — no time to "improve" between November and January',
          'The school has a meaningful ED admit rate boost (look up year-over-year admit rates by round)',
          'You\'re willing to accept the binding commitment',
        ],
      },
      { kind: 'heading', text: 'Don\'t Apply ED If…' },
      {
        kind: 'list',
        items: [
          'You need to compare financial aid offers (ED locks you in before you can compare)',
          'You\'re not certain — pick your #1 only if it\'s clear; otherwise leave room for surprises',
          'You haven\'t taken the SAT/ACT yet or your scores aren\'t in your target range',
          'Your application would be substantially stronger by January (improving grades, finishing major projects)',
        ],
      },
      {
        kind: 'callout',
        title: 'The Financial Aid Out',
        text: 'Most ED programs let you out of the binding commitment if the financial aid package is genuinely insufficient. But "insufficient" is judged against your family\'s actual ability to pay (per FAFSA), not what you wanted. Don\'t ED if you need to negotiate or compare offers — apply EA instead.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'as-3',
    title: 'Common App vs. Coalition vs. School-Specific',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Application Platforms' },
      {
        kind: 'paragraph',
        text: 'Most U.S. colleges accept the Common App, which lets you fill out one core application and submit it to multiple schools (each with its own supplemental questions). A few use the Coalition Application or their own platforms. Understanding the platform landscape saves you significant time.',
      },
      { kind: 'heading', text: 'Common App' },
      {
        kind: 'list',
        items: [
          '1,000+ schools accept it — Harvard, Yale, MIT, Stanford, NYU, and most private schools',
          'One main essay (650 words), one activities list, one set of recommendations',
          'Each school can require additional "supplemental" essays (the bulk of your work)',
          'Standard for nearly every senior — you will use this',
        ],
      },
      { kind: 'heading', text: 'Coalition Application' },
      {
        kind: 'list',
        items: [
          '~150 schools, mostly overlapping with Common App',
          'Originally designed to support low-income students with a "locker" for materials',
          'Most schools that accept it also accept the Common App — usually pick Common App',
        ],
      },
      { kind: 'heading', text: 'School-Specific Applications' },
      {
        kind: 'list',
        items: [
          'University of California (UC) system — uses its own application, applies to all 9 UCs',
          'Cal State (CSU) — separate application from UC',
          'MIT — has its own application (despite being on Common App\'s list)',
          'Georgetown, Rutgers — school-specific applications',
        ],
      },
      {
        kind: 'callout',
        title: 'Practical Takeaway',
        text: 'Build your list, then check each school\'s required application. If your list is mostly Common App + UCs, you\'ll fill out two applications total: one Common App (with supplements) and one UC application.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'as-4',
    title: 'Set Up Your Common App Account',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Get the Boring Stuff Done Early' },
      {
        kind: 'paragraph',
        text: 'Create your Common App account in the summer before senior year. Filling out the demographic / family / education sections is tedious — get it done before the essays demand your attention. The application opens August 1 each year for the upcoming cycle.',
      },
      {
        kind: 'checklist',
        title: 'Common App Setup',
        items: [
          'Create account at commonapp.org with an email you\'ll check (not your school email — you might lose access)',
          'Fill out Profile, Family, Education sections',
          'List activities (10 max — lead with the most meaningful, and quantify impact where you can)',
          'Add colleges to "My Colleges" — supplements appear once you add them',
          'Invite recommenders early (counselor + 2 teachers)',
          'Test linking parent FERPA waiver and recommender access',
        ],
      },
      { kind: 'link', label: 'Common Application', url: 'https://www.commonapp.org/', description: 'Official Common App site — create your account here.' },
    ],
  },

  /* ─── Submission Workflow ─── */
  {
    id: 'sw-1',
    title: 'Request Teacher Recommendations',
    type: 'task',
    body: [
      { kind: 'heading', text: 'When and How to Ask' },
      {
        kind: 'paragraph',
        text: 'Most colleges want 2 teacher recommendations and 1 counselor recommendation. Ask in the spring of junior year if possible, definitely no later than September of senior year. Teachers write many of these — give them time to do it well.',
      },
      { kind: 'heading', text: 'Who to Ask' },
      {
        kind: 'list',
        items: [
          'Junior year teachers (most recent academic context) — usually preferred',
          'Teachers who know you, not just teachers who gave you A\'s',
          'For STEM majors: at least one STEM teacher; for humanities: at least one humanities teacher',
          'Avoid: teachers you had freshman year, coaches/club advisors (those go in supplemental letters), teachers who barely remember you',
        ],
      },
      {
        kind: 'checklist',
        title: 'When You Ask',
        items: [
          'Ask in person, not over email',
          'Give them at least 3 weeks before the earliest deadline',
          'Provide: list of schools + deadlines, your activities list, your résumé/transcript, draft of your personal essay',
          'Send a polite follow-up 2 weeks before deadline if you haven\'t seen confirmation',
          'Send thank-you notes after they submit',
        ],
      },
      {
        kind: 'callout',
        title: 'FERPA Waiver',
        text: 'When inviting recommenders on Common App, you\'ll be asked whether to waive your right to read the recommendation. ALWAYS waive it — colleges weight non-waived letters less, knowing the writer self-censored.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'sw-2',
    title: 'Send Official Transcripts',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Your Counselor Handles This' },
      {
        kind: 'paragraph',
        text: 'You don\'t send transcripts directly. Your school counselor uses Naviance, Scoir, Common App\'s system, or another platform to send official transcripts to each college. Your job is to make sure your counselor knows where to send them and by when.',
      },
      {
        kind: 'checklist',
        title: 'Transcript Workflow',
        items: [
          'Tell your counselor your full college list early',
          'Confirm they have all deadlines (especially ED/EA earlier dates)',
          'Provide them your demographic info and recommendation requests through Naviance/Scoir',
          'Mid-year transcript: most colleges require updated grades from senior fall — counselor sends in January/February',
          'Final transcript: after graduation, counselor sends final transcript to the school you\'re attending',
        ],
      },
      {
        kind: 'callout',
        title: 'If Your School Doesn\'t Use Naviance',
        text: 'Smaller or international schools may use a manual process. Confirm with your counselor how it works at your school 6+ weeks before deadlines. Don\'t assume.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sw-3',
    title: 'Application Fees & Fee Waivers',
    type: 'article',
    body: [
      { kind: 'heading', text: 'How Much Does Applying Cost?' },
      {
        kind: 'paragraph',
        text: 'Application fees range from $50 to $90 per school. Common targets: $75 (most private schools), $80 (Stanford, Harvard), $50 (most state schools). For 10 applications, that\'s $500-$900 in fees alone — before SAT/ACT score sends, transcript fees, and other costs.',
      },
      { kind: 'heading', text: 'Fee Waivers Are More Common Than You Think' },
      {
        kind: 'list',
        items: [
          'Common App fee waiver: based on income (FRPL eligibility, qualifying for Pell, etc.) — covers ALL schools you apply to',
          'NACAC fee waiver: similar income-based waiver, applies broadly',
          'School-specific waivers: many schools waive fees if you visited campus, attended a virtual info session, or were nominated by a counselor',
          'SAT/ACT fee waiver: also unlocks 4-8 free college application fee waivers',
        ],
      },
      { kind: 'heading', text: 'How to Get One' },
      {
        kind: 'list',
        items: [
          'Talk to your school counselor — they can verify eligibility and submit waivers',
          'On Common App, indicate you qualify in the profile section — it offers waivers automatically',
          'For schools that waive fees for visits/info sessions: attend virtually, then apply',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Skip Schools Over Fees',
        text: 'If application fees are blocking you from applying to schools, fee waivers exist precisely for this. Talk to your counselor — applying broadly costs you nothing if you qualify.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'sw-4',
    title: 'Final-Week Pre-Submit Checklist',
    type: 'resource',
    body: [
      { kind: 'heading', text: 'Before You Hit Submit' },
      {
        kind: 'paragraph',
        text: 'Submission is irreversible. Take 30 minutes the day before each deadline to verify everything is in order. Most "I sent the wrong essay" disasters are preventable with this checklist.',
      },
      {
        kind: 'checklist',
        title: 'Pre-Submit Verification',
        items: [
          'Print preview the entire application — read it as if you were the admissions reader',
          'Personal statement: name and addressee mentions match this school (no "...is why I want to go to NYU" in your Yale app)',
          'Supplements: every supplement is filled in, no placeholders',
          'Activities: descriptions don\'t exceed character limits, no truncation',
          'Demographics, address, citizenship: all correct',
          'Counselor + recommenders show as "Submitted" on Common App',
          'Test scores: officially sent (or self-reported correctly)',
          'Application fee paid (or waiver applied)',
          'Submit at least 24 hours before deadline (not 11:59pm of the deadline day)',
        ],
      },
      {
        kind: 'callout',
        title: 'Server Crashes Are Real',
        text: 'Common App and college portals routinely crash on January 1 and November 1. Submit a day or two early. The deadline is "by 11:59pm in your timezone" but waiting until the last hour is needlessly stressful and risky.',
        variant: 'warning',
      },
    ],
  },

  /* ─── After You Submit ─── */
  {
    id: 'au-1',
    title: 'Set Up Applicant Portals',
    type: 'task',
    body: [
      { kind: 'heading', text: 'After Submitting, Wait for Portal Emails' },
      {
        kind: 'paragraph',
        text: 'A few days to two weeks after you submit, each college will email you a link to their applicant portal. This is where you check application status, see if anything is missing, and eventually view your decision. Set them up promptly.',
      },
      {
        kind: 'checklist',
        title: 'Portal Hygiene',
        items: [
          'Use a simple password manager — you\'ll have 8-12 portals',
          'Email used: same email as Common App (don\'t mismatch)',
          'Check each portal weekly — missing items (test scores, transcripts) often surface here first',
          'Bookmark all portals in one folder',
          'Some schools require portal account creation BEFORE decision is released — don\'t skip',
        ],
      },
      {
        kind: 'callout',
        title: 'When Decisions Drop',
        text: 'Most colleges release decisions through these portals at a scheduled time (e.g., "Ivy Day" — late March). Refresh at the announced time. Email notifications can be delayed; the portal is the source of truth.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'au-2',
    title: 'When to Expect Decisions',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Decision Timeline' },
      {
        kind: 'paragraph',
        text: 'After submission, you wait. The wait varies by application plan. Knowing roughly when decisions arrive helps manage stress and lets you plan your final-decision strategy.',
      },
      { kind: 'heading', text: 'Early Decision / Early Action / REA' },
      {
        kind: 'list',
        items: [
          'Notification: mid-December (December 10-20 for most schools)',
          'ED1 deadline (Nov 1) → decision around Dec 15',
          'ED2 deadline (Jan 1) → decision around Feb 15',
          'EA / REA deadline (Nov 1) → decision around Dec 15-Jan 31',
        ],
      },
      { kind: 'heading', text: 'Regular Decision' },
      {
        kind: 'list',
        items: [
          'Notification: mid-March to early April',
          'Ivy Day: a Thursday in late March, all 8 Ivies release at once (around 7pm ET)',
          'Most other privates: release a few days before or after Ivy Day',
          'UCs: by April 1 (each campus rolls out separately)',
        ],
      },
      { kind: 'heading', text: 'Other Plans' },
      {
        kind: 'list',
        items: [
          'Rolling admission (most state schools, some privates) — decisions arrive 4-8 weeks after submission',
          'Priority deadline schools — decisions usually mid-February',
          'Waitlist movement — happens after May 1 and can extend into August',
        ],
      },
      {
        kind: 'callout',
        title: 'May 1 — National College Decision Day',
        text: 'You must commit to ONE school by May 1 (sometimes called "decision day"). After that date, you submit your enrollment deposit and withdraw from other waitlists.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'au-3',
    title: 'Comparing Offers and the May 1 Decision',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You\'ve Got Options. Now What?' },
      {
        kind: 'paragraph',
        text: 'After RD decisions arrive in March/April, you might have 3-7 acceptances to compare. May 1 is the national deadline to commit and submit your enrollment deposit. The intervening 4-6 weeks is your decision window — use it.',
      },
      { kind: 'heading', text: 'The Decision Framework' },
      {
        kind: 'list',
        items: [
          'Cost — what you\'ll actually pay each year, not the sticker price. Compare net costs across all offers.',
          'Academic fit — does the school have your major or a clear path to it?',
          'Campus visit — even a virtual revisit. Talking to current students changes minds.',
          'Career outcomes — for your major specifically. Look up post-grad data.',
          'Gut feeling — important, but only after the rational analysis. Don\'t pick on vibes alone.',
        ],
      },
      { kind: 'heading', text: 'Negotiating Financial Aid' },
      {
        kind: 'paragraph',
        text: 'You can ask schools to reconsider their financial aid offer if you have a better offer from a comparable school. This is called a financial aid appeal. Schools rarely match exactly, but they often increase need-based aid by $1,000-$5,000 if presented with a competing offer. Worth doing if cost is the deciding factor.',
      },
      {
        kind: 'callout',
        title: 'Practical Tip',
        text: 'Don\'t wait until April 30 to commit. Most students decide by mid-April. Submit your deposit early to lock in housing preferences and orientation slots. Then withdraw from other waitlists — it\'s the polite thing to do, and it helps other students.',
        variant: 'tip',
      },
    ],
  },
]

export const APPLICATIONS_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  APPLICATIONS_CONTENT.map((c) => [c.id, c]),
)
