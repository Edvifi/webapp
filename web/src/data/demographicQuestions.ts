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
          'Under $30,000',
          '$30,000 – $60,000',
          '$60,000 – $100,000',
          '$100,000 – $150,000',
          '$150,000+',
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
