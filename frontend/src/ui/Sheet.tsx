import { useEffect, useRef, type ReactNode } from 'react'

/**
 * iOS-style bottom sheet on the native <dialog> (modal: Esc closes, focus stays inside,
 * the page behind is inert). Tapping the dimmed backdrop closes it too.
 */
export function Sheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="fixed inset-x-0 top-auto bottom-0 mx-auto mb-0 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-app p-0 text-label backdrop:bg-black/40"
    >
      <div className="space-y-5 px-4 pt-2 pb-8">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-fill-2" aria-hidden />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="truncate text-xl font-bold">
              {title}
            </h2>
            {subtitle && <p className="text-[15px] text-label-2">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-[17px] font-semibold text-tint">
            Done
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
