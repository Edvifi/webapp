/* ═══════════════════════════════════════════════════════════════
   STANDARDIZED TESTING — checklist article content
   Written for high-school students preparing for the 2026-2027 cycle.
   ═══════════════════════════════════════════════════════════════ */

import type { ChecklistContent } from './checklistContent'

export const TESTING_CONTENT: ChecklistContent[] = [
  /* ─── Choosing Your Test ─── */
  {
    id: 'ct-1',
    title: 'SAT vs. ACT — Which Is Better for You?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'They Both Count Equally' },
      {
        kind: 'paragraph',
        text: 'Every U.S. college that requires standardized test scores accepts the SAT and the ACT equally — there is no school that prefers one over the other. So the question is not "which one matters more" but "which one will you score better on." The two tests measure similar skills (reading, math, grammar) but in genuinely different ways, and most students do noticeably better on one than the other.',
      },
      { kind: 'heading', text: 'The Practical Differences' },
      {
        kind: 'list',
        items: [
          'Length: SAT is ~2h 14min (digital, adaptive). ACT is ~2h 55min (paper or digital, linear).',
          'Math: SAT lets you use a calculator throughout. ACT does too, but its math is broader (including some trigonometry and matrices) with less time per question.',
          'Science section: ACT has a dedicated "Science" section that is really a data-interpretation test. SAT does not.',
          'Reading: SAT digital format gives you short passages with one question each. ACT gives you long passages with 10 questions each — a stamina test.',
          'Pacing: ACT is faster. If you struggle with time pressure, the SAT often feels easier.',
        ],
      },
      {
        kind: 'callout',
        title: 'Quick Heuristic',
        text: 'If you are strong at math and a slower reader, lean SAT. If you are a fast reader, comfortable with science-style data charts, and good under time pressure, lean ACT.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'How to Actually Decide' },
      {
        kind: 'paragraph',
        text: 'Take one full-length practice test of each — both are free (links below). Score them and compare to the percentile charts. Whichever puts you in a higher percentile is your test. The difference is often dramatic: students who go from a 70th percentile SAT to a 90th percentile ACT (or vice versa) is normal.',
      },
      { kind: 'link', label: 'Free Official SAT Practice', url: 'https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests', description: 'Bluebook app — College Board\'s official practice platform.' },
      { kind: 'link', label: 'Free Official ACT Practice', url: 'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html', description: 'Free practice ACTs released by ACT.org.' },
    ],
  },
  {
    id: 'ct-2',
    title: 'Quiz: SAT or ACT Diagnostic',
    type: 'quiz',
    body: [
      { kind: 'paragraph', text: 'A quick gut-check on the differences between the SAT and ACT. Use it to ground your decision before sitting for full practice tests.' },
      {
        kind: 'quiz',
        questions: [
          {
            question: 'Which test has a dedicated science section?',
            options: ['SAT', 'ACT', 'Both', 'Neither'],
            correctIndex: 1,
            explanation: 'The ACT has a Science section (which is mostly chart and graph interpretation, not memorized science facts). The SAT does not.',
          },
          {
            question: 'Roughly how long is the digital SAT?',
            options: ['~2 hours 14 minutes', '~2 hours 55 minutes', '~3 hours 30 minutes', '~4 hours'],
            correctIndex: 0,
            explanation: 'The digital SAT runs about 2h 14min including breaks. The ACT is longer (~2h 55min). The 3+ hour figure refers to the old paper SAT.',
          },
          {
            question: 'Do colleges prefer one test over the other?',
            options: ['Yes — Ivies prefer SAT', 'Yes — public schools prefer ACT', 'No — they accept both equally', 'It depends on your major'],
            correctIndex: 2,
            explanation: 'Every U.S. college that requires test scores accepts both equally. Submit whichever you score higher on.',
          },
          {
            question: 'Which test is more pacing-pressured (less time per question)?',
            options: ['SAT', 'ACT', 'They\'re identical', 'Depends on the section'],
            correctIndex: 1,
            explanation: 'The ACT gives you less time per question on average, especially in Reading and Science. If you are a slower reader, the SAT may suit you better.',
          },
        ],
      },
    ],
  },
  {
    id: 'ct-3',
    title: 'Take a Free Practice SAT',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Why Start With a Practice Test' },
      {
        kind: 'paragraph',
        text: 'Before deciding which test to focus on or how much prep you need, take one full-length, timed practice SAT. The College Board\'s Bluebook app gives you the actual digital test interface. Aim for a quiet morning, simulate test conditions (no phone, only the breaks the test allows), and score it honestly.',
      },
      {
        kind: 'checklist',
        title: 'Your Practice SAT Setup',
        items: [
          'Download the Bluebook app on a laptop or tablet',
          'Block 2.5 hours on a weekend morning (mimic real test time)',
          'Phone in another room, water and snacks nearby',
          'Take all four modules — don\'t skip any',
          'Score immediately and write down your result',
        ],
      },
      { kind: 'link', label: 'Bluebook (College Board\'s practice app)', url: 'https://bluebook.collegeboard.org/', description: 'Free official digital SAT practice — same software the real test uses.' },
      {
        kind: 'callout',
        title: 'About Your Score',
        text: 'A first-attempt score with no prep is just a baseline. Most students improve 100-200 points with 30-60 hours of focused study. Don\'t panic at the first number — it\'s information, not a verdict.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'ct-4',
    title: 'Take a Free Practice ACT',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Mirror the Practice SAT' },
      {
        kind: 'paragraph',
        text: 'Take a full-length practice ACT under the same simulated conditions you used for the SAT. The ACT is paper-based for many students, so consider printing the test rather than reading on a screen — your stamina with paper will be different.',
      },
      {
        kind: 'list',
        items: [
          'English (45 min, 75 questions)',
          'Math (60 min, 60 questions)',
          'Reading (35 min, 40 questions)',
          'Science (35 min, 40 questions)',
          'Optional Writing (40 min) — most colleges no longer require this',
        ],
      },
      { kind: 'link', label: 'Official Free ACT Practice Test (PDF)', url: 'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html', description: 'Download a real retired ACT — the closest thing to the real exam.' },
      {
        kind: 'callout',
        title: 'Compare Your Percentiles',
        text: 'Don\'t compare raw scores (a 1300 SAT and a 28 ACT are not comparable on their face). Look up the percentile chart for each — whichever percentile is higher is your test.',
        variant: 'tip',
      },
    ],
  },

  /* ─── Registration & Prep ─── */
  {
    id: 'rp-1',
    title: 'Register for Your First Official Test',
    type: 'task',
    body: [
      { kind: 'heading', text: 'When to Take the Real Test' },
      {
        kind: 'paragraph',
        text: 'Most students take their first official SAT or ACT in spring of junior year. This gives you summer to retake if needed. If your practice scores are already in your target range, sit for the real test sooner — earlier scores mean less stress senior fall.',
      },
      { kind: 'heading', text: 'Registration Steps' },
      {
        kind: 'checklist',
        title: 'Registration Checklist',
        items: [
          'Pick a test date 8-10 weeks out (gives you prep runway)',
          'Pick a test center — popular ones fill up; register early',
          'Have a digital photo ready (passport-style headshot)',
          'Pay the fee (or apply for a fee waiver if eligible)',
          'Save the confirmation email — print or screenshot for test day',
        ],
      },
      { kind: 'link', label: 'Register for the SAT', url: 'https://satsuite.collegeboard.org/sat/registration', description: 'College Board registration portal.' },
      { kind: 'link', label: 'Register for the ACT', url: 'https://www.act.org/content/act/en/products-and-services/the-act/registration.html', description: 'Official ACT registration.' },
      {
        kind: 'callout',
        title: 'Fee Waivers',
        text: 'If your family meets income guidelines, you can take the SAT or ACT for free up to two times. Talk to your school counselor — fee waivers also waive score-sending fees and unlock free college application waivers.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'rp-2',
    title: '3-Month Prep Timeline',
    type: 'resource',
    body: [
      { kind: 'heading', text: 'A Realistic 12-Week Plan' },
      {
        kind: 'paragraph',
        text: 'For students aiming for a 100-200 point SAT improvement (or 3-4 point ACT improvement), 10-12 weeks of consistent study works. Here is a proven structure — adjust based on which areas you need to grow.',
      },
      { kind: 'heading', text: 'Weeks 1-2: Diagnose and Prioritize' },
      {
        kind: 'list',
        items: [
          'Take a full diagnostic test under timed conditions',
          'Score-by-section: identify your weakest area',
          'Pick one prep resource and stick to it (don\'t hop between books)',
        ],
      },
      { kind: 'heading', text: 'Weeks 3-8: Skill Building' },
      {
        kind: 'list',
        items: [
          '~5 hours/week, focused on your weakest section',
          'Khan Academy SAT or ACT Academy for foundations',
          'Targeted practice sets (e.g., College Panda for SAT math)',
          'One full timed section per week to track progress',
        ],
      },
      { kind: 'heading', text: 'Weeks 9-12: Test Simulation' },
      {
        kind: 'list',
        items: [
          'One full timed practice test per weekend',
          'Review every wrong answer — write down WHY you got it wrong',
          'Final week: light review only, no new material, sleep well',
        ],
      },
      {
        kind: 'callout',
        title: 'The "Why" Notebook',
        text: 'Keep a running notebook of every question you got wrong and the *reason* (silly mistake, didn\'t know the rule, didn\'t finish in time). Re-read it before each practice test. This single habit is worth more than any prep book.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'rp-3',
    title: 'Free vs. Paid Prep — What Works',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You Can Get to a 1500 SAT for $0' },
      {
        kind: 'paragraph',
        text: 'It is genuinely possible to score in the 99th percentile using only free resources. Khan Academy partners with the College Board to provide personalized SAT practice, and ACT Academy offers the same for the ACT. Most students who pay for expensive prep do not need to.',
      },
      { kind: 'heading', text: 'When to Spend Money' },
      {
        kind: 'list',
        items: [
          'You\'ve plateaued: 4+ weeks of free prep with no further improvement → consider a tutor for targeted weak spots',
          'You learn better in a structured class than self-paced — Princeton Review or Kaplan offer course formats',
          'You need score-specific practice (e.g., 1500+ math questions) — UWorld and College Panda are well-regarded',
          'You have a learning difference — a specialized tutor familiar with accommodations may be worth it',
        ],
      },
      { kind: 'heading', text: 'What\'s Probably Not Worth It' },
      {
        kind: 'list',
        items: [
          'Generic in-person tutoring at $100+/hour for foundational skills (Khan Academy is free and personalized)',
          'Branded "boot camps" promising 300-point gains in a weekend',
          'Tutoring services that don\'t ask for your weak-area diagnostic before charging you',
        ],
      },
      {
        kind: 'callout',
        title: 'Spending Order',
        text: 'Try free prep for 4-6 weeks first. If you plateau, spend on targeted practice question banks (~$100). Only consider tutoring after that — and only for specific weaknesses, not generalized "help."',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'rp-4',
    title: 'Should You Hire a Tutor?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'When a Tutor Actually Helps' },
      {
        kind: 'paragraph',
        text: 'Tutors add the most value when you have specific, identifiable weaknesses that aren\'t resolving on their own — not as a substitute for studying. A good tutor diagnoses your gaps, gives you targeted practice, and holds you accountable. A bad tutor walks you through generic problems you could solve from a book.',
      },
      { kind: 'heading', text: 'Signs You\'d Benefit From One' },
      {
        kind: 'list',
        items: [
          'You\'ve plateaued at a score 50-150 points below your target after 4+ weeks of consistent prep',
          'You repeatedly miss the same kind of question (e.g., SAT geometry, ACT science timing)',
          'You\'re self-disciplined enough to do homework but need someone to identify what to work on',
        ],
      },
      { kind: 'heading', text: 'Signs You Don\'t Need One (Yet)' },
      {
        kind: 'list',
        items: [
          'You haven\'t taken a full timed practice test',
          'You haven\'t worked through Khan Academy or ACT Academy systematically',
          'You\'re hoping for a "magic" score boost without putting in the hours',
        ],
      },
      { kind: 'heading', text: 'How to Vet a Tutor' },
      {
        kind: 'list',
        items: [
          'Ask for their own SAT/ACT score (top tutors score 1550+/35+ themselves)',
          'Ask how they\'d structure your prep based on your diagnostic — vague answers = bad sign',
          'Try one session before committing to a package',
          'Avoid tutors who don\'t require homework between sessions',
        ],
      },
      {
        kind: 'callout',
        title: 'Cost Reality Check',
        text: 'Quality 1-on-1 tutoring runs $80-300/hour depending on location. 20 hours of tutoring is realistic for a meaningful score boost — that\'s $1,600-$6,000. Khan Academy is free and gets most students 80% of the way there.',
        variant: 'warning',
      },
    ],
  },

  /* ─── Score Strategy ─── */
  {
    id: 'ss-1',
    title: 'How to Interpret Your Score Report',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Reading the Score' },
      {
        kind: 'paragraph',
        text: 'Your SAT score (out of 1600) is split into two sections — Reading & Writing and Math — each scored 200-800. Your ACT composite (out of 36) is the average of four section scores (English, Math, Reading, Science). Both reports also give you percentiles, which matter more than raw scores when comparing yourself to other students.',
      },
      { kind: 'heading', text: 'Percentiles Matter Most' },
      {
        kind: 'paragraph',
        text: 'A 1450 SAT is roughly the 95th percentile, meaning you scored higher than 95% of test-takers. Colleges look at where you sit in the applicant pool. A 99th percentile score (1530+ SAT, 35+ ACT) is the threshold for highly selective schools, but a 90th-95th percentile score is competitive at most top-50 schools.',
      },
      { kind: 'heading', text: 'What Subscores Tell You' },
      {
        kind: 'list',
        items: [
          'SAT subscores break down skills like "Heart of Algebra" or "Words in Context" — useful for diagnosing what to study before retaking',
          'ACT gives you an English-Math-Reading-Science breakdown — a 35-30-32-28 tells you to focus on Science',
          'Don\'t obsess over individual subscores when applying — colleges look at the composite',
        ],
      },
      {
        kind: 'callout',
        title: 'The 25th-75th Percentile',
        text: 'When colleges publish their "middle 50%" SAT range, they mean the 25th to 75th percentile of admitted students. A score above the 75th percentile makes you competitive; below the 25th, you should expect to be in the bottom of the applicant pool unless other parts of your application stand out.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'ss-2',
    title: 'Should You Retake?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Retake Decision' },
      {
        kind: 'paragraph',
        text: 'Most students retake the SAT or ACT at least once. Score improvement on a second attempt is the norm, not the exception — averaging 30-70 points on the SAT and 1-2 points on the ACT, just from familiarity. The question isn\'t usually "should I retake" but "is it worth the time."',
      },
      { kind: 'heading', text: 'Retake If…' },
      {
        kind: 'list',
        items: [
          'Your score is below your target schools\' 25th percentile — a retake is high-leverage',
          'Your score is below the 50th percentile and you have time/energy for serious prep',
          'You felt off on test day (sick, tired, distracted) — your real ability is likely higher',
          'You\'ve studied since the first test and your practice scores are now meaningfully higher',
        ],
      },
      { kind: 'heading', text: 'Don\'t Retake If…' },
      {
        kind: 'list',
        items: [
          'You\'re already at the 75th+ percentile of your target schools',
          'You\'re hoping to improve without doing more prep — score gains require new effort',
          'It\'s already senior fall and your applications are due — focus on essays instead',
          'Your stress about retakes is hurting your overall application',
        ],
      },
      {
        kind: 'callout',
        title: 'How Many Times Is Too Many?',
        text: 'Three is the soft cap most counselors recommend. After three attempts, additional retakes rarely change scores meaningfully and start signaling poor judgment to admissions readers. Stop chasing perfection — most schools care more about a strong application overall.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'ss-3',
    title: 'When and How to Send Scores',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Score Reporting Mechanics' },
      {
        kind: 'paragraph',
        text: 'Both the College Board (SAT) and ACT charge to send your scores to colleges. You get four free score sends with each test if you choose them at registration or within 9 days after. After that, each send costs $14 (SAT) or $19 (ACT) — this adds up fast if you\'re applying to 12+ schools.',
      },
      { kind: 'heading', text: 'Score Choice Strategy' },
      {
        kind: 'list',
        items: [
          'SAT: "Score Choice" lets you pick which test dates to send — some colleges require all scores, but most accept Score Choice',
          'ACT: Each test date is sent individually — you can choose which to send',
          'Some colleges (Yale, Stanford) ask for ALL scores — read each school\'s policy carefully',
          'Test-optional schools: only send if your score helps your application (above their 50th percentile)',
        ],
      },
      { kind: 'heading', text: 'Practical Workflow' },
      {
        kind: 'checklist',
        title: 'Sending Scores',
        items: [
          'List your colleges and their score-reporting policies (all scores vs. Score Choice)',
          'Decide whether your score helps each application (test-optional schools)',
          'Send scores at least 4 weeks before each application deadline (delivery takes time)',
          'Use fee waivers if eligible — they cover unlimited score sends',
        ],
      },
      {
        kind: 'callout',
        title: 'Self-Reporting',
        text: 'Many colleges now let you self-report scores on the application and only require official reports if admitted. This saves money. Always read the application instructions carefully — sending scores when not required is wasted money.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ss-4',
    title: 'Superscoring Explained',
    type: 'article',
    body: [
      { kind: 'heading', text: 'What Is Superscoring?' },
      {
        kind: 'paragraph',
        text: 'Superscoring is when a college takes your highest section scores from multiple test dates and combines them into a single "superscore." For example, if you scored 700 Reading + 650 Math the first time and 680 Reading + 720 Math the second time, your superscore would be 700 + 720 = 1420.',
      },
      { kind: 'heading', text: 'Who Superscores' },
      {
        kind: 'list',
        items: [
          'Most colleges superscore the SAT — including Harvard, Yale, MIT, and many state flagships',
          'ACT superscoring is now the official policy of ACT.org and is accepted by most schools',
          'A few schools (e.g., Georgetown) require ALL scores and don\'t officially superscore — though they may informally consider your highest sections',
          'Always check each school\'s testing policy on their admissions website',
        ],
      },
      { kind: 'heading', text: 'Strategy Implication' },
      {
        kind: 'paragraph',
        text: 'If your target schools superscore, you can prep harder for one section at a time across multiple sittings. Bombed Math your first try? Focus prep entirely on Math for the retake — your strong Reading score is locked in. This is one reason most students take the test 2-3 times.',
      },
      {
        kind: 'callout',
        title: 'Superscoring Caveat',
        text: 'Even at schools that superscore, admissions officers see ALL your test attempts. A pattern of taking the test 5+ times can look strategic in a bad way. Aim for 2-3 thoughtful, prepared attempts.',
        variant: 'warning',
      },
    ],
  },

  /* ─── AP & Subject Tests ─── */
  {
    id: 'ap-1',
    title: 'Plan Your AP Exam Schedule',
    type: 'task',
    body: [
      { kind: 'heading', text: 'AP Exams Are a Strategic Choice' },
      {
        kind: 'paragraph',
        text: 'AP exams (administered each May) cost $98 per exam in 2026. They earn you college credit at most U.S. colleges if you score 4 or 5 (sometimes 3) — potentially saving thousands in tuition. They also signal academic rigor on your transcript. But taking too many or scoring poorly can backfire.',
      },
      { kind: 'heading', text: 'How Many APs to Take' },
      {
        kind: 'list',
        items: [
          'Top schools expect 5-8 APs across all four years (more is not always better)',
          'Quality > quantity: a 5 on three APs beats a 3 on six APs',
          'Take APs in subjects you\'re strong in — not as a "I should" exercise',
          'Senior year: load up on APs that align with your intended major',
        ],
      },
      { kind: 'heading', text: 'Building Your Schedule' },
      {
        kind: 'checklist',
        title: 'AP Planning',
        items: [
          'List APs offered at your school by year (talk to your counselor)',
          'Identify which align with your intended college major',
          'Consider self-study APs (Macroeconomics, Psychology) if your school doesn\'t offer them',
          'Register through your AP Coordinator by the November deadline',
          'Mark exam week (always 1st-2nd week of May) on your calendar',
        ],
      },
      { kind: 'link', label: 'AP Course & Exam Calendar', url: 'https://apstudents.collegeboard.org/exam-calendar', description: 'Official 2026-27 AP exam schedule from College Board.' },
    ],
  },
  {
    id: 'ap-2',
    title: 'AP Score Requirements at Top Schools',
    type: 'article',
    body: [
      { kind: 'heading', text: 'How Colleges Use AP Scores' },
      {
        kind: 'paragraph',
        text: 'Most colleges grant credit for AP scores of 4 or 5 — sometimes 3. The credit equivalent varies wildly: a 5 in AP Calculus BC might count as Calc 1+2 at one school, only Calc 1 at another, and zero credit at a third. Always check each school\'s AP policy individually.',
      },
      { kind: 'heading', text: 'Score Requirement Patterns' },
      {
        kind: 'list',
        items: [
          'Ivy League: typically requires 5s for credit, often 4s for placement (no credit)',
          'Top public flagships (UCLA, Michigan): often grant credit for 3s and 4s',
          'Liberal arts colleges (Williams, Amherst): vary widely; many give credit but limit how much can transfer',
          'STEM-heavy schools (MIT, Caltech): tougher policies — often require 5s and may still want you to retake foundations',
        ],
      },
      { kind: 'heading', text: 'Strategic Implications' },
      {
        kind: 'list',
        items: [
          'A 4 or 5 on a relevant AP can save you a semester of intro-level coursework',
          'Foreign language APs often unlock placement in higher-level courses, even without credit',
          'Some pre-med tracks require you to retake bio/chem regardless of AP scores — don\'t plan to skip them',
          'Engineering: Calc BC and Physics C are the most universally accepted',
        ],
      },
      {
        kind: 'callout',
        title: 'Where to Look',
        text: 'Search "[college name] AP credit policy" on the school\'s website. Most have a table showing which AP scores grant which credits. Bookmark these for the schools on your list.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ap-3',
    title: 'Are SAT Subject Tests Still Relevant?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Short Answer: No' },
      {
        kind: 'paragraph',
        text: 'The College Board discontinued SAT Subject Tests in January 2021. They no longer exist. If you read older college guidance about Subject Tests, ignore it — that information is outdated.',
      },
      { kind: 'heading', text: 'What Replaced Them' },
      {
        kind: 'paragraph',
        text: 'For demonstrating subject-specific mastery to colleges, you now use AP exams. AP exams are deeper, year-long courses that produce a single 1-5 score, and they are universally accepted by U.S. colleges. APs are now the primary signal for "I am academically prepared in this subject area."',
      },
      { kind: 'heading', text: 'What This Means for You' },
      {
        kind: 'list',
        items: [
          'Don\'t worry about Subject Tests — they\'re gone',
          'Focus your "demonstrate mastery" energy on AP courses + exams',
          'For language proficiency: AP language exams or external certifications (DELE for Spanish, JLPT for Japanese) can substitute',
          'For STEM mastery: AP Physics C, Calc BC, Chem, and Bio are the most signal-rich',
        ],
      },
      {
        kind: 'callout',
        title: 'International Students',
        text: 'If you\'re applying to U.S. schools from outside the U.S., A-levels, IB Higher Level scores, and international equivalents serve a similar role. Your school counselor can advise on which carries the most weight at your target schools.',
        variant: 'info',
      },
    ],
  },
]

export const TESTING_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  TESTING_CONTENT.map((c) => [c.id, c]),
)
