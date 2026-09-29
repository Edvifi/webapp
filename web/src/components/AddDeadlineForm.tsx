/**
 * AddDeadlineForm — a date the student sets themselves.
 *
 * Shared by the Overview rail and the calendar, which want the same three
 * fields and differ only in what the date starts as: the rail has no day in
 * mind, the calendar is already looking at one.
 */

import { useId, useState } from 'react'
import { DEADLINE_MODULES, type DeadlineModule } from '../data/applicationDeadlines'

interface Props {
  /** Prefilled day as `YYYY-MM-DD`; blank leaves the field empty. */
  initialDate?: string
  onAdd: (title: string, date: string, module: DeadlineModule) => void
  onCancel: () => void
}

export default function AddDeadlineForm({ initialDate = '', onAdd, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate)
  const [module, setModule] = useState<DeadlineModule>('Application Tracking')
  const id = useId()

  return (
    <form
      className="dl-add-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !date) return
        onAdd(title, date, module)
      }}
    >
      <label className="dl-add-label" htmlFor={`${id}-title`}>What is it?</label>
      <input
        id={`${id}-title`}
        className="dl-add-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ask Ms. Reyes for a reference"
        maxLength={120}
        autoFocus
      />
      <label className="dl-add-label" htmlFor={`${id}-date`}>When?</label>
      <input
        id={`${id}-date`}
        className="dl-add-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <label className="dl-add-label" htmlFor={`${id}-module`}>Where does it belong?</label>
      <select
        id={`${id}-module`}
        className="dl-add-input"
        value={module}
        onChange={(e) => setModule(e.target.value as DeadlineModule)}
      >
        {DEADLINE_MODULES.map((m) => (
          <option key={m} value={m}>{m === 'Custom' ? 'Custom — anything else' : m}</option>
        ))}
      </select>
      <div className="dl-add-actions">
        <button type="submit" className="dl-add-save" disabled={!title.trim() || !date}>
          Add it
        </button>
        <button type="button" className="dl-add-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
