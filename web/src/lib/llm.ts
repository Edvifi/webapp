/**
 * LLM client — abstracted provider interface
 *
 * Swap between Claude, GPT, or mock responses by changing the provider.
 * For now uses mock responses to prototype the chat UI without API keys.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMProvider {
  chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>
}

// ── Mock provider — simulates responses for prototyping ─────────────────────
const MOCK_DELAY = 800

const FAFSA_RESPONSES: Record<string, string> = {
  'default': "That's a great question! For the most accurate and up-to-date answer, I'd recommend checking studentaid.gov or speaking with your school's financial aid office. I can help you understand the general concepts though — what specifically would you like to know more about?",

  'what is fafsa': "The **FAFSA** (Free Application for Federal Student Aid) is a form you fill out to apply for federal financial aid for college. This includes:\n\n- **Pell Grants** — free money you don't repay\n- **Federal student loans** — lower interest rates than private loans\n- **Work-study** — part-time jobs for students with financial need\n\nMany states and colleges also use your FAFSA to award their own aid. Filing is **free** and opens every October 1st for the following school year.\n\n*Would you like to know about eligibility or what documents you'll need?*",

  'deadline': "FAFSA deadlines vary by type:\n\n- **Federal deadline**: June 30 of the school year (but file ASAP!)\n- **State deadlines**: Vary widely — some states are \"as soon as possible after Oct 1\"\n- **College deadlines**: Each school sets its own priority deadline\n\n⚠️ **Important**: Many state and institutional deadlines are much earlier than the federal one. Filing early = more aid available.\n\n*I'd recommend checking your specific state and school deadlines on studentaid.gov.*",

  'eligibility': "To be eligible for federal student aid, you generally need to:\n\n1. Be a U.S. citizen or eligible noncitizen\n2. Have a valid Social Security number\n3. Be enrolled or accepted in an eligible program\n4. Maintain satisfactory academic progress\n5. Not owe refunds on federal grants or be in default on federal loans\n6. Register with Selective Service (if required)\n\nMost students qualify for *some* form of aid. Even if you think your family earns too much, it's worth filing — you might qualify for unsubsidized loans or your school may use FAFSA data for merit aid.\n\n*Want to know about the Student Aid Index (SAI) and how your aid amount is calculated?*",

  'sai': "The **Student Aid Index (SAI)** replaced the old Expected Family Contribution (EFC) starting with the 2024-25 FAFSA. Here's how it works:\n\n- It's a number calculated from your FAFSA data (income, assets, family size)\n- **SAI can be negative** (down to -1,500), helping target more aid to the neediest students\n- Schools use it to determine your financial need: **Cost of Attendance - SAI = Financial Need**\n\nKey factors in the calculation:\n- Parent/student income and taxes paid\n- Assets (savings, investments — *not* your primary home or retirement)\n- Family size (based on tax dependents now)\n\n⚠️ *Note: The number of children in college no longer reduces your parent contribution under the new formula.*",

  'documents': "Here's what you'll need to complete the FAFSA:\n\n**For you (the student):**\n- Social Security number\n- Federal tax return (prior-prior year — e.g., 2024 taxes for 2026-27 FAFSA)\n- Records of untaxed income\n- Bank statements and investment records\n- FSA ID (create at studentaid.gov)\n\n**For your parent(s)** (if dependent):\n- Their Social Security numbers\n- Their federal tax return\n- Their asset information\n- Their own FSA ID\n\n💡 **Tip**: The IRS now transfers tax data directly to the FAFSA, so you won't need to manually enter most tax info.\n\n*Do you want help figuring out if you're considered a dependent or independent student?*",

  'dependent': "FAFSA dependency status is based on **specific legal criteria** — not whether your parents support you financially.\n\nYou're automatically **independent** if ANY of these apply:\n- You're 24 or older by Dec 31 of the school year\n- You're married\n- You're a graduate/professional student\n- You're a veteran or active duty military\n- You're an orphan, ward of the court, or in foster care\n- You're an emancipated minor\n- You're an unaccompanied homeless youth\n- You have legal dependents you support\n\nIf **none** of these apply, you're a **dependent student** and must report parent information — even if you live on your own and pay your own bills.\n\n⚠️ *\"My parents won't help me\" does NOT make you independent on the FAFSA. But you can contact your school's financial aid office for a dependency override in special circumstances.*",

  'css profile': "The **CSS Profile** and **FAFSA** are two different financial aid applications:\n\n| | FAFSA | CSS Profile |\n|---|---|---|\n| **Who requires it** | All schools for federal aid | ~200+ private colleges |\n| **Cost** | Free | $25 first school, $16 each additional |\n| **What it asks** | Income, basic assets | More detail: home equity, non-custodial parent, small businesses |\n| **Who provides aid** | Federal & state government | The institution itself |\n\n**Bottom line**: Always file the FAFSA. Check if your schools also require the CSS Profile — many private universities do.\n\n*Want to know which schools require the CSS Profile?*",

  'pell grant': "**Pell Grants** are free federal money for undergraduates with financial need:\n\n- **Maximum award (2025-26)**: ~$7,395 (adjusts annually)\n- **Who qualifies**: Based on your SAI, cost of attendance, and enrollment status\n- **Auto-max Pell**: Families at or below 175% of the federal poverty level\n- **Minimum Pell**: Families at or below 275% of poverty level may qualify\n- You can receive Pell for up to **12 semesters** (6 years of full-time)\n\n💡 Pell Grants don't need to be repaid — they're the foundation of federal student aid.\n\n*Note: Specific dollar amounts change annually. Check studentaid.gov for the most current figures.*",
}

function findMockResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('what is') && lower.includes('fafsa')) return FAFSA_RESPONSES['what is fafsa']
  if (lower.includes('deadline') || lower.includes('when')) return FAFSA_RESPONSES['deadline']
  if (lower.includes('eligible') || lower.includes('qualify')) return FAFSA_RESPONSES['eligibility']
  if (lower.includes('sai') || lower.includes('student aid index') || lower.includes('efc') || lower.includes('calculated')) return FAFSA_RESPONSES['sai']
  if (lower.includes('document') || lower.includes('need to') || lower.includes('prepare') || lower.includes('what do i need')) return FAFSA_RESPONSES['documents']
  if (lower.includes('dependent') || lower.includes('independent') || lower.includes('parent')) return FAFSA_RESPONSES['dependent']
  if (lower.includes('css') || lower.includes('profile')) return FAFSA_RESPONSES['css profile']
  if (lower.includes('pell') || lower.includes('grant') || lower.includes('free money')) return FAFSA_RESPONSES['pell grant']
  return FAFSA_RESPONSES['default']
}

export const mockProvider: LLMProvider = {
  async chat(messages) {
    await new Promise(r => setTimeout(r, MOCK_DELAY + Math.random() * 600))
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    return findMockResponse(lastUser?.content ?? '')
  },
}

// ── Active provider (swap this to switch LLMs) ──────────────────────────────
let activeProvider: LLMProvider = mockProvider

export function setProvider(provider: LLMProvider) {
  activeProvider = provider
}

export async function chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  return activeProvider.chat(messages, systemPrompt)
}
