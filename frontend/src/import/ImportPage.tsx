import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, apiFetch } from '../api/client'
import { DAY_CODES, type Category, type DayCode, type EffectKey, type ImportCandidate, type ImportPreview, type TaskInput } from '../api/types'
import { formatDate } from '../lib/dates'
import { EFFECTS } from '../lib/effects'
import { effectEmoji } from '../lib/format'
import { FormRow, InlineDate, InlineTime, RowIcon, ToggleSwitch } from '../ui/FormRows'
import { CheckIcon, ChevronLeftIcon } from '../ui/Icons'
import { Card, Group, PageTitle } from '../ui/ListSection'
import { inlineControl, LIST_COLORS } from '../ui/listStyles'

/** One proposed habit as the review screen edits it. */
interface Draft {
  uid: string
  include: boolean
  name: string
  repeats: boolean
  days: DayCode[]
  date: string
  deadline: string
  category: Category
  effectKey: EffectKey
  notes: string[]
  alreadyImported: boolean
  saved: boolean
  error?: string
}

const toDraft = (c: ImportCandidate): Draft => ({
  uid: c.uid,
  include: !c.alreadyImported,
  name: c.name,
  repeats: c.recurring,
  days: c.days.map((d) => d.slice(0, 3) as DayCode),
  date: c.date,
  deadline: c.deadline.slice(0, 5),
  category: 'MENTAL',
  effectKey: 'GENERIC',
  notes: c.notes,
  alreadyImported: c.alreadyImported,
  saved: false,
})

const toInput = (d: Draft): TaskInput => ({
  name: d.name.trim(),
  category: d.category,
  effectKey: d.effectKey,
  importUid: d.uid,
  schedule: d.repeats
    ? { type: 'CHECK', recurrence: 'DAILY', days: d.days, deadline: d.deadline }
    : { type: 'CHECK', recurrence: 'ONCE', date: d.date, deadline: d.deadline },
})

const problemText = (e: unknown) =>
  e instanceof ApiError ? (e.problem.errors?.map((f) => f.message).join('. ') ?? e.message) : e instanceof Error ? e.message : String(e)

/**
 * Calendar import: load an .ics link or file (Google, Outlook, Apple), review every proposed
 * habit (include, rename, repeat or one-time, days / date, time, effect), then create them.
 */
export function ImportPage() {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])

  const loaded = (p: ImportPreview) => {
    setPreview(p)
    setDrafts(p.events.map(toDraft))
  }

  return preview ? (
    <Review preview={preview} drafts={drafts} setDrafts={setDrafts} onBack={() => setPreview(null)} />
  ) : (
    <Source onLoaded={loaded} />
  )
}

// ---- step 1: where the calendar comes from ------------------------------------------------------

function Source({ onLoaded }: { onLoaded: (preview: ImportPreview) => void }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (request: () => Promise<ImportPreview>) => {
    setBusy(true)
    setError(null)
    try {
      onLoaded(await request())
    } catch (e) {
      setError(problemText(e))
    } finally {
      setBusy(false)
    }
  }

  const fromLink = (event: FormEvent) => {
    event.preventDefault()
    if (!url.trim()) return
    void load(() => apiFetch<ImportPreview>('import/ics-url', { method: 'POST', body: JSON.stringify({ url: url.trim() }) }))
  }

  const fromFile = (file: File | undefined) => {
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    void load(() => apiFetch<ImportPreview>('import/ics', { method: 'POST', body }))
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Import" />
      <p className="px-1 text-[15px] text-label-2">
        Turn calendar events into habits. You'll review everything before anything is added.
      </p>

      <form onSubmit={fromLink}>
        <Group
          title="Calendar link"
          footer={error ? <span className="font-semibold text-danger" role="alert">{error}</span> : 'A private or published calendar link (https:// or webcal://). See below where to find it.'}
        >
          <li className="flex items-center gap-2 px-4 py-2">
            <label htmlFor="ics-url" className="sr-only">
              Calendar link
            </label>
            <input
              id="ics-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/…/basic.ics"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[17px] placeholder:text-label-3 focus:outline-none"
            />
            <button type="submit" disabled={busy || !url.trim()} className="text-[17px] font-semibold text-tint disabled:text-label-3">
              {busy ? 'Loading…' : 'Load'}
            </button>
          </li>
        </Group>
      </form>

      <Group title="Or a file" footer="An exported .ics file, up to 5 MB.">
        <li className="px-4 py-2.5">
          <label className="flex cursor-pointer items-center justify-between text-[17px] text-tint">
            {busy ? 'Loading…' : 'Choose .ics file…'}
            <input type="file" accept=".ics,text/calendar" disabled={busy} onChange={(e) => fromFile(e.target.files?.[0])} className="sr-only" />
          </label>
        </li>
      </Group>

      <Group title="Where to find it">
        <Help emoji="🟦" color={LIST_COLORS.blue.ring} title="Google Calendar">
          On calendar.google.com: ⚙ Settings → pick the calendar under "Settings for my calendars" → <b>Integrate calendar</b> → copy
          the <b>Secret address in iCal format</b>. Or Settings → Import &amp; export → <b>Export</b> for a file (unzip it first).
        </Help>
        <Help emoji="📧" color={LIST_COLORS.blue.ring} title="Outlook">
          On outlook.com / Outlook on the web: ⚙ Settings → Calendar → <b>Shared calendars</b> → <b>Publish a calendar</b> → choose
          the calendar and "Can view all details" → Publish → copy the <b>ICS</b> link.
        </Help>
        <Help emoji="🍎" color={LIST_COLORS.gray.ring} title="Apple Calendar">
          On a Mac: Calendar → select the calendar → File → Export → <b>Export…</b> for a file. Or share it as a <b>Public Calendar</b>{' '}
          (iPhone: Calendar → Calendars → ⓘ next to it) and copy the webcal:// link.
        </Help>
      </Group>
      <p className="px-4 text-[13px] text-label-2">
        Published links can be opened by anyone who has them. The app reads the calendar once per import and keeps only the habits you
        choose.
      </p>
    </div>
  )
}

