import { useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { useAvatar, useAvatarDraftAction, useDeleteAvatar, useSelectAvatar, useUploadAvatarPhoto } from '../api/hooks'
import type { AvatarChoice, AvatarDraft } from '../api/types'
import { generatedManifest } from '../character/photo/photoAvatar'
import { shrinkPhoto } from '../lib/photo'
import { RowIcon } from '../ui/FormRows'
import { Group } from '../ui/ListSection'
import { rowBodyClass } from '../ui/listStyles'
import { CheckIcon, ChevronRightIcon, MinusIcon } from '../ui/Icons'

const rowButton = 'flex w-full items-stretch pl-4 text-left hover:bg-fill active:bg-fill disabled:opacity-40 disabled:hover:bg-transparent'

function errorText(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) return error.problem.errors?.map((e) => `${e.field} ${e.message}`).join('. ') ?? error.message
  return error instanceof Error ? error.message : String(error)
}

/**
 * Settings -> Character: pick which avatar to show, and make a new one from a photo. The server draws one master image to
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
      {avatar && avatar.avatars.length > 0 && <AvatarPicker choices={avatar.avatars} />}
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

const madeOn = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Which character to show: the app's built-in art or one of the avatars made from photos
 * (newest first). The red ⊖ asks before deleting, like iOS lists in edit mode.
 */
function AvatarPicker({ choices }: { choices: AvatarChoice[] }) {
  const select = useSelectAvatar()
  const remove = useDeleteAvatar()
  const [confirming, setConfirming] = useState<number | null>(null)
  const builtInActive = !choices.some((c) => c.active)
  const builtInThumb = generatedManifest?.frames?.['NORMAL/NEUTRAL']
  const pending = select.isPending || remove.isPending
  const error = errorText(select.error) ?? errorText(remove.error)

  const pick = (id: number | null) => {
    setConfirming(null)
    select.mutate(id)
  }

  return (
    <>
      <PickerRow
        thumb={builtInThumb ? <Thumb src={builtInThumb} /> : <RowIcon emoji="🎨" color="#ff9500" />}
        label="Built-in drawing"
        active={builtInActive}
        disabled={pending}
        onPick={() => pick(null)}
      />
      {choices.map((choice) => (
        <PickerRow
          key={choice.id}
          thumb={choice.thumbnailUrl ? <Thumb src={choice.thumbnailUrl} /> : <RowIcon emoji="🙂" color="#5856d6" />}
          label={`From photo, ${madeOn(choice.createdAt)}`}
          active={choice.active}
          disabled={pending}
          onPick={() => pick(choice.id)}
          trailing={
            confirming === choice.id ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirming(null)
                  remove.mutate(choice.id)
                }}
                className="self-stretch bg-danger px-4 text-[15px] font-semibold text-white"
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Delete the avatar from ${madeOn(choice.createdAt)}`}
                disabled={pending}
                onClick={() => setConfirming(choice.id)}
                className="mx-3 grid size-[22px] shrink-0 place-items-center self-center rounded-full bg-danger text-white"
              >
                <MinusIcon size={12} strokeWidth={3.5} />
              </button>
            )
          }
        />
      ))}
      {error && (
        <li className="px-4 py-2 text-[15px] text-danger" role="alert">
          {error}
        </li>
      )}
    </>
  )
}

function Thumb({ src }: { src: string }) {
  return <img src={src} alt="" className="size-[44px] shrink-0 rounded-lg bg-fill object-contain" />
}

function PickerRow({
  thumb,
  label,
  active,
  disabled,
  onPick,
  trailing,
}: {
  thumb: React.ReactNode
  label: string
  active: boolean
  disabled: boolean
  onPick: () => void
  trailing?: React.ReactNode
}) {
  return (
    <li className="group flex items-stretch">
      <button
        type="button"
        role="radio"
        aria-checked={active}
        disabled={disabled}
        onClick={onPick}
        className="flex min-w-0 flex-1 items-stretch pl-4 text-left hover:bg-fill active:bg-fill"
      >
        <span className="flex items-center py-1.5 pr-3">{thumb}</span>
        <span className={rowBodyClass}>
          <span className="flex-1 truncate text-[17px]">{label}</span>
          {active && <CheckIcon size={20} strokeWidth={2.75} className="text-tint" />}
        </span>
      </button>
      {trailing && <span className="flex border-b border-sep group-last:border-b-0">{trailing}</span>}
    </li>
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
