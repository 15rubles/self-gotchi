import { NavLink, Route, Routes } from 'react-router'
import { logout } from './api/client'
import { GalleryPage } from './gallery/GalleryPage'
import { HomePage } from './home/HomePage'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-1 text-sm font-semibold ${isActive ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-amber-100'}`

export default function App() {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pt-4 pb-24">
      <header className="mb-4 flex items-center gap-2">
        <h1 className="mr-auto text-xl font-black tracking-tight">Self-Gotchi</h1>
        <nav className="flex gap-1">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          {import.meta.env.DEV && (
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
          )}
        </nav>
        <button type="button" onClick={() => void logout()} className="text-sm text-stone-500 hover:text-stone-800">
          Log out
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
