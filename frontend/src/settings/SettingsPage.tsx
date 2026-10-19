import { logout } from '../api/client'
import { useMe } from '../api/hooks'
import { useTheme, type Theme } from '../lib/theme'
import { Group, PageTitle } from '../ui/ListSection'
import { rowBodyClass } from '../ui/listStyles'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** iOS Settings-style screen: appearance (saved on this device), account info, log out. */
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

      <Group title="Account" footer="Time zone and day start come from APP_USER_TIMEZONE and APP_DAY_RESET_HOUR on the server for now.">
        <InfoRow label="Name" value={me?.displayName} />
        <InfoRow label="Email" value={me?.email} />
        <InfoRow label="Time zone" value={me?.timezone} />
        <InfoRow label="New day starts at" value={me ? `${String(me.dayResetHour).padStart(2, '0')}:00` : undefined} />
      </Group>

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

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <li className="group flex items-stretch pl-4">
      <div className={rowBodyClass}>
        <span className="text-[17px]">{label}</span>
        <span className="ml-auto truncate text-[17px] text-label-2">{value ?? '…'}</span>
      </div>
    </li>
  )
}
