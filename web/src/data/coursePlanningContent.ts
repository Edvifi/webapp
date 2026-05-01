import type { ChecklistContent } from './checklistContent'

export const CP_CONTENT: ChecklistContent[] = [
  {
    id: 'cr-1',
    title: 'How Colleges Read Your Transcript',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Most Important Document' },
      {
        kind: 'paragraph',
        text: 'Your high school transcript is the single most important part of your application. It shows colleges what you took, how hard those classes were, and how you performed — across four years, not one weekend. Test scores can be improved, essays can be rewritten, but your transcript is the cumulative record of every academic choice you\'ve made.',
      },
      { kind: 'heading', text: 'What Admissions Readers Look For' },
      {
        kind: 'list',
        items: [
          'Rigor — did you challenge yourself given what your school offers?',
          'Trajectory — are your grades flat, improving, or declining? Improving is best',
          'Core academic load — English, math, science, social studies, foreign language each year',
          'Senior year courses — are you coasting or maintaining rigor?',
          'Context — what does YOUR school offer? You\'re evaluated against what was available, not against a national standard',
        ],
      },
      { kind: 'heading', text: 'School Profile Context' },
      {
        kind: 'paragraph',
        text: 'Every transcript is read alongside your school\'s "School Profile" — a document your counselor sends that explains your school\'s grading scale, AP offerings, course selections, and graduate outcomes. A 3.7 at a school with deep AP offerings reads differently than a 3.7 at a school with limited course selection. Colleges adjust for context.',
      },
      {
        kind: 'callout',
        title: 'You Can\'t Take What Your School Doesn\'t Offer',
        text: 'If your school only has 4 APs, you can\'t be penalized for taking only 4 APs. Admissions officers read transcripts in school context, not against an absolute scale. Take the most rigorous courses available to you — that\'s the standard.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'cr-2',
    title: 'Honors vs. AP vs. Dual Enrollment',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Three Rigorous Options' },
      {
        kind: 'paragraph',
        text: 'Beyond regular courses, most schools offer some combination of Honors, AP, and Dual Enrollment. Each signals rigor and earns extra GPA weight at most schools. Understanding the differences helps you choose what fits your school and goals.',
      },
      { kind: 'heading', text: 'Honors' },
      {
        kind: 'list',
        items: [
          'Faster pace, more depth than regular courses',
          'Curriculum is set by your school — varies in rigor',
          'Most schools weight by 0.5 GPA points',
          'No external exam — grade is determined by your teacher',
          'Often a prerequisite for AP courses in the same subject',
        ],
      },
      { kind: 'heading', text: 'Advanced Placement (AP)' },
      {
        kind: 'list',
        items: [
          'Standardized curriculum set by College Board — same nationwide',
          'External AP exam each May; 1-5 scale, 4-5 typically earns college credit',
          'Most schools weight by 1.0 GPA point (so an A in AP = 5.0)',
          'Universally recognized by colleges as rigorous',
          'Strong AP scores can earn you actual college credit (saves money)',
        ],
      },
      { kind: 'heading', text: 'Dual Enrollment' },
      {
        kind: 'list',
        items: [
          'Take real college courses (often at a local community college) for HS + college credit',
          'Curriculum and grade come from the college professor',
          'Credit usually transfers within your state, less reliably out of state',
          'Best for students who\'ve exhausted their school\'s AP offerings',
          'Some private colleges (especially Ivies) prefer AP over Dual Enrollment for credit',
        ],
      },
      {
        kind: 'callout',
        title: 'Strategic Mix',
        text: 'A typical strong transcript: Honors in 9th-10th, transitioning to AP in 11th-12th. Dual enrollment is a great supplement when you\'ve run out of advanced courses. Don\'t mix all three indiscriminately — admissions readers care about rigor, not bingo cards.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'cr-3',
    title: 'Weighted vs. Unweighted GPA',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Two Different Numbers' },
      {
        kind: 'paragraph',
        text: 'Most high schools report two GPA numbers: unweighted (4.0 scale, A=4.0 regardless of course level) and weighted (some scale that gives extra points for honors/AP). Colleges use both — for different reasons.',
      },
      { kind: 'heading', text: 'Unweighted GPA' },
      {
        kind: 'paragraph',
        text: 'Always on a 4.0 scale. An A is 4.0, B is 3.0, etc., regardless of whether the class was Regular, Honors, or AP. This shows raw performance — did you earn the grade or not.',
      },
      { kind: 'heading', text: 'Weighted GPA' },
      {
        kind: 'paragraph',
        text: 'Adds extra points for harder courses. Most common scale: +0.5 for Honors, +1.0 for AP. So an A in AP Calc = 5.0, an A in Regular Algebra = 4.0. Your school may use a different scale (some go up to 5.5 or use percentages).',
      },
      { kind: 'heading', text: 'How Colleges Use Both' },
      {
        kind: 'list',
        items: [
          'Unweighted: shows your raw academic performance',
          'Weighted: shows whether you took advantage of available rigor',
          'Many colleges recalculate GPA themselves using their own formula — this is normal',
          'School profile tells colleges your school\'s GPA distribution, so they can compare you to your classmates',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Game It',
        text: 'Taking an AP just to boost weighted GPA, then earning a B, is worse than taking a regular course and getting an A — for both GPAs. Take rigorous courses you can succeed in, not the one with the best weight-to-effort ratio.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'ap-1',
    title: 'How Many APs Is Enough?',
    type: 'article',
    body: [
      { kind: 'heading', text: 'It Depends on Your School' },
      {
        kind: 'paragraph',
        text: 'There\'s no universal "right number" of APs. The right answer is: as many as you can handle while still earning A\'s and maintaining your other commitments. For students at schools with deep AP offerings, that\'s typically 5-10 APs across all four years. At schools with limited offerings, 3-5 may be the max available.',
      },
      { kind: 'heading', text: 'What Top Schools Look For' },
      {
        kind: 'list',
        items: [
          'Highly selective: typically 7-10 APs by graduation (or equivalent rigor)',
          'Selective: 4-7 APs',
          'Most colleges: 2-5 APs is competitive',
          'No college expects more than your school offers — context matters',
        ],
      },
      { kind: 'heading', text: 'Quality > Quantity' },
      {
        kind: 'paragraph',
        text: 'A student with 5 APs and all A\'s + 5\'s on the exams is more competitive than one with 8 APs and a mix of B\'s + 3\'s. Admissions readers see through "AP loading" — they\'re looking for genuine engagement and capability, not stamps on a passport.',
      },
      {
        kind: 'callout',
        title: 'AP Distribution',
        text: 'A typical strong load: 1 AP in 10th grade, 3-4 APs in 11th, 4-5 APs in 12th. Front-loading APs in junior year is fine — colleges see junior-year grades when applying RD/EA. Don\'t take too many in 9th grade; you have plenty of time to ramp up.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ap-2',
    title: 'Choosing APs by Intended Major',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Match Your APs to Your Story' },
      {
        kind: 'paragraph',
        text: 'For students with a clear intended major, your AP selections should reinforce that direction. Colleges expect to see academic preparation aligned with what you\'re telling them you want to study. Here\'s how that maps for common tracks.',
      },
      { kind: 'heading', text: 'STEM / Engineering' },
      {
        kind: 'list',
        items: [
          'Calc BC (over Calc AB if available) — universal STEM expectation',
          'Physics C: Mechanics + E&M (or Physics 1 + 2 if C unavailable)',
          'Chemistry — required prep for engineering, pre-med, chemistry',
          'CS A — for any computational major',
          'Biology — required for pre-med, life sciences',
        ],
      },
      { kind: 'heading', text: 'Humanities / Social Sciences' },
      {
        kind: 'list',
        items: [
          'English Lang + Lit — both if available',
          'US History + World History (or European)',
          'Government + Macroeconomics',
          'Foreign language — at least Level 4 or AP',
          'Psychology — common signal for social science majors',
        ],
      },
      { kind: 'heading', text: 'Pre-Business / Pre-Law' },
      {
        kind: 'list',
        items: [
          'Macro + Microeconomics',
          'Statistics',
          'English Language',
          'Government',
          'Calc AB (Calc BC if comfortable)',
        ],
      },
      {
        kind: 'callout',
        title: 'If You\'re Undecided',
        text: 'Take a balanced AP load: at least one math (Calc), one science (Bio/Chem/Physics), one humanities (English Lit), one social science (US History or Psych), one foreign language. That keeps every door open.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'ap-3',
    title: 'Self-Studying APs',
    type: 'article',
    body: [
      { kind: 'heading', text: 'When It Makes Sense' },
      {
        kind: 'paragraph',
        text: 'Self-studying for an AP exam means taking the exam without taking the school\'s AP class. You study independently, register through your school (or an open-registration center), and take the exam in May. It\'s harder than taking the class, but in some cases it\'s worth it.',
      },
      { kind: 'heading', text: 'Worth Self-Studying' },
      {
        kind: 'list',
        items: [
          'AP Psychology — short syllabus, well-suited to a textbook + practice tests',
          'AP Macro / Micro Economics — manageable in a month or two',
          'AP Government — fact-dense but learnable independently',
          'AP Human Geography — popular self-study choice',
          'A subject your school doesn\'t offer that aligns with your major',
        ],
      },
      { kind: 'heading', text: 'Hard to Self-Study' },
      {
        kind: 'list',
        items: [
          'AP English Lit / Lang — essay grading is subjective; teacher feedback is critical',
          'AP Calculus / Physics C — heavy problem-solving, hard without instruction',
          'AP Foreign Language — speaking + listening sections require practice with others',
          'AP Studio Art — portfolio submission, hard to do alone',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Add the Class to Your Transcript',
        text: 'Self-studied APs do NOT appear on your transcript (you didn\'t take the class). The score appears on your AP score report, which you can self-report or send to colleges. Some students list it under "Awards" if they scored 5; others mention it in a supplemental.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'bp-1',
    title: 'Core Requirements All Colleges Expect',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Universal Baseline' },
      {
        kind: 'paragraph',
        text: 'Almost every U.S. college expects a baseline of academic coursework across the five core subjects, throughout high school. Skipping a year of any of these — especially senior year — is a red flag. Here\'s what selective colleges expect.',
      },
      { kind: 'heading', text: 'The Five Cores (4 years each)' },
      {
        kind: 'list',
        items: [
          'English — 4 years (English I, II, III, IV or honors/AP equivalents)',
          'Math — 4 years through at least Algebra II, ideally Pre-Calc + Calculus',
          'Science — 3-4 years including Bio + Chem + Physics (lab sciences)',
          'Social Studies — 3-4 years including US History + World History + Government/Econ',
          'Foreign Language — 3-4 years of the SAME language (not 2 years of two languages)',
        ],
      },
      { kind: 'heading', text: 'Selectivity Adjustments' },
      {
        kind: 'list',
        items: [
          'Highly selective: 4 years of all 5 cores at the highest available rigor',
          'Selective: 4 years of English/Math, 3+ of science/social studies, 3+ of one foreign language',
          'Most colleges: 4 English, 3 math through Algebra II, 2-3 science, 2-3 social studies, 2 foreign language',
          'Some state schools have specific requirements — check each school\'s admission requirements',
        ],
      },
      {
        kind: 'callout',
        title: 'The Foreign Language Mistake',
        text: 'Many students drop foreign language after 2 years to take more electives. This hurts your application at most selective schools. 3-4 years of one language signals depth; 2 years signals minimum compliance. Stick with one through senior year if possible.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'bp-2',
    title: 'Major-Specific Prerequisites',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Some Majors Have Hard Requirements' },
      {
        kind: 'paragraph',
        text: 'Beyond the core five subjects, certain majors have specific high school course expectations. Missing a prerequisite doesn\'t always block admission, but it\'s a clear gap admissions readers will notice — especially for direct-admit programs.',
      },
      { kind: 'heading', text: 'Engineering' },
      {
        kind: 'list',
        items: [
          'Calculus (BC strongly preferred)',
          'Physics (C: Mechanics minimum, both Cs ideal)',
          'Chemistry',
          'Computer Science (helpful but not always required)',
        ],
      },
      { kind: 'heading', text: 'Computer Science' },
      {
        kind: 'list',
        items: [
          'Calculus (BC for top programs)',
          'AP CS A or equivalent programming experience',
          'Demonstrated coding outside of class — projects, hackathons, contributions',
        ],
      },
      { kind: 'heading', text: 'Pre-Med / Biology' },
      {
        kind: 'list',
        items: [
          'Biology + Chemistry + Physics',
          'Calculus (AB minimum, BC preferred)',
          'AP Bio + AP Chem if available',
        ],
      },
      { kind: 'heading', text: 'Business' },
      {
        kind: 'list',
        items: [
          'Strong math through Calculus',
          'Statistics',
          'AP Macro + Micro Economics',
          'Strong English / writing',
        ],
      },
      { kind: 'heading', text: 'Architecture / Studio Art' },
      {
        kind: 'list',
        items: [
          'AP Studio Art or Portfolio-track classes',
          'Math through at least Pre-Calc',
          'Physics (helpful for architecture)',
        ],
      },
      {
        kind: 'callout',
        title: 'Check Each School',
        text: 'For majors with direct admission (engineering, business at undergrad B-schools), check each target school\'s specific course expectations on their admissions page. Some are firm; some are guidelines.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'bp-3',
    title: 'Build Out Your 4-Year Plan',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Action Step' },
      {
        kind: 'paragraph',
        text: 'Use the 4-Year Plan tab in this module to map out your courses across all four years of high school. Even if you\'re a sophomore or junior, fill in past years (with grades) and plan ahead. The grid auto-calculates an estimated GPA as you fill it in.',
      },
      {
        kind: 'checklist',
        title: '4-Year Plan Checklist',
        items: [
          'Each year has English, math, science, social studies, foreign language',
          'Senior year does not coast — at least 3 cores, ideally 4',
          'AP / Honors progression makes sense (not jumping from regular to AP without prep)',
          'Major-specific prerequisites are covered',
          'Talk to your counselor about course availability and prerequisites',
        ],
      },
    ],
  },
  {
    id: 'bp-4',
    title: 'When Your School Doesn\'t Offer What You Need',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You Have Options' },
      {
        kind: 'paragraph',
        text: 'Not every high school offers AP Calc BC, AP Physics C, or AP Computer Science. If your school\'s offerings are limited and your target schools expect rigor, you have several real options that admissions readers respect.',
      },
      { kind: 'heading', text: 'Dual Enrollment' },
      {
        kind: 'paragraph',
        text: 'Take a course at a local community college during the school year (often free for HS students) or in summer. Most states have programs that allow this. The course appears on a college transcript, which counts as rigor.',
      },
      { kind: 'heading', text: 'Online Coursework' },
      {
        kind: 'list',
        items: [
          'Johns Hopkins CTY — for advanced students, especially in math/science',
          'Stanford OHS — full online HS program',
          'edX / Coursera — for self-study; less recognized but signals motivation',
          'Florida Virtual School — accredited, often accepted by other states for credit',
        ],
      },
      { kind: 'heading', text: 'Self-Study + AP Exam' },
      {
        kind: 'paragraph',
        text: 'For courses your school doesn\'t offer, you can self-study and take the AP exam. The score (4 or 5) signals to colleges that you mastered college-level material independently — actually a strong signal.',
      },
      {
        kind: 'callout',
        title: 'Document the Effort',
        text: 'When taking courses outside your school, mention them in the "Additional Information" section of the Common App. Colleges want to see you\'ve sought out rigor your school doesn\'t provide.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'yy-1',
    title: 'When (and How) to Drop a Course',
    type: 'article',
    body: [
      { kind: 'heading', text: 'It\'s Sometimes the Right Move' },
      {
        kind: 'paragraph',
        text: 'Dropping a course mid-year is sometimes the right choice — better to earn A\'s in 5 classes than B\'s in 6. But how and when you drop matters. Done right, it doesn\'t hurt your application; done wrong, it raises red flags.',
      },
      { kind: 'heading', text: 'When Dropping Is Reasonable' },
      {
        kind: 'list',
        items: [
          'You\'re overloaded and your grades are slipping across multiple classes',
          'A specific course is genuinely beyond your preparation level',
          'You\'re dealing with a real life situation (illness, family) — talk to your counselor',
          'You can drop within the school\'s "no record" window (no W on transcript)',
        ],
      },
      { kind: 'heading', text: 'How to Drop Without Damage' },
      {
        kind: 'list',
        items: [
          'Drop early — within the first few weeks if possible (no W or grade)',
          'Talk to your counselor first — they can advise on transcript implications',
          'Replace it with a substitute (a study hall is better than a dropped class on paper)',
          'If a W appears, your counselor can explain context in their letter',
        ],
      },
      { kind: 'heading', text: 'When Not to Drop' },
      {
        kind: 'list',
        items: [
          'You\'re struggling but it\'s only October — give yourself time to adjust',
          'You took the class for status (AP X, weighted GPA) and now want out — admissions reads through this',
          'Senior year second semester — counts as "senior coast"',
        ],
      },
      {
        kind: 'callout',
        title: 'B in AP > Drop to Regular',
        text: 'Earning a B in an AP course is generally better than dropping it for a regular course (or no course). Admissions readers value persistence in rigor. Drop only if a course is genuinely unsustainable.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'yy-2',
    title: 'Senior-Year Course Load — Don\'t Coast',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Senior Year Counts More Than You Think' },
      {
        kind: 'paragraph',
        text: 'Senior year courses are visible to colleges twice: in your initial application (showing what you\'re taking) and in your mid-year report (showing first-semester grades). Colleges revoke admission offers every year for senior-year coasting and grade drops. This is real.',
      },
      { kind: 'heading', text: 'What Coasting Looks Like (Don\'t Do This)' },
      {
        kind: 'list',
        items: [
          'Dropping an academic core to take a study hall or two electives',
          'Dropping from AP to regular without a real reason',
          'Earning B\'s and C\'s when previous years were all A\'s',
          'Stopping foreign language after 3 years just for a "lighter" senior schedule',
        ],
      },
      { kind: 'heading', text: 'What Strong Senior Year Looks Like' },
      {
        kind: 'list',
        items: [
          '4 cores (English, math, science/social-studies, foreign language)',
          'At least one AP / Honors / DE course',
          'Maintained rigor relative to junior year',
          'A\'s and B\'s — not flat-lining or dropping',
        ],
      },
      {
        kind: 'callout',
        title: 'Mid-Year Report Reality',
        text: 'After you submit applications (or after RD acceptance), your school sends mid-year grades. If you crashed senior fall — multiple B\'s, dropped a class without explanation — colleges can defer or rescind. This happens to ~1-2% of admitted students every year. Don\'t be one of them.',
        variant: 'warning',
      },
    ],
  },
]

export const CP_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  CP_CONTENT.map((c) => [c.id, c]),
)
