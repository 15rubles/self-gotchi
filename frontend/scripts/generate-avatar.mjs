#!/usr/bin/env node
// Generates photorealistic avatar variants of the user from one photo with an image model.
//
//   GEMINI_API_KEY=... npm run avatar:generate            # all missing images
//   npm run avatar:generate -- --only TIRED/WORRIED       # (re)generate one frame
//   npm run avatar:generate -- --force                    # regenerate everything
//   npm run avatar:generate -- --dry-run                  # no API calls: copies the photo, to test the app wiring
//
// Pipeline (DESIGN.md "Consistency strategy"): photo -> master (normal pose, neutral face) ->
// 3 more poses edited from the master -> each pose edited into the 5 other expressions.
// Every variant is derived from the master, never from scratch, so it stays the same person.
// Output (gitignored): src/local-avatar/generated/<POSE>_<FACE>.jpg + avatar.json.
//
// PRIVACY: this sends your photo to Google's Gemini API. Nothing is sent with --dry-run.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const avatarDir = path.resolve(here, '../src/local-avatar')
const outDir = path.join(avatarDir, 'generated')

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const DRY_RUN = flag('dry-run')
const FORCE = flag('force')
const ONLY = option('only')?.toUpperCase()
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image'
const API = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'
const KEY = process.env.GEMINI_API_KEY

const POSES = ['NORMAL', 'TIRED', 'EXHAUSTED', 'LAZY']
const FACES = ['NEUTRAL', 'HAPPY', 'WORRIED', 'VERY_WORRIED', 'TIRED', 'EXHAUSTED']

// ---- prompts -------------------------------------------------------------------------------

const STYLE =
  'Photorealistic photograph, natural soft daylight from a window, shot on a 35mm lens at eye level, ' +
  'realistic skin texture, no beauty filter, no text, no watermark, square 1:1 frame.'

const SCENE =
  'A cosy, tidy small apartment living room: light wall, a grey fabric couch, a window on the left, ' +
  'wooden floor. The camera is static and the room looks exactly the same in every shot.'

const MASTER_PROMPT =
  `Create a new photo of exactly this person (same face, facial structure, hair, skin tone, age, ` +
  `necklace and black t-shirt) standing relaxed in the middle of the room, facing the camera, ` +
  `framed from the knees up, head in the upper-middle third of the frame, calm neutral expression, ` +
  `mouth closed. ${SCENE} ${STYLE}`

const KEEP_HEAD =
  'Keep the camera, framing, room, lighting, clothes and the person identical to the reference photo. ' +
  "Keep the person's head at the same position and size in the frame as in the reference."

const POSE_PROMPTS = {
  TIRED:
    `Edit this photo: the same person now stands with low energy, shoulders drooping, arms hanging ` +
    `heavily, slightly hunched, as if after a long day without enough food. Neutral, calm face. ${KEEP_HEAD} ${STYLE}`,
  EXHAUSTED:
    `Edit this photo: the same person is now completely drained, sitting on the floor leaning back ` +
    `against the front of the couch, legs stretched out, arms limp at the sides, posture collapsed. ` +
    `Neutral face, still looking towards the camera. Same room, camera and lighting. ` +
    `Keep the head as close as possible to the same place in the frame. ${STYLE}`,
  LAZY:
    `Edit this photo: the same person is now slumped lazily deep in the grey couch, half lying, ` +
    `holding a phone loosely in one hand, unmotivated, wearing grey sweatpants. Neutral face, looking ` +
    `towards the camera. Same room, camera and lighting. Keep the head as close as possible to the ` +
    `same place in the frame. ${STYLE}`,
}

const KEEP_ALL =
  'Change ONLY the facial expression. Keep everything else pixel-identical: pose, body, hands, clothes, ' +
  'hair, room, framing, lighting and colors. Same person, same identity.'

const FACE_PROMPTS = {
  HAPPY: `Edit this photo: give the person a genuine, warm, happy smile reaching the eyes. ${KEEP_ALL} ${STYLE}`,
  WORRIED:
    `Edit this photo: give the person a worried expression: inner eyebrows raised and pulled together, ` +
    `slight frown, lips pressed. ${KEEP_ALL} ${STYLE}`,
  VERY_WORRIED:
    `Edit this photo: give the person a very anxious, stressed expression: wide eyes, strongly raised ` +
    `inner eyebrows, tense mouth, a light sheen of sweat on the forehead. ${KEEP_ALL} ${STYLE}`,
  TIRED:
    `Edit this photo: make the person look tired: heavy drooping eyelids, dark circles under the eyes, ` +
    `slightly dull skin, low-energy expression. ${KEEP_ALL} ${STYLE}`,
  EXHAUSTED:
    `Edit this photo: make the person look utterly exhausted: half-closed eyes, deep dark circles, pale ` +
    `skin, slack mouth slightly open, head heavy. ${KEEP_ALL} ${STYLE}`,
}

// ---- API -----------------------------------------------------------------------------------

function mimeOf(file) {
  const ext = path.extname(file).toLowerCase()
  return ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
}

/** Finds base64 image data anywhere in the response (tolerates either API response shape). */
function findImage(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'image' && typeof node.data === 'string') return node.data
  if (node.inlineData?.data && String(node.inlineData.mimeType ?? '').startsWith('image/')) return node.inlineData.data
  for (const value of Object.values(node)) {
    const found = findImage(value)
    if (found) return found
  }
  return null
}

