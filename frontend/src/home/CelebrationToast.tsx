import { useEffect } from 'react'

/** Top-of-screen banner for a perfect day, a new room reward or a streak milestone. */
export function CelebrationToast({ messages, onClose, timeoutMs = 5000 }: { messages: string[]; onClose: () => void; timeoutMs?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [messages, onClose, timeoutMs])

  return (
    <div
      role="status"
      className="sg-toast-in fixed inset-x-0 top-4 z-30 mx-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card px-4 py-3 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
    >
      <ul className="space-y-1">
        {messages.map((message) => (
          <li key={message} className="text-[17px] font-semibold">
            {message}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="absolute top-2 right-3 text-lg text-label-3" aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
