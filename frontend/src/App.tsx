import { NavLink, Route, Routes } from 'react-router'
import { GalleryPage } from './gallery/GalleryPage'
import { HistoryPage } from './history/HistoryPage'
import { HomePage } from './home/HomePage'
import { ImportPage } from './import/ImportPage'
import { useTheme } from './lib/theme'
import { SettingsPage } from './settings/SettingsPage'
import { TaskEditorPage } from './tasks/TaskEditorPage'
import { TasksPage } from './tasks/TasksPage'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-1 text-sm font-semibold ${isActive ? 'bg-label text-app' : 'text-label-2 hover:bg-fill'}`

export default function App() {
  // Keeps <html class="dark"> in sync (also when the OS switches while on "Automatic").
  useTheme()
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pt-4 pb-24">
      <header className="mb-4 space-y-2">
        <div className="flex items-center">
          <h1 className="mr-auto text-xl font-black tracking-tight">Self-Gotchi</h1>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/tasks" className={navClass}>
            Habits
          </NavLink>
          <NavLink to="/history" className={navClass}>
            History
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            Settings
          </NavLink>
          {import.meta.env.DEV && (
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/new" element={<TaskEditorPage />} />
          <Route path="/tasks/:id" element={<TaskEditorPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
