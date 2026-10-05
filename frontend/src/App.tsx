import { Route, Routes } from 'react-router'

function Home() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Self-Gotchi</h1>
      <p className="mt-2 text-stone-600">Scaffold is running. The character arrives in milestone 5.</p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