function Help({ emoji, color, title, children }: { emoji: string; color: string; title: string; children: React.ReactNode }) {
  return (
    <li className="group">
      <details className="px-4 py-2.5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 text-[17px]">
          <RowIcon emoji={emoji} color={`${color}33`} />
          {title}
        </summary>
        <p className="mt-2 pl-[41px] text-[15px] leading-snug text-label-2">{children}</p>
      </details>
    </li>
  )
}

// ---- step 2: review and import ------------------------------------------------------------------

function Review({
  preview,
  drafts,
  setDrafts,
  onBack,
}: {
  preview: ImportPreview
  drafts: Draft[]
  setDrafts: (d: Draft[]) => void
  onBack: () => void
}) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [importing, setImporting] = useState(false)

  const patch = (uid: string, change: Partial<Draft>) => setDrafts(drafts.map((d) => (d.uid === uid ? { ...d, ...change, error: undefined } : d)))
  const chosen = drafts.filter((d) => d.include && !d.saved)
  const setAll = (include: boolean) => setDrafts(drafts.map((d) => (d.saved ? d : { ...d, include })))

  const runImport = async () => {
    setImporting(true)
    let next = drafts
    for (const draft of chosen) {
      try {
        if (!draft.name.trim()) throw new Error('Give it a name')
        await apiFetch('tasks', { method: 'POST', body: JSON.stringify(toInput(draft)) })
        next = next.map((d) => (d.uid === draft.uid ? { ...d, saved: true } : d))
      } catch (e) {
        next = next.map((d) => (d.uid === draft.uid ? { ...d, error: problemText(e) } : d))
      }
      setDrafts(next)
    }
    setImporting(false)
    await Promise.all(['tasks', 'state', 'history'].map((key) => client.invalidateQueries({ queryKey: [key] })))
    if (next.every((d) => !d.include || d.saved)) navigate('/tasks')
  }

  const skipped = [
    preview.skippedPast && `${preview.skippedPast} past or far ahead`,
    preview.skippedCancelled && `${preview.skippedCancelled} cancelled`,
    preview.skippedEnded && `${preview.skippedEnded} ended series`,
  ].filter(Boolean)
  const repeating = drafts.filter((d) => d.repeats)
  const once = drafts.filter((d) => !d.repeats)

  return (
    <div className="space-y-6 pb-20">
      <div className="sticky top-0 z-10 -mx-4 flex items-center bg-app/90 px-4 py-2 backdrop-blur">
        <button type="button" onClick={onBack} className="flex items-center text-[17px] text-tint">
          <ChevronLeftIcon size={20} /> Back
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold">Review</h2>
        <span className="w-16" />
      </div>

      <p className="px-1 text-[15px] text-label-2">
        {drafts.length === 0 ? 'No upcoming events found.' : `${drafts.length} event${drafts.length === 1 ? '' : 's'} found.`}
        {skipped.length > 0 && ` Skipped ${skipped.join(', ')}.`} Every event becomes a checkmark habit; adjust anything below.
      </p>

      {drafts.length > 0 && (
        <div className="flex gap-4 px-1 text-[15px]">
          <button type="button" onClick={() => setAll(true)} className="text-tint">
            Select all
          </button>
          <button type="button" onClick={() => setAll(false)} className="text-tint">
            Select none
          </button>
        </div>
      )}

      {repeating.length > 0 && <DraftList title="Repeating" drafts={repeating} patch={patch} />}
      {once.length > 0 && <DraftList title="One-time" drafts={once} patch={patch} />}

      {drafts.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 mx-auto w-[calc(100%-2rem)] max-w-md">
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={importing || chosen.length === 0}
            className="w-full rounded-xl bg-tint py-3 text-[17px] font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {importing ? 'Importing…' : chosen.length === 0 ? 'Nothing selected' : `Import ${chosen.length} habit${chosen.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}

function DraftList({ title, drafts, patch }: { title: string; drafts: Draft[]; patch: (uid: string, change: Partial<Draft>) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-xl font-bold" style={{ color: title === 'Repeating' ? LIST_COLORS.blue.text : LIST_COLORS.orange.text }}>
        {title}
      </h2>
      {drafts.map((d) => (
        <DraftCard key={d.uid} draft={d} patch={(change) => patch(d.uid, change)} />
      ))}
    </section>
  )
}

/** One event: tick to include, then the same rows as the habit editor. */
function DraftCard({ draft: d, patch }: { draft: Draft; patch: (change: Partial<Draft>) => void }) {
  const id = (field: string) => `${field}-${d.uid}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const locked = d.saved
  const toggleDay = (day: DayCode) => patch({ days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day] })

  return (
    <div className={d.include || d.saved ? '' : 'opacity-60'}>
      <Card as="ul">
        <li className="group flex items-center gap-3 border-b border-sep py-2 pr-3 pl-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={d.include || d.saved}
            aria-label={`Import ${d.name || 'this event'}`}
            disabled={locked}
            onClick={() => patch({ include: !d.include })}
            className={`grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] ${d.include || d.saved ? 'border-tint bg-tint text-white' : 'border-[var(--ring-empty)]'}`}
          >
            {(d.include || d.saved) && <CheckIcon size={13} strokeWidth={3} />}
          </button>
          <label htmlFor={id('name')} className="sr-only">
            Name
          </label>
          <input
            id={id('name')}
            value={d.name}
            disabled={locked}
            maxLength={100}
            onChange={(e) => patch({ name: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold focus:outline-none"
          />
          {d.saved && <span className="text-[13px] font-semibold text-[#34c759]">Imported</span>}
          {!d.saved && d.alreadyImported && <span className="text-[13px] text-label-2">Already imported</span>}
        </li>
        {d.include && !d.saved && (
          <>
            <FormRow icon={<RowIcon emoji="🔁" color="#ff3b30" />} label="Repeats" htmlFor={id('repeats')}>
              <ToggleSwitch id={id('repeats')} checked={d.repeats} onChange={(repeats) => patch({ repeats })} />
            </FormRow>
            {d.repeats ? (
              <li className="flex justify-between gap-1 px-4 py-2.5" role="group" aria-label="Days (none = every day)">
                {DAY_CODES.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={d.days.includes(day)}
                    aria-label={day}
                    onClick={() => toggleDay(day)}
                    className={`grid size-9 place-items-center rounded-full text-[13px] font-semibold ${d.days.includes(day) ? 'bg-tint text-white' : 'bg-fill text-label-2'}`}
                  >
                    {day[0] + day.slice(1, 2).toLowerCase()}
                  </button>
                ))}
              </li>
            ) : (
              <FormRow icon={<RowIcon emoji="📅" color="#ff3b30" />} label="Date" htmlFor={id('date')}>
                <InlineDate id={id('date')} value={d.date} onChange={(date) => patch({ date })} />
              </FormRow>
            )}
            <FormRow icon={<RowIcon emoji="⏰" color="#007aff" />} label="Due by" htmlFor={id('time')}>
              <InlineTime id={id('time')} value={d.deadline} onChange={(deadline) => patch({ deadline })} />
            </FormRow>
            <FormRow icon={<RowIcon emoji={effectEmoji[d.effectKey]} color={`${LIST_COLORS.purple.ring}33`} />} label="Affects" htmlFor={id('effect')}>
              <select
                id={id('effect')}
                value={d.effectKey}
                onChange={(e) => {
                  const effect = EFFECTS.find((x) => x.key === e.target.value)!
                  patch({ effectKey: effect.key, category: effect.category })
                }}
                className={`${inlineControl} cursor-pointer`}
              >
                {EFFECTS.map((effect) => (
                  <option key={effect.key} value={effect.key}>
                    {effect.label}
                  </option>
                ))}
              </select>
            </FormRow>
          </>
        )}
      </Card>
      <div className="mt-1.5 space-y-0.5 px-4 text-[13px] text-label-2">
        {!d.repeats && d.include && !d.saved && <p>{formatDate(d.date)}</p>}
        {d.repeats && d.include && !d.saved && d.days.length === 0 && <p>Every day</p>}
        {d.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        {d.error && (
          <p className="font-semibold text-danger" role="alert">
            {d.error}
          </p>
        )}
      </div>
    </div>
  )
}