function findText(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
  for (const value of Object.values(node)) findText(value, out)
  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** One image edit: prompt + reference images in, JPEG bytes out. Retries rate limits and 5xx. */
async function generate(prompt, references) {
  const body = {
    model: MODEL,
    input: [
      { type: 'text', text: prompt },
      ...references.map((file) => ({
        type: 'image',
        mime_type: mimeOf(file),
        data: fs.readFileSync(file).toString('base64'),
      })),
    ],
    response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1', image_size: '1K' },
  }
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    })
    const text = await response.text()
    // A daily quota (e.g. "limit: 0 requests per day" on the free tier) won't recover by waiting.
    const dailyQuota = response.status === 429 && /per day/i.test(text)
    if ((response.status === 429 || response.status >= 500) && !dailyQuota && attempt < 5) {
      const wait = 2000 * 2 ** attempt
      console.warn(`  HTTP ${response.status}, retrying in ${wait / 1000}s`)
      await sleep(wait)
      continue
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`)
    const json = JSON.parse(text)
    const data = findImage(json)
    if (!data) {
      throw new Error(`no image in response (status ${json.status ?? '?'}): ${findText(json).join(' ').slice(0, 300)}`)
    }
    if (json.usage) console.log(`  usage: ${JSON.stringify(json.usage)}`)
    return Buffer.from(data, 'base64')
  }
}

// ---- pipeline ------------------------------------------------------------------------------

const frameFile = (pose, face) => path.join(outDir, `${pose}_${face}.jpg`)
/** Frames made during this run, so --force regenerates each one once. */
const madeThisRun = new Set()

function findPhoto() {
  const name = fs.readdirSync(avatarDir).find((f) => /^photo\.(jpe?g|png|webp)$/i.test(f))
  if (!name) throw new Error(`put your photo at ${path.join(avatarDir, 'photo.jpg')}`)
  return path.join(avatarDir, name)
}

function wanted(pose, face) {
  if (ONLY && ONLY !== `${pose}/${face}`) return false
  return FORCE || Boolean(ONLY) || !fs.existsSync(frameFile(pose, face))
}

async function make(pose, face, prompt, references) {
  const file = frameFile(pose, face)
  console.log(`- ${pose}/${face}`)
  const bytes = DRY_RUN ? fs.readFileSync(references.at(-1)) : await generate(prompt, references)
  fs.writeFileSync(file, bytes)
}

/** Ensures a frame exists, generating it (and what it depends on) if needed. */
async function ensure(pose, face, photo) {
  const file = frameFile(pose, face)
  if (madeThisRun.has(file)) return file
  if (!wanted(pose, face) && fs.existsSync(file)) return file
  if (pose === 'NORMAL' && face === 'NEUTRAL') {
    await make(pose, face, MASTER_PROMPT, [photo])
  } else if (face === 'NEUTRAL') {
    const master = await ensure('NORMAL', 'NEUTRAL', photo)
    await make(pose, face, POSE_PROMPTS[pose], [master, photo])
  } else {
    const base = await ensure(pose, 'NEUTRAL', photo)
    await make(pose, face, FACE_PROMPTS[face], [base])
  }
  madeThisRun.add(file)
  return file
}

function writeManifest() {
  const frames = {}
  for (const pose of POSES) {
    for (const face of FACES) {
      if (fs.existsSync(frameFile(pose, face))) frames[`${pose}/${face}`] = `${pose}_${face}.jpg`
    }
  }
  const manifestFile = path.join(outDir, 'avatar.json')
  // Keep hand-tuned anchors from a previous run.
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {}
  const manifest = {
    avatarId: previous.avatarId ?? `generated-${new Date().toISOString().slice(0, 10)}`,
    styleVersion: 1,
    model: DRY_RUN ? 'dry-run' : MODEL,
    // Head center and size (scale 1 ~ a 440px-wide face box) on the 1024x1024 canvas, per pose.
    // Tune these in /gallery?anchors=1 if overlays (smell, sweat) sit in the wrong place.
    poseAnchors: previous.poseAnchors ?? {
      NORMAL: { x: 512, y: 330, scale: 0.7 },
      TIRED: { x: 512, y: 345, scale: 0.7 },
      EXHAUSTED: { x: 512, y: 380, scale: 0.65 },
      LAZY: { x: 500, y: 400, scale: 0.6 },
    },
    frames,
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n${Object.keys(frames).length}/24 frames, manifest: ${manifestFile}`)
}

async function main() {
  if (!DRY_RUN && !KEY) {
    console.error('Set GEMINI_API_KEY (Google AI Studio) or use --dry-run.')
    process.exit(1)
  }
  const photo = findPhoto()
  fs.mkdirSync(outDir, { recursive: true })
  console.log(
    DRY_RUN
      ? 'Dry run: no API calls, frames are copies of your photo.'
      : `Sending ${path.basename(photo)} to Google Gemini (${MODEL}). Output: ${outDir}`,
  )
  for (const pose of POSES) {
    for (const face of FACES) {
      if (wanted(pose, face)) await ensure(pose, face, photo)
    }
  }
  writeManifest()
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  writeManifest()
  process.exitCode = 1 // not process.exit(): avoids a libuv assertion on Windows after fetch
})
