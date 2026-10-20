import { useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { useAvatar, useAvatarDraftAction, useUploadAvatarPhoto } from '../api/hooks'
import type { AvatarDraft } from '../api/types'
import { shrinkPhoto } from '../lib/photo'
import { RowIcon } from '../ui/FormRows'
import { Group } from '../ui/ListSection'
import { rowBodyClass } from '../ui/listStyles'
import { ChevronRightIcon } from '../ui/Icons'

const rowButton = 'flex w-full items-stretch pl-4 text-left hover:bg-fill active:bg-fill disabled:opacity-40 disabled:hover:bg-transparent'

function errorText(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) return error.problem.errors?.map((e) => `${e.field} ${e.message}`).join('. ') ?? error.message
  return error instanceof Error ? error.message : String(error)
}

/**
 * Settings -> Character: update the avatar from a photo. The server draws one master image to
 * review first (a bad likeness costs one image), then every other pose and face on approval.
 */
export function CharacterGroup() {
  const { data: avatar } = useAvatar()
  const upload = useUploadAvatarPhoto()
  const action = useAvatarDraftAction()
  const input = useRef<HTMLInputElement>(null)
  const [readError, setReadError] = useState<string | null>(null)

  const draft = avatar?.draft ?? null
  const busy = upload.isPending || draft?.status === 'GENERATING'
  const error = readError ?? errorText(upload.error) ?? errorText(action.error)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setReadError(null)
    action.reset()
    try {
      upload.mutate(await shrinkPhoto(file))
    } catch (e) {
      setReadError(errorText(e))
    }
  }

  const footer = !avatar ? null : !avatar.available ? (
    'Drawing from a photo is off: start the server with OPENAI_API_KEY set.'
  ) : (
    <>
      {error && (
        <span className="mb-1 block text-danger" role="alert">
          {error}
        </span>
      )}
      Your photo is sent to OpenAI to draw the character and deleted from the server once it's done. You approve
      one drawing first; the other 27 poses and faces follow (roughly $1–2 in all).
    </>
  )

  return (
    <Group title="Character" footer={footer}>
      <li className="group">
        <button
          type="button"
          disabled={!avatar?.available || busy}
          onClick={() => input.current?.click()}
          className={rowButton}
        >
          <span className="flex items-center pr-3">
            <RowIcon emoji="📷" color="#5856d6" />
          </span>
          <span className={rowBodyClass}>
            <span className="flex-1 text-[17px]">{avatar?.active ? 'Update avatar from photo' : 'Make avatar from photo'}</span>
            {upload.isPending ? <span className="text-[15px] text-label-2">Uploading…</span> : <ChevronRightIcon size={16} className="text-label-3" />}
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = '' // picking the same file again still triggers a change
          }}
        />
      </li>
      {draft && <DraftRows draft={draft} pending={action.isPending} onAction={(a) => action.mutate(a)} />}
    </Group>
  )
}

function DraftRows({
  draft,
  pending,
  onAction,
}: {
  draft: AvatarDraft
  pending: boolean
  onAction: (action: 'approve' | 'retry' | 'discard') => void
}) {
  const drawingMaster = draft.status === 'GENERATING' && draft.step === 'MASTER'
  const drawingFrames = draft.status === 'GENERATING' && draft.step === 'FRAMES'

  return (
    <>
      <li className="group pl-4">
        <div className={`${rowBodyClass} flex-col !items-stretch gap-3`}>
          {drawingMaster && <Status text="Drawing your character from the photo… about a minute." />}
          {drawingFrames && (
            <div>
              <Status text={`Drawing poses and faces: ${draft.done} of ${draft.total}`} />
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-2" role="progressbar" aria-valuemin={0} aria-valuemax={draft.total} aria-valuenow={draft.done}>
                <div className="h-full rounded-full bg-tint transition-[width]" style={{ width: `${(draft.done / Math.max(1, draft.total)) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[13px] text-label-2">You can leave this screen; your current character stays until it's done.</p>
            </div>
          )}
          {draft.status === 'REVIEW' && <p className="text-[17px]">Does this look like you?</p>}
          {draft.status === 'FAILED' && (
            <p className="text-[15px] text-danger" role="alert">
              {draft.step === 'MASTER' ? "Couldn't draw the character" : `Stopped after ${draft.done} of ${draft.total}`}: {draft.error}
            </p>
          )}
          {draft.masterUrl && !drawingMaster && (
            <img
              src={draft.masterUrl}
              alt="The drawing of you to approve"
              className={`mx-auto rounded-xl bg-fill object-contain ${drawingFrames ? 'size-24' : 'size-48'}`}
            />
          )}
        </div>
      </li>
      {draft.status === 'REVIEW' && (
        <ActionRow label="Looks like me: draw the rest" tone="text-tint font-semibold" disabled={pending} onClick={() => onAction('approve')} />
      )}
      {(draft.status === 'REVIEW' || draft.status === 'FAILED') && (
        <ActionRow
          label={draft.status === 'REVIEW' ? 'Try again' : draft.step === 'MASTER' ? 'Try again' : 'Continue where it stopped'}
          tone="text-tint"
          disabled={pending}
          onClick={() => onAction('retry')}
        />
      )}
      <ActionRow label="Cancel" tone="text-danger" disabled={pending} onClick={() => onAction('discard')} />
    </>
  )
}

function Status({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-[17px]" aria-live="polite">
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-fill-2 border-t-tint" aria-hidden />
      {text}
    </p>
  )
}

function ActionRow({ label, tone, disabled, onClick }: { label: string; tone: string; disabled: boolean; onClick: () => void }) {
  return (
    <li className="group">
      <button type="button" disabled={disabled} onClick={onClick} className={rowButton}>
        <span className={`${rowBodyClass} text-[17px] ${tone}`}>{label}</span>
      </button>
    </li>
  )
}
