import type { ChecklistContent } from './checklistContent'

export const EC_CONTENT: ChecklistContent[] = [
  {
    id: 'al-1',
    title: 'Depth vs. Breadth — What Colleges Actually Value',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Depth Wins' },
      {
        kind: 'paragraph',
        text: 'For decades the conventional wisdom was "be well-rounded." That\'s out of date. Top colleges today are looking for "well-rounded classes" — which means each individual student is sharp in something specific. They\'d rather admit a debate champion AND a violinist AND a researcher than three students who do all three at a mediocre level.',
      },
      { kind: 'heading', text: 'What Depth Looks Like' },
      {
        kind: 'list',
        items: [
          'Sustained involvement (3-4 years in the same activity)',
          'Increasing responsibility — member → officer → captain/president',
          'Tangible outcomes — projects shipped, awards earned, problems solved',
          'A clear story: "I\'m a person who does X" comes through across activities',
        ],
      },
      { kind: 'heading', text: 'When Breadth Helps' },
      {
        kind: 'paragraph',
        text: 'Breadth still matters at the margins — colleges want students who contribute beyond their primary interest. Two or three "secondary" activities (especially community service or athletics) signal that you\'re not a single-track machine. Just don\'t spread so thin that none of them go deep.',
      },
      {
        kind: 'callout',
        title: 'The 2-3 Activity Rule',
        text: 'Aim for 2-3 activities where you have meaningful depth (multi-year, leadership, tangible impact) and 3-5 supporting activities. The 10 Common App slots are a maximum, not a minimum — quality beats quantity every time.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'al-2',
    title: 'The "Spike" vs. Well-Rounded Debate',
    type: 'article',
    body: [
      { kind: 'heading', text: 'What "Spike" Means' },
      {
        kind: 'paragraph',
        text: 'A "spike" is a clear, demonstrable area of excellence — usually a national-level achievement, sustained research, a meaningful business or nonprofit, or recognized expertise. A student with a spike is someone admissions readers can describe in one sentence: "She\'s the kid who placed at USAMO." Spikes get students into ultra-selective schools when stats alone wouldn\'t.',
      },
      { kind: 'heading', text: 'Spike Strategies That Work' },
      {
        kind: 'list',
          items: [
            'Competition track — Math Olympiad, Science Olympiad, Speech & Debate national circuit, Robotics worlds',
            'Research — independent project published or recognized (Regeneron, ISEF, RSI)',
            'Creative output — published writing, exhibited art, recorded music, produced film',
            'Entrepreneurship — actual revenue, users, or social impact (not "I made a website")',
            'Sustained service — 1,000+ hours building or running something tangible',
          ],
      },
      { kind: 'heading', text: 'Don\'t Force a Spike' },
      {
        kind: 'paragraph',
        text: 'A spike that\'s genuine almost always emerges from years of obsession, not a sophomore-year strategy session. Students who try to manufacture a spike in junior year usually end up with a thin, transparent application. If you don\'t have one organically, lean into well-rounded with real depth in 2-3 things — that\'s admissible at most schools.',
      },
      {
        kind: 'callout',
        title: 'Reality Check',
        text: 'Not having a spike is fine. Most students admitted to top schools are well-rounded with strong stats. The spike narrative gets airtime because it\'s dramatic — but it\'s not the only path.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'al-3',
    title: 'Filling the Common App\'s 10 Slots',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You Don\'t Need All 10' },
      {
        kind: 'paragraph',
        text: 'The Common App gives you 10 activity slots. Most strong applicants list 6-8. Filling all 10 with thin entries (one-semester clubs, summer programs you attended once) signals padding, not depth. Use only the slots you can fill substantively.',
      },
      { kind: 'heading', text: 'How to Order Them' },
      {
        kind: 'paragraph',
        text: 'The Common App lets you rank activities by importance. Your most substantive activity goes in slot 1. Don\'t put "JV soccer freshman year" before your three-year debate captaincy. Admissions officers read top-down and weight earlier slots more heavily.',
      },
      { kind: 'heading', text: 'What to Include' },
      {
        kind: 'list',
        items: [
          'Real clubs and teams with sustained participation',
          'Paid jobs — these matter and many students under-report them',
          'Family responsibilities (caring for siblings, running a household errand) — explicitly counts',
          'Independent projects (your own research, blog, business, art)',
          'Volunteer work — but quantify hours and impact specifically',
        ],
      },
      { kind: 'heading', text: 'What to Skip' },
      {
        kind: 'list',
        items: [
          'Clubs you joined but never actively participated in',
          'One-time events ("attended TEDxYouth in 9th grade")',
          'Pay-to-play summer programs unless you got something concrete from them',
          'Activities listed only to look diverse — readers see through this',
        ],
      },
      {
        kind: 'callout',
        title: 'The "Family Responsibilities" Slot',
        text: 'If you regularly help raise siblings, translate for parents, work to support your family, or care for an ill relative — list it. This is real, time-consuming work that admissions committees explicitly want to know about.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'li-1',
    title: 'What "Leadership" Really Means',
    type: 'article',
    body: [
      { kind: 'heading', text: 'It\'s Not the Title' },
      {
        kind: 'paragraph',
        text: 'Being "President of the Spanish Club" with no concrete accomplishments is a thin signal. Being a member of a robotics team who designed and built the chassis that won regionals is a strong signal. Admissions officers look for impact, not titles.',
      },
      { kind: 'heading', text: 'Strong Leadership Looks Like' },
      {
        kind: 'list',
        items: [
          'You started something — a project, club, initiative — and saw it through',
          'You took ownership of a problem and solved it (raised money, built a system, recruited members)',
          'You taught or mentored others (junior team members, younger students)',
          'You changed how something gets done (improved a process, fixed a broken structure)',
          'You showed up consistently when others didn\'t',
        ],
      },
      { kind: 'heading', text: 'Weak Leadership Looks Like' },
      {
        kind: 'list',
        items: [
          'Title without specifics ("Vice President" with no described accomplishments)',
          'Founded a club that meets twice and dissolves',
          'Brief involvement followed by senior-year title grab',
        ],
      },
      {
        kind: 'callout',
        title: 'Quiet Leadership Counts',
        text: 'You don\'t need a title to demonstrate leadership. The student who quietly mentors three underclassmen on the debate team is a leader. Articulate that in your description.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'li-2',
    title: 'Starting Your Own Initiative',
    type: 'article',
    body: [
      { kind: 'heading', text: 'When It\'s Worth It' },
      {
        kind: 'paragraph',
        text: 'A genuine initiative — a club, project, or organization you start and grow — can be one of the most compelling parts of your application. But it has to be real. A "nonprofit" you founded for the application that has no website, no programming, and no impact is worse than no nonprofit at all.',
      },
      { kind: 'heading', text: 'Start an Initiative If…' },
      {
        kind: 'list',
        items: [
          'There\'s a real problem at your school or in your community that doesn\'t have a solution',
          'You have time to actually build it (start in 9th-10th grade, not 12th)',
          'You can sustain it for 2+ years and recruit successors',
          'You\'re excited about the work, not just the line on your résumé',
        ],
      },
      { kind: 'heading', text: 'Don\'t Start an Initiative If…' },
      {
        kind: 'list',
        items: [
          'You\'re trying to manufacture a "founder" identity for applications',
          'It duplicates existing organizations (just join them)',
          'You can\'t commit to running it past the application cycle',
        ],
      },
      {
        kind: 'callout',
        title: 'Real Examples',
        text: 'Authentic initiatives that have worked: a tutoring program for younger students that ran for three years, a podcast interviewing local scientists, an open-source library that got 500 GitHub stars, a Saturday math club at a Title 1 elementary. Common thread: tangible output and sustained operation.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'li-3',
    title: 'How to Write Strong Activity Descriptions',
    type: 'article',
    body: [
      { kind: 'heading', text: 'You Have 150 Characters' },
      {
        kind: 'paragraph',
        text: 'Common App activity descriptions cap at 150 characters. That\'s tight — about a tweet. The temptation is to use big words and abbreviations to fit more in. Resist. Clarity wins. A reader who has to decode your description will move on.',
      },
      { kind: 'heading', text: 'The Formula' },
      {
        kind: 'paragraph',
        text: 'Active verb + specific accomplishment + measurable outcome (where possible). "Led 12-person debate team; advanced to state finals; coached 5 freshmen." That\'s 78 characters and tells the reader more than "Member of debate team — competed in tournaments and helped recruit new members" (101 characters).',
      },
      { kind: 'heading', text: 'Verbs That Work' },
      {
        kind: 'list',
        items: [
          'Built, designed, launched, founded — for things you created',
          'Led, organized, coached, mentored — for leadership',
          'Won, ranked, earned, qualified — for achievements (ALWAYS quantify)',
          'Wrote, recorded, published, presented — for creative output',
        ],
      },
      { kind: 'heading', text: 'Common Mistakes' },
      {
        kind: 'list',
        items: [
          'Generic ("Helped with various tasks") — describe the SPECIFIC tasks',
          'Buzzword-heavy ("Synergized cross-functional initiatives") — just write plainly',
          'Padding ("Member of club" — what did you actually DO?)',
          'Numbers without context ("Raised $500" — for what? over how long?)',
        ],
      },
    ],
  },
  {
    id: 'su-1',
    title: 'Summer Programs Worth Doing',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Spectrum' },
      {
        kind: 'paragraph',
        text: 'Summer programs range from genuinely competitive (RSI, MITES, TASP) to "anyone with $5,000 can attend." The first kind impress admissions; the second kind do not. Understanding which is which saves time and money.',
      },
      { kind: 'heading', text: 'Highly Competitive (Acceptance < 10%)' },
      {
        kind: 'list',
        items: [
          'RSI (Research Science Institute, MIT) — full-ride, top-tier research',
          'MITES (MIT Introduction to Tech, Engineering & Science) — STEM exposure for underrepresented students',
          'TASP (Telluride Association Summer Program) — humanities seminar, full-ride',
          'PROMYS (Program in Mathematics for Young Scientists, BU) — math research',
          'Stanford SUMaC (Math Camp) — proof-based math',
          'Iowa Young Writers\' Studio — creative writing',
        ],
      },
      { kind: 'heading', text: 'Generally Worthwhile' },
      {
        kind: 'list',
        items: [
          'Local university research programs (often free or low-cost)',
          'State-level science fairs and competitions',
          'Summer jobs and internships in fields you care about',
          'Self-directed projects (writing, building, learning)',
        ],
      },
      { kind: 'heading', text: 'Generally Not Worth Tuition' },
      {
        kind: 'list',
        items: [
          'Non-selective "summer at Harvard/Stanford" programs ($8K+ for a 2-week stay)',
          'Programs marketed as "by invitation" but accept anyone with the money',
          'Generic leadership / debate / business camps that don\'t produce measurable outcomes',
        ],
      },
      {
        kind: 'callout',
        title: 'Free Trumps Expensive',
        text: 'A free local research opportunity, a paid summer job, or a self-directed project consistently looks better on applications than an expensive non-selective summer program. Admissions readers can spot the latter from a mile away.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'su-2',
    title: 'Internships, Research, Jobs — By Year',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Match the Activity to the Year' },
      {
        kind: 'paragraph',
        text: 'Different activities make sense at different ages. Trying to do everything every summer is exhausting; aligning to a sensible progression makes for a stronger application narrative.',
      },
      { kind: 'heading', text: 'Summer After 9th Grade' },
      {
        kind: 'list',
        items: [
          'Best: explore broadly — try a class, a job, a sport, a creative project',
          'Build skills (coding, languages, instruments) without performance pressure',
          'Avoid: expensive non-selective summer programs',
        ],
      },
      { kind: 'heading', text: 'Summer After 10th Grade' },
      {
        kind: 'list',
        items: [
          'Best: internship at a local business, research with a professor, sustained project',
          'Apply for selective summer programs (RSI, MITES, etc.) — application deadlines are usually January-March',
          'Get a paid job — Common App now explicitly emphasizes paid work',
        ],
      },
      { kind: 'heading', text: 'Summer After 11th Grade' },
      {
        kind: 'list',
        items: [
          'Best: substantial commitment — research, internship, job, capstone of multi-year activity',
          'Common App essay drafting (start by July at the latest)',
          'Test prep + final SAT/ACT in August',
          'College visits (in person if possible)',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Do Nothing',
        text: 'A summer with nothing visible to show is a missed opportunity. But "something" can be modest — a paid job, a self-directed reading list, learning a new skill, family responsibilities. Document it; describe it well.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'su-3',
    title: 'Plan Next Summer',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Action Step' },
      {
        kind: 'paragraph',
        text: 'In the fall of each school year, plan what you\'ll do the following summer. Selective programs have deadlines in January-March. Even non-selective opportunities (jobs, local internships) get harder to find as summer approaches.',
      },
      {
        kind: 'checklist',
        title: 'Summer Planning Checklist',
        items: [
          'List 3-5 possible summer activities (programs, jobs, research, projects)',
          'Note application deadlines for any selective programs',
          'Identify 1-2 backup options',
          'Reach out to professors / employers / mentors at least 8 weeks ahead',
          'Block your calendar — summer fills up faster than you think',
        ],
      },
    ],
  },
  {
    id: 'aw-1',
    title: 'Listing Awards on the Common App',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Five Slots, Used Wisely' },
      {
        kind: 'paragraph',
        text: 'The Common App gives you 5 slots for honors and awards (academic distinctions, competition placements, scholarships). Use them strategically — empty slots are fine, but filling them with weak items dilutes your strong ones.',
      },
      { kind: 'heading', text: 'Strong Awards' },
      {
        kind: 'list',
        items: [
          'National-level academic recognition (National Merit Finalist, USAMO qualifier)',
          'Competition placements with measurable selectivity (top 10 in state, national finalist)',
          'External awards (community recognition, scholarships, published work)',
          'School-level awards that signal sustained excellence (valedictorian, department awards)',
        ],
      },
      { kind: 'heading', text: 'Weak Awards (Skip These)' },
      {
        kind: 'list',
        items: [
          'Honor roll, principal\'s list (transcript shows this)',
          'Participation certificates ("Attended Model UN")',
          'Rankings only meaningful in tiny pools ("3rd in class of 30")',
          'Awards for things already on your transcript or activity list',
        ],
      },
      {
        kind: 'callout',
        title: 'Always Specify Level',
        text: 'For each award, indicate level (school / regional / state / national / international) and grade earned. "Won state debate" is much weaker than "1st place, Texas State Debate Tournament, 11th grade — out of 240 participants."',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'aw-2',
    title: 'Competitions Worth Pursuing',
    type: 'resource',
    body: [
      { kind: 'heading', text: 'A Curated List by Field' },
      {
        kind: 'paragraph',
        text: 'These competitions carry national or international recognition. Placing in any of them is a strong application signal. Listed by primary field — qualifying timelines vary.',
      },
      { kind: 'heading', text: 'STEM' },
      {
        kind: 'list',
        items: [
          'AMC → AIME → USAMO (math)',
          'Science Olympiad (national)',
          'USACO (computing — qualify for Camp/IOI)',
          'Regeneron Science Talent Search (research)',
          'Intel ISEF (research)',
          'Conrad Challenge (innovation)',
        ],
      },
      { kind: 'heading', text: 'Speech & Debate' },
      {
        kind: 'list',
        items: [
          'NSDA Nationals',
          'Tournament of Champions (TOC)',
          'Harvard, Yale, Berkeley invitational tournaments',
        ],
      },
      { kind: 'heading', text: 'Writing & Humanities' },
      {
        kind: 'list',
        items: [
          'Scholastic Art & Writing Awards',
          'New York Times student contests (essay, photo, podcast)',
          'NEH Heritage / National History Day',
        ],
      },
      { kind: 'heading', text: 'Arts & Music' },
      {
        kind: 'list',
        items: [
          'YoungArts (multidisciplinary)',
          'National Honor Ensembles (band/orchestra/choir)',
          'Scholastic Art Awards (visual art)',
        ],
      },
      {
        kind: 'callout',
        title: 'Pick One Track',
        text: 'Multiple national-level achievements in one field is far more impressive than one shallow placement in five different competitions. Pick a track aligned with your interests and commit.',
        variant: 'tip',
      },
    ],
  },
]

export const EC_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  EC_CONTENT.map((c) => [c.id, c]),
)
