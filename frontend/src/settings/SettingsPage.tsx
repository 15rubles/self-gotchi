import { useState } from 'react'
import { ApiError, logout } from '../api/client'
import { useMe, useUpdateMe, type MeInput } from '../api/hooks'
import type { Me } from '../api/types'
import { useTheme, type Theme } from '../lib/theme'
import { Group, PageTitle } from '../ui/ListSection'
import { rowBodyClass } from '../ui/listStyles'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
const ZONES: string[] = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [DEVICE_ZONE]
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/** iOS Settings-style screen: appearance (saved on this device), account (saved on the server), log out. */
export function SettingsPage() {
  const [theme, setTheme] = useTheme()
  const { data: me } = useMe()

  return (
    <div className="space-y-6">
      <PageTitle title="Settings" />

      <Group title="Appearance" footer="Automatic follows your device's light or dark setting. Saved on this device.">
        {THEMES.map((option) => (
          <li key={option.value} className="group">
            <button
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => setTheme(option.value)}
              className="flex w-full items-stretch pl-4 text-left hover:bg-fill active:bg-fill"
            >
              <span className={rowBodyClass}>
                <span className="flex-1 text-[17px]">{option.label}</span>
                {theme === option.value && (
                  <span className="text-lg font-semibold text-tint" aria-hidden>
                    ✓
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </Group>

      {me ? <AccountGroup me={me} /> : <Group title="Account">{<li className="px-4 py-3 text-label-2">Loading…</li>}</Group>}

      <Group title="Session">
        <li className="group">
          <button type="button" onClick={() => void logout()} className="flex w-full pl-4 text-left hover:bg-fill active:bg-fill">
            <span className={`${rowBodyClass} text-[17px] text-danger`}>Log out</span>
          </button>
        </li>
      </Group>
    </div>
  )
}

/** Name, time zone and day start. Each change saves right away; past days are re-sorted by the new settings. */
function AccountGroup({ me }: { me: Me }) {
  const update = useUpdateMe()
  const [name, setName] = useState(me.displayName)

  const save = (change: Partial<MeInput>) => {
    update.mutate({ displayName: me.displayName, timezone: me.timezone, dayResetHour: me.dayResetHour, ...change })
  }
  const saveName = () => {
    const trimmed = name.trim()
    if (trimmed === me.displayName) return
    if (!trimmed) {
      setName(me.displayName)
      return
    }
    save({ displayName: trimmed })
  }

  const zones = ZONES.includes(me.timezone) ? ZONES : [me.timezone, ...ZONES]
  const fieldErrors = update.error instanceof ApiError ? update.error.problem.errors : undefined
  const error = update.error ? (fieldErrors?.map((e) => e.message).join('. ') ?? update.error.message) : null

  const footer = error ? (
    <span className="text-danger" role="alert">
      Couldn't save: {error}
    </span>
  ) : update.isPending ? (
    'Saving…'
  ) : (
    'Deadlines use this time zone. A completion before the day-start hour counts for the day before (e.g. 01:30 with 04:00).'
  )

  return (
    <Group title="Account" footer={footer}>
      <Row label="Name" htmlFor="me-name">
        <input
          id="me-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-w-0 flex-1 bg-transparent text-right text-[17px] text-label-2 focus:text-label focus:outline-none"
        />
      </Row>
      <InfoRow label="Email" value={me.email} />
      <Row label="Time zone" htmlFor="me-zone">
        <select
          id="me-zone"
          value={me.timezone}
          onChange={(e) => save({ timezone: e.target.value })}
          className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent text-right text-[17px] text-label-2 focus:outline-none"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </Row>
      {me.timezone !== DEVICE_ZONE && ZONES.includes(DEVICE_ZONE) && (
        <li className="group">
          <button type="button" onClick={() => save({ timezone: DEVICE_ZONE })} className="flex w-full pl-4 text-left hover:bg-fill active:bg-fill">
            <span className={`${rowBodyClass} text-[17px] text-tint`}>Use this device's time zone ({DEVICE_ZONE.replaceAll('_', ' ')})</span>
          </button>
        </li>
      )}
      <Row label="New day starts at" htmlFor="me-reset">
        <select
          id="me-reset"
          value={me.dayResetHour}
          onChange={(e) => save({ dayResetHour: Number(e.target.value) })}
          className="cursor-pointer appearance-none bg-transparent text-right text-[17px] text-label-2 tabular-nums focus:outline-none"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
      </Row>
    </Group>
  )
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <li className="group flex items-stretch pl-4">
      <div className={rowBodyClass}>
        <label htmlFor={htmlFor} className="shrink-0 text-[17px]">
          {label}
        </label>
        <div className="flex min-w-0 flex-1 justify-end">{children}</div>
      </div>
    </li>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="group flex items-stretch pl-4">
      <div className={rowBodyClass}>
        <span className="text-[17px]">{label}</span>
        <span className="ml-auto truncate text-[17px] text-label-2">{value}</span>
      </div>
    </li>
  )
}
