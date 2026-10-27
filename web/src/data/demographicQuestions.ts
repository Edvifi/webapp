export interface DemoField {
  key: string
  label: string
  type: 'text' | 'select' | 'yesno'
  required: boolean
  placeholder?: string
  options?: string[]
  /**
   * Why we are asking. Shown under the field.
   *
   * Every field that is not self-evidently needed to run the app carries one.
   * A student handing over their income, their GPA or their race deserves to
   * read what it is for before they answer, not after — and a field we cannot
   * write an honest reason for is a field we should not be asking.
   */
  why?: string
  /** Phone keyboard for a text field: digits for ZIP, a decimal point for GPA. */
  inputMode?: 'numeric' | 'decimal'
  maxLength?: number
  /** A problem with a non-empty answer, or null when it is fine. Shared by
   *  onboarding and the Profile page so neither accepts what the other refuses. */
  validate?: (value: string) => string | null
}

export interface DemoStep {
  title: string
  subtitle: string
  fields: DemoField[]
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: 'About You',
    subtitle: "Let's get to know you a little.",
    fields: [
      {
        key: 'first_name',
        label: 'First name',
        type: 'text',
        required: true,
        placeholder: 'Your first name',
      },
      {
        key: 'age',
        label: 'Age',
        type: 'select',
        required: true,
        options: ['13', '14', '15', '16', '17', '18', '19+'],
      },
      {
        key: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        why: 'Some scholarships are open only to certain applicants.',
      },
    ],
  },
  {
    title: 'Background',
    subtitle: 'This helps us personalize your experience.',
    fields: [
      {
        key: 'nationality',
        label: 'Nationality',
        type: 'text',
        required: false,
        placeholder: 'e.g. American, Indian, Nigerian',
        why: 'Citizenship decides FAFSA eligibility and some scholarships.',
      },
      {
        key: 'race',
        label: 'Race',
        type: 'select',
        required: false,
        why: 'Many scholarships are restricted to specific backgrounds.',
        options: [
          'White',
          'Black or African American',
          'Asian',
          'Native Hawaiian or Pacific Islander',
          'Two or more races',
          'Prefer not to say',
        ],
      },
      {
        key: 'hispanic',
        label: 'Are you Hispanic or Latino?',
        type: 'yesno',
        required: false,
        why: 'Asked separately because federal forms treat it separately.',
      },
      {
        key: 'native_american',
        label: 'Are you Native American or Alaska Native?',
        type: 'yesno',
        required: false,
        why: 'Tribal affiliation opens specific aid, including tuition waivers.',
      },
      {
        key: 'religion',
        label: 'Religion',
        type: 'select',
        required: false,
        why: 'Faith-based organisations fund a large share of local scholarships.',
        options: [
          'Christianity',
          'Islam',
          'Judaism',
          'Hinduism',
          'Buddhism',
          'Sikhism',
          'None / Not religious',
          'Other',
          'Prefer not to say',
        ],
      },
    ],
  },
  {
    title: 'School & Location',
    subtitle: 'Where are you based?',
    fields: [
      {
        key: 'zipcode',
        label: 'Zip code',
        type: 'text',
        required: true,
        why: 'Finds colleges near you and scholarships limited to your area.',
        placeholder: 'e.g. 10001',
        inputMode: 'numeric',
        maxLength: 10,
        validate: (v) => /^\d{5}(-\d{4})?$/.test(v) ? null : 'Enter a 5-digit zip code.',
      },
      {
        key: 'school',
        label: 'School name',
        type: 'text',
        required: true,
        why: 'Local and school-specific scholarships are some of the easiest to win.',
        placeholder: 'Your high school',
      },
      {
        key: 'gpa',
        label: 'GPA (unweighted)',
        type: 'text',
        required: false,
        why: 'Used to match scholarships and to judge your fit for each college.',
        placeholder: 'e.g. 3.7 — used to match scholarships',
        inputMode: 'decimal',
        maxLength: 4,
        // Up to 4.3 for schools that count an A+; anything higher is a
        // weighted GPA, which matching reads as a near-perfect record.
        validate: (v) => {
          const n = Number(v)
          return /^\d(\.\d{1,2})?$/.test(v) && n <= 4.3 ? null : 'Enter your unweighted GPA, from 0 to 4.0 (e.g. 3.7).'
        },
      },
    ],
  },
  {
    title: 'Family',
    subtitle: 'A few questions about your household.',
    fields: [
      {
        key: 'income_level',
        label: 'Household income level',
        type: 'select',
        required: false,
        why: 'Drives aid estimates, fee waivers, and need-based scholarships.',
        options: [
          // College Scorecard's net-price brackets, so a school's price "for
          // you" comes from the student's real bracket, not a midpoint guess.
          'Under $30,000',
          '$30,000 – $48,000',
          '$48,000 – $75,000',
          '$75,000 – $110,000',
          '$110,000+',
          'Prefer not to say',
        ],
      },
      {
        key: 'parent_education',
        label: "Parent/guardian's highest education",
        type: 'select',
        required: false,
        why: 'First-generation students qualify for a whole category of aid.',
        options: [
          'No high school diploma',
          'High school diploma / GED',
          'Some college',
          "Associate's degree",
          "Bachelor's degree",
          "Master's degree or higher",
          'Prefer not to say',
        ],
      },
      {
        key: 'parent_immigrants',
        label: 'Are your parents immigrants?',
        type: 'yesno',
        required: false,
        why: 'Some scholarships are for immigrant and first-generation families.',
      },
    ],
  },
]

/** Every field by its key, for screens that edit one answer at a time. */
export const DEMO_FIELDS: Record<string, DemoField> =
  Object.fromEntries(DEMO_STEPS.flatMap((s) => s.fields).map((f) => [f.key, f]))

/** Choices offered for a yes/no question. */
export const YES_NO_OPTIONS = ['Yes', 'No', 'Prefer not to say']

/** Why an answer can't be saved, or null. Empty is fine unless required. */
export function demoFieldError(field: DemoField, value: string): string | null {
  const v = value.trim()
  if (!v) return field.required ? `${field.label} is required.` : null
  return field.validate?.(v) ?? null
}
