import type { ChecklistContent } from './checklistContent'

export const ESSAYS_CONTENT: ChecklistContent[] = [
  {
    id: 'ps-1',
    title: 'Common App Prompts — Picking One',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Prompt Mostly Doesn\'t Matter' },
      {
        kind: 'paragraph',
        text: 'The Common App offers seven prompts each year, including a "topic of your choice" option. Most experienced essay readers tell students to pick whichever prompt fits their best story — not to start from a prompt and try to invent a story. The story comes first; the prompt frames it.',
      },
      { kind: 'heading', text: 'How to Choose' },
      {
        kind: 'list',
        items: [
          'Brainstorm 5-10 possible stories first (see the brainstorming exercise)',
          'Then read the prompts; one will fit your strongest story naturally',
          'If multiple fit, pick the prompt that requires least bending',
          'When in doubt, prompt #7 ("topic of your choice") is fully fair game',
        ],
      },
      { kind: 'heading', text: 'What Each Prompt Lends Itself To' },
      {
        kind: 'list',
        items: [
          'Prompt 1 (background/identity/talent) — most popular, very flexible',
          'Prompt 2 (challenge/setback) — good for resilience stories, but easy to make trite',
          'Prompt 3 (questioning a belief) — good for intellectual narratives',
          'Prompt 4 (gratitude) — newer; good for vulnerability + relationship stories',
          'Prompt 5 (growth moment) — flexible but vague; can become mushy',
          'Prompt 6 (something you love) — best for "intellectual passion" essays',
          'Prompt 7 (your choice) — when none of the above fits cleanly',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Switch Prompts Mid-Draft',
        text: 'If you start drafting under one prompt and find yourself drifting toward another, switch the prompt — don\'t fight your story to fit. The prompt is a label, not a constraint.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ps-2',
    title: 'Brainstorming a Story (60-min Exercise)',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Why Brainstorm Before Writing' },
      {
        kind: 'paragraph',
        text: 'Most weak personal statements come from picking the first idea and writing 650 words around it. Strong essays come from brainstorming many possibilities and choosing the most distinctive one. Spend 60 minutes on this before you write a single sentence of the actual essay.',
      },
      { kind: 'heading', text: 'The 60-Minute Exercise' },
      {
        kind: 'list',
        items: [
          'Block 60 minutes of uninterrupted time. Phone in another room.',
          'Open a blank doc. List 20 specific moments from your life — small or large',
          'Examples: a conversation that changed your mind, a project you couldn\'t stop working on, a moment you felt wildly out of place, an interest no one in your school shares',
          'Don\'t filter — get all 20 down before judging any',
          'Then circle the 3-5 that feel surprising or specific to you (not generic)',
          'Write one sentence per circled story: what happened + what changed in you',
          'Pick the one with the most "what changed in you" weight — that\'s your story',
        ],
      },
      { kind: 'heading', text: 'Stories That Work' },
      {
        kind: 'list',
        items: [
          'The specific over the universal — your particular grandmother\'s soup, not "family"',
          'The small over the dramatic — a Tuesday conversation, not a tragedy',
          'The voice you actually have — write how you talk, not how you think you should sound',
          'The truth — readers detect manufactured "growth" instantly',
        ],
      },
      {
        kind: 'callout',
        title: 'Stories That Don\'t Work',
        text: 'Tropes to avoid: the sports injury, the trip abroad that "opened my eyes," the missed audition, the time you tutored someone in need, the time you discovered your passion. These are overused and rarely written distinctively. If your story IS one of these, find the angle that no one else would have.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'ps-3',
    title: 'Personal Statement Structure That Works',
    type: 'article',
    body: [
      { kind: 'heading', text: 'No Single Right Structure' },
      {
        kind: 'paragraph',
        text: 'There\'s no required formula for a personal statement. But effective ones tend to follow one of a few patterns. Here are three that work, and how to know which fits your story.',
      },
      { kind: 'heading', text: 'Pattern 1: The Specific Moment, Expanded' },
      {
        kind: 'paragraph',
        text: 'Open with a specific scene (you, a place, a moment). Anchor in sensory details. Zoom out to what that moment meant. Layer in 1-2 more related moments. Close with what changed.',
      },
      {
        kind: 'paragraph',
        text: 'Best for: stories about a single formative experience, a turning-point conversation, a particular obsession.',
      },
      { kind: 'heading', text: 'Pattern 2: The Through-Line' },
      {
        kind: 'paragraph',
        text: 'Open with a thread (an interest, a question, a tension). Show how it threads through different moments in your life. Show how it\'s evolved. Close with where it points.',
      },
      {
        kind: 'paragraph',
        text: 'Best for: students with a strong intellectual interest or recurring theme — "I\'ve been obsessed with X since I was 7."',
      },
      { kind: 'heading', text: 'Pattern 3: The Reframe' },
      {
        kind: 'paragraph',
        text: 'Open with how you used to see something. Show what made you see it differently. Show what you do with the new view. Close with a still-evolving question.',
      },
      {
        kind: 'paragraph',
        text: 'Best for: essays about questioning a belief, an identity shift, or a gradual realization.',
      },
      {
        kind: 'callout',
        title: 'Whatever Pattern, Show More Than Tell',
        text: 'Don\'t tell the reader you\'re curious — show yourself spending three weeks reading about migratory birds because the question of how they navigate wouldn\'t leave you alone. Show > tell, always.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ps-4',
    title: 'The Opening Hook — What Works',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The First Sentence Decides Whether They Keep Reading' },
      {
        kind: 'paragraph',
        text: 'Admissions readers spend 8-10 minutes per application. Your essay\'s opening sentence has about 3 seconds to make them lean in. A weak opening doesn\'t kill an essay, but a strong one buys you trust for the rest.',
      },
      { kind: 'heading', text: 'Hooks That Work' },
      {
        kind: 'list',
        items: [
          'Drop the reader into a specific moment: "I was halfway through dismantling the lawn mower when my mother screamed."',
          'A single concrete observation: "The cardamom pods were still warm."',
          'A surprising claim: "I have never been able to say the word \'beautiful\' out loud."',
          'A question you actually struggle with (not rhetorical): "Why is it always the same dream?"',
        ],
      },
      { kind: 'heading', text: 'Hooks That Don\'t' },
      {
        kind: 'list',
        items: [
          'Quote openers ("As Mahatma Gandhi once said…") — readers groan',
          'Dictionary definitions ("Webster\'s defines courage as…")',
          'Generalizations ("Throughout history, humans have…")',
          'Birth stories ("From the moment I was born…")',
          'Setup-heavy ("It was a typical Tuesday in October when…")',
        ],
      },
      {
        kind: 'callout',
        title: 'Specificity Beats Cleverness',
        text: 'A specific concrete detail beats a clever turn of phrase. "The lemon-yellow walls of the dental office" lands harder than "I\'ve always been told I\'m an old soul." Trust the small, true thing.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'ps-5',
    title: 'Common Pitfalls to Avoid',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Most Common Mistakes' },
      { kind: 'heading', text: '1. The Highlight Reel' },
      {
        kind: 'paragraph',
        text: 'Listing your achievements in essay form. Your activity list already covers this. The essay should reveal something achievements don\'t — how you think, what you wonder about, what kind of person you are when no one\'s grading.',
      },
      { kind: 'heading', text: '2. The Trauma Performance' },
      {
        kind: 'paragraph',
        text: 'Writing about a hardship in a way that focuses on the hardship rather than what you did with it. Hardship essays can work — but only when the focus is your specific response, not the hardship itself. If you\'re writing about a hard thing, ask: "What would this essay look like if I subtracted half the suffering and added more reflection?"',
      },
      { kind: 'heading', text: '3. The Saviour Trip' },
      {
        kind: 'paragraph',
        text: 'Going on a service trip and writing about how you "found yourself" or "realized how lucky we are." Admissions officers read thousands of these. Unless your story is genuinely about a sustained relationship and your own complications, skip it.',
      },
      { kind: 'heading', text: '4. The Generic Voice' },
      {
        kind: 'paragraph',
        text: 'Writing in language that could be from anyone. The essay should sound like you, specifically. If you swap the names and dates, would a stranger know who wrote it? If not, you\'re generic.',
      },
      { kind: 'heading', text: '5. Trying to Cover Too Much' },
      {
        kind: 'paragraph',
        text: '650 words is short. Trying to cover three major life events guarantees shallow treatment of all three. Pick ONE story, develop it deeply.',
      },
      {
        kind: 'callout',
        title: 'The "So What?" Test',
        text: 'After every paragraph, ask: "So what?" If the answer isn\'t clear — what this reveals about you, what changed, what you took from it — cut or expand until it is.',
        variant: 'warning',
      },
    ],
  },

  {
    id: 'su-1',
    title: '"Why This College" Essays',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Most Important Supplement' },
      {
        kind: 'paragraph',
        text: '"Why us?" essays are the most common supplement. They\'re also where most students lose points. Generic answers ("great academics, beautiful campus, friendly community") signal you didn\'t research the school. Specific answers signal real interest — and specificity is unfakeable.',
      },
      { kind: 'heading', text: 'The Formula: Specifics That Map to You' },
      {
        kind: 'list',
        items: [
          'Name 2-3 specific courses you want to take (with the professor names)',
          'Reference at least one research lab, program, or initiative by name',
          'Name a specific tradition, club, or community you\'d join',
          'Tie each specific to YOUR existing interests / experiences',
          'Avoid: vague platitudes ("I want to grow," "diverse community," "world-class faculty")',
        ],
      },
      { kind: 'heading', text: 'Where to Find Specifics' },
      {
        kind: 'list',
        items: [
          'Course catalog — read the actual courses in your intended major',
          'Faculty pages — find research that interests you, by name',
          'Student newspaper — surfaces real campus issues and culture',
          'Reddit r/[school] — student perspectives unvarnished',
          'YouTube tours by current students — find non-marketing content',
        ],
      },
      { kind: 'heading', text: 'Don\'t Just Name-Drop' },
      {
        kind: 'paragraph',
        text: 'Mentioning Professor Smith\'s lab is empty unless you explain why it matters to you. "Professor Smith\'s work on bird navigation parallels the question I\'ve been chasing since I tried to track migrating geese with a wildlife camera in 9th grade." That\'s the connective tissue.',
      },
      {
        kind: 'callout',
        title: 'The "Could This Be About Any School?" Test',
        text: 'After drafting, find every specific name you wrote. Replace each with [School Name]. If the essay still makes sense, it\'s too generic — it could be about any school. Specificity is the whole point.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'su-2',
    title: '"Why This Major" Essays',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Tell a Story, Not a Career Plan' },
      {
        kind: 'paragraph',
        text: 'Many students approach "Why this major" as a career plan: "I want to be a doctor because I want to help people." This is what every applicant writes. Strong "Why this major" essays tell a story of intellectual or personal pull — what specifically about the discipline obsesses you.',
      },
      { kind: 'heading', text: 'What Strong Essays Show' },
      {
        kind: 'list',
        items: [
          'A specific question or problem in the field that won\'t leave you alone',
          'A moment when the discipline first hooked you (specific, not "since I was a kid")',
          'Evidence of engagement beyond class — projects, reading, conversations',
          'Awareness that the major is a means, not an end (you\'re not "becoming an X" — you\'re "studying X to do Y")',
        ],
      },
      { kind: 'heading', text: 'For Specific Majors' },
      {
        kind: 'list',
        items: [
          'CS — show actual code/projects, not "I\'ve always loved technology"',
          'Engineering — describe a specific thing you wanted to build/understand',
          'Pre-med / Bio — go past "helping people"; what specifically about biology, the body, disease?',
          'Humanities — what writers/thinkers/works do you actually engage with?',
          'Undecided — that\'s fine; describe how you reached "undecided" and what you\'re drawn to',
        ],
      },
      {
        kind: 'callout',
        title: 'For "Undecided" Applicants',
        text: 'Undecided is honest and increasingly accepted. The essay should still show intellectual curiosity — what interests you across multiple fields, what kinds of questions move you, why college specifically helps you figure it out.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'su-3',
    title: 'Diversity / Community / Identity Essays',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Multiple Forms of "Diversity"' },
      {
        kind: 'paragraph',
        text: 'Many supplements ask about diversity, community, or identity. The questions vary — "how would you contribute to our community?", "tell us about an aspect of your identity," "describe a community you belong to." All are looking for the same thing: who you are beyond grades and what you bring that others don\'t.',
      },
      { kind: 'heading', text: 'Identity Is Not Just Race or Background' },
      {
        kind: 'list',
        items: [
          'Cultural / ethnic identity is one valid angle — but only if you have something specific to say',
          'Niche communities count — the chess club, the open-source project you contribute to',
          'Family role — eldest sibling who translates for parents, child of immigrants navigating two contexts',
          'Geographic — growing up rural, navigating different cultures, the specifics of your hometown',
          'Identity through interest — being the only [thing] in your community, finding people online who share it',
        ],
      },
      { kind: 'heading', text: 'What Strong Essays Avoid' },
      {
        kind: 'list',
        items: [
          'Generic claims about "diversity of thought" — show, don\'t claim',
          'Listing multiple identities without depth on any',
          'Performing struggle for the essay (admissions readers detect this)',
          'Speaking for a whole group — speak for yourself within it',
        ],
      },
      {
        kind: 'callout',
        title: 'You Don\'t Have to Pick a Heavy Identity',
        text: 'If your "diversity" angle is being a deeply specific kind of nerd, or growing up in a particular town, or having a complicated relationship with your school — those are legitimate community essays. The specificity is the point.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'su-4',
    title: 'Short-Take Supplements (250 Words or Less)',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Hardest Essays to Write' },
      {
        kind: 'paragraph',
        text: 'Short supplements (50-250 words) are deceptively hard. You don\'t have room for setup, three paragraphs of context, and a graceful close. Every word does work. The trick is to have ONE crisp idea and execute it ruthlessly.',
      },
      { kind: 'heading', text: 'The Approach' },
      {
        kind: 'list',
        items: [
          'Identify the ONE thing you want the reader to know after reading it',
          'Cut the lead-up — start mid-thought',
          'Use sensory or concrete language; abstractions waste words',
          'No throat-clearing ("I\'ve always been interested in…") — start with content',
          'No conclusion essay-summary — end on the strongest sentence',
        ],
      },
      { kind: 'heading', text: 'Common Short Prompts' },
      {
        kind: 'list',
        items: [
          '"What is your favorite book?" — pick a specific moment in the book that stuck with you',
          '"What you\'re looking forward to" — name one specific class, club, or experience',
          '"Describe yourself in 3 words" — pick words that surprise; "ambitious, hardworking, kind" is forgettable',
          '"What you do for fun" — be specific and unguarded ("I read epidemiology papers for fun") beats generic ("I like to read")',
          '"What\'s a recent project?" — describe the SPECIFIC thing, not "various projects"',
        ],
      },
      {
        kind: 'callout',
        title: 'The Word Count IS the Point',
        text: 'Short essays test your ability to choose. A 100-word essay with 99 words of substance and 1 of filler beats a 100-word essay with 80 substance / 20 filler. Cut everything that\'s not pulling its weight.',
        variant: 'tip',
      },
    ],
  },

  {
    id: 'pf-1',
    title: 'Drafting Timeline — When to Start What',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Realistic Schedule' },
      {
        kind: 'paragraph',
        text: 'Strong essays take time. Not because the writing itself takes long, but because the drafting / sitting / revising rhythm is what produces good work. Starting early gives you the room to fail, set aside, and come back. Last-minute essays show.',
      },
      { kind: 'heading', text: 'Junior Spring (April-May)' },
      {
        kind: 'list',
        items: [
          'Brainstorm personal statement topics (the 60-minute exercise)',
          'Read sample essays — but don\'t copy structure',
          'Don\'t draft yet; let topics percolate',
        ],
      },
      { kind: 'heading', text: 'Summer Before Senior Year' },
      {
        kind: 'list',
        items: [
          'June: pick your personal statement topic, write your first full draft',
          'July: get feedback, draft 2',
          'August: research target schools, list every required supplement',
          'August: draft your "Why us" essays for ED/EA targets first (Nov 1 deadlines)',
        ],
      },
      { kind: 'heading', text: 'Senior Fall' },
      {
        kind: 'list',
        items: [
          'September: finalize personal statement, focus on supplements for early-deadline schools',
          'October: cycle through supplements; budget 6-8 hours per "Why us" essay',
          'November: ED/EA submissions; pivot to RD supplements',
          'December: RD supplements (most due Jan 1)',
        ],
      },
      {
        kind: 'callout',
        title: 'Don\'t Draft 12 Schools at Once',
        text: 'Work on supplements for 2-3 schools at a time, not all 12. The fatigue from supplement-writing is real, and quality drops fast when you batch too aggressively.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'pf-2',
    title: 'Who Should Read Your Essays',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Right Readers' },
      {
        kind: 'paragraph',
        text: 'A small number of thoughtful readers is far better than many. Too many readers means contradictory feedback and an essay that loses your voice. Aim for 2-4 trusted readers, no more.',
      },
      { kind: 'heading', text: 'Good Readers' },
      {
        kind: 'list',
        items: [
          'An English teacher who knows your writing — they can tell what\'s genuine YOU vs. forced',
          'A counselor or college advisor who has read many essays',
          'One friend or sibling whose taste you trust — they\'ll tell you if it\'s boring',
          'A parent — but only if they\'re honest, not just supportive',
        ],
      },
      { kind: 'heading', text: 'Bad Readers' },
      {
        kind: 'list',
        items: [
          '8 different readers giving 8 different opinions',
          'Family members who are too close to the events you\'re writing about',
          'Anyone who\'ll rewrite it in their voice (parents are common offenders)',
          'Online forums where strangers compete for the most ruthless critique',
        ],
      },
      { kind: 'heading', text: 'How to Take Feedback' },
      {
        kind: 'list',
        items: [
          'Listen for what readers don\'t understand — that\'s ALWAYS your problem to fix',
          'Ignore "make it sound more impressive" — that\'s the wrong direction',
          'When two readers disagree, you decide — your essay, your call',
          'Take 24 hours before incorporating big rewrites; emotion clouds judgment',
        ],
      },
      {
        kind: 'callout',
        title: 'The Voice Test',
        text: 'After incorporating feedback, read the essay aloud. Does it still sound like you? If a reader changed your voice into theirs, undo that change. Authenticity beats polish.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'pf-3',
    title: 'Revising vs. Polishing',
    type: 'article',
    body: [
      { kind: 'heading', text: 'They\'re Different Activities' },
      {
        kind: 'paragraph',
        text: 'Revising means changing what the essay is about, what it argues, what story it tells. Polishing means tightening sentences, fixing word choice, smoothing transitions. Most students confuse the two — they polish a draft that needs revising, and end up with a beautifully-written essay about the wrong thing.',
      },
      { kind: 'heading', text: 'When to Revise (Big Changes)' },
      {
        kind: 'list',
        items: [
          'When readers don\'t understand what the essay is about',
          'When the "so what?" of the essay isn\'t clear',
          'When you\'re bored reading your own draft',
          'When the opening drags or the closing fizzles',
          'When the essay sounds like everyone else\'s',
        ],
      },
      { kind: 'heading', text: 'When to Polish (Small Changes)' },
      {
        kind: 'list',
        items: [
          'When the structure is right and the story lands',
          'When sentences are clear but a few are clunky',
          'After at least 2-3 rounds of revision',
          'In the final 1-2 weeks before submission',
        ],
      },
      { kind: 'heading', text: 'Order Matters' },
      {
        kind: 'paragraph',
        text: 'Revise first, polish last. Polishing a draft you\'ll later restructure is wasted work. After each major revision, set the essay aside for 2-3 days, then re-read with fresh eyes. Most "I\'m done" feelings are premature — sleep on it.',
      },
      {
        kind: 'callout',
        title: 'The Read-Aloud Test',
        text: 'Read your essay aloud, slowly. Where you stumble, the writing is unclear. Where you get bored, the reader will too. Where you feel a small thrill — that\'s the strongest part of the essay. Build around it.',
        variant: 'tip',
      },
    ],
  },
]

export const ESSAYS_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  ESSAYS_CONTENT.map((c) => [c.id, c]),
)
