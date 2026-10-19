#!/usr/bin/env node
// Generates avatar variants of the user from one photo with an image model.
//
//   OPENAI_API_KEY=... npm run avatar:generate            # all missing images (chibi, OpenAI)
//   npm run avatar:generate -- --only TIRED/WORRIED       # (re)generate one frame
//   npm run avatar:generate -- --force                    # regenerate everything
//   npm run avatar:generate -- --style photo              # photorealistic instead of chibi
//   npm run avatar:generate -- --provider gemini          # GEMINI_API_KEY instead of OpenAI
//   npm run avatar:generate -- --dry-run                  # no API calls: copies the photo, to test the app wiring
//
// Pipeline (DESIGN.md "Consistency strategy"): photo -> master (normal pose, neutral face) ->
// 3 more poses edited from the master -> each pose edited into the 5 other expressions.
// Every variant is derived from the master, never from scratch, so it stays the same person.
// Output (gitignored): src/local-avatar/generated/<POSE>_<FACE>.<png|jpg> + avatar.json.
//
// PRIVACY: this sends your photo to OpenAI (or Google with --provider gemini). Nothing is sent with --dry-run.

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
const STYLE_NAME = option('style') ?? 'chibi'
const PROVIDER = option('provider') ?? (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    key: process.env.OPENAI_API_KEY,
    keyName: 'OPENAI_API_KEY',
    model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare',
    ext: 'png',
  },
  gemini: {
    label: 'Google Gemini',
    key: process.env.GEMINI_API_KEY,
    keyName: 'GEMINI_API_KEY',
    model: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image',
    ext: 'jpg',
  },
}
const provider = PROVIDERS[PROVIDER]

const POSES = ['NORMAL', 'TIRED', 'EXHAUSTED', 'LAZY']
const FACES = ['NEUTRAL', 'HAPPY', 'WORRIED', 'VERY_WORRIED', 'TIRED', 'EXHAUSTED']

// ---- photorealistic prompts ----------------------------------------------------------------

const PHOTO_STYLE =
  'Photorealistic photograph, natural soft daylight from a window, shot on a 35mm lens at eye level, ' +
  'realistic skin texture, no beauty filter, no text, no watermark, square 1:1 frame.'

const SCENE =
  'A cosy, tidy small apartment living room: light wall, a grey fabric couch, a window on the left, ' +
  'wooden floor. The camera is static and the room looks exactly the same in every shot.'

const KEEP_HEAD =
  'Keep the camera, framing, room, lighting, clothes and the person identical to the reference photo. ' +
  "Keep the person's head at the same position and size in the frame as in the reference."

const KEEP_ALL =
  'Change ONLY the facial expression. Keep everything else pixel-identical: pose, body, hands, clothes, ' +
  'hair, room, framing, lighting and colors. Same person, same identity.'

const PHOTO = {
  transparent: false,
  master:
    `Create a new photo of exactly this person (same face, facial structure, hair, skin tone, age, ` +
    `necklace and black t-shirt) standing relaxed in the middle of the room, facing the camera, ` +
    `framed from the knees up, head in the upper-middle third of the frame, calm neutral expression, ` +
    `mouth closed. ${SCENE} ${PHOTO_STYLE}`,
  poses: {
    TIRED:
      `Edit this photo: the same person now stands with low energy, shoulders drooping, arms hanging ` +
      `heavily, slightly hunched, as if after a long day without enough food. Neutral, calm face. ${KEEP_HEAD} ${PHOTO_STYLE}`,
    EXHAUSTED:
      `Edit this photo: the same person is now completely drained, sitting on the floor leaning back ` +
      `against the front of the couch, legs stretched out, arms limp at the sides, posture collapsed. ` +
      `Neutral face, still looking towards the camera. Same room, camera and lighting. ` +
      `Keep the head as close as possible to the same place in the frame. ${PHOTO_STYLE}`,
    LAZY:
      `Edit this photo: the same person is now slumped lazily deep in the grey couch, half lying, ` +
      `holding a phone loosely in one hand, unmotivated, wearing grey sweatpants. Neutral face, looking ` +
      `towards the camera. Same room, camera and lighting. Keep the head as close as possible to the ` +
      `same place in the frame. ${PHOTO_STYLE}`,
  },
  faces: {
    HAPPY: `Edit this photo: give the person a genuine, warm, happy smile reaching the eyes. ${KEEP_ALL} ${PHOTO_STYLE}`,
    WORRIED:
      `Edit this photo: give the person a worried expression: inner eyebrows raised and pulled together, ` +
      `slight frown, lips pressed. ${KEEP_ALL} ${PHOTO_STYLE}`,
    VERY_WORRIED:
      `Edit this photo: give the person a very anxious, stressed expression: wide eyes, strongly raised ` +
      `inner eyebrows, tense mouth, a light sheen of sweat on the forehead. ${KEEP_ALL} ${PHOTO_STYLE}`,
    TIRED:
      `Edit this photo: make the person look tired: heavy drooping eyelids, dark circles under the eyes, ` +
      `slightly dull skin, low-energy expression. ${KEEP_ALL} ${PHOTO_STYLE}`,
    EXHAUSTED:
      `Edit this photo: make the person look utterly exhausted: half-closed eyes, deep dark circles, pale ` +
      `skin, slack mouth slightly open, head heavy. ${KEEP_ALL} ${PHOTO_STYLE}`,
  },
  // Head center and size (scale 1 ~ a 440px-wide face box) on the 1024x1024 canvas, per pose.
  anchors: {
    NORMAL: { x: 512, y: 330, scale: 0.7 },
    TIRED: { x: 512, y: 345, scale: 0.7 },
    EXHAUSTED: { x: 512, y: 380, scale: 0.65 },
    LAZY: { x: 500, y: 400, scale: 0.6 },
  },
}

// ---- chibi prompts (the app draws the room, smell, growl and thought bubble around them) ----

const CHIBI_STYLE =
  'Cute chibi cartoon illustration: oversized round head (about 40% of the body height), small body, ' +
  'thick dark outlines, flat colors with soft cel shading, sticker-like. Fully transparent background: ' +
  'no room, no floor, no ground shadow, no frame, no text, no watermark. Square 1024x1024 canvas.'

const PLACEMENT =
  'The head is centered horizontally with its center about one third from the top of the canvas and is ' +
  'about 430 pixels wide; the whole body fits on the canvas with a small margin.'

const KEEP_CHARACTER =
  'It must stay the same chibi character as the first image: identical face, hairstyle, colors, outfit, ' +
  'outline style and proportions. Any other image is the real person, for likeness only.'

const KEEP_POSE =
  'Change ONLY the face. Keep the pose, body, hands, outfit, props, colors, outline style, position on ' +
  'the canvas and the transparent background exactly the same.'

const CHIBI = {
  transparent: true,
  master:
    `Turn this person into a chibi character that is clearly recognizable as them: same face shape, ` +
    `hairstyle and hair color, skin tone, eye color, facial hair, glasses and accessories if any, and ` +
    `the same clothes. Standing relaxed, facing the viewer, arms at the sides, calm neutral expression, ` +
    `mouth closed. ${PLACEMENT} ${CHIBI_STYLE}`,
  poses: {
    TIRED:
      `Redraw this character with no energy: knees buckling, back hunched, arms hanging down to the knees, ` +
      `head drooping slightly forward. Calm neutral face. Keep the head near the same place on the canvas. ` +
      `${KEEP_CHARACTER} ${CHIBI_STYLE}`,
    EXHAUSTED:
      `Redraw this character completely collapsed, lying flat on their front across the lower half of the ` +
      `canvas, arms and legs limp and splayed, head turned towards the viewer resting on the ground. ` +
      `Calm neutral face with eyes open. ${KEEP_CHARACTER} ${CHIBI_STYLE}`,
    LAZY:
      `Redraw this character sunk deep into a small grey couch, half lying, holding an open bag of chips, ` +
      `wearing grey sweatpants, totally unmotivated. Draw the couch in the same chibi style, with ` +
      `transparent background around it. Calm neutral face looking at the viewer. ${KEEP_CHARACTER} ${CHIBI_STYLE}`,
  },
  faces: {
    HAPPY:
      `Give this character an over-the-top happy face: eyes squeezed shut into upside-down U arcs, a huge ` +
      `open grin, rosy cheeks, a few small sparkles around the head. ${KEEP_POSE} ${CHIBI_STYLE}`,
    WORRIED:
      `Give this character an over-the-top worried face: anxious wide eyes with small pupils, steeply raised ` +
      `inner eyebrows, a wobbly zigzag mouth, one big sweat drop sliding down the temple. ${KEEP_POSE} ${CHIBI_STYLE}`,
    VERY_WORRIED:
      `Give this character an over-the-top panicked face: bulging eyes with pinprick pupils, clenched gritted ` +
      `teeth, tears streaming, several sweat drops flying off the head. ${KEEP_POSE} ${CHIBI_STYLE}`,
    TIRED:
      `Give this character an over-the-top tired face: heavy half-closed eyelids, deep dark bags under the ` +
      `eyes, a big yawn, a few small floating "z" letters. ${KEEP_POSE} ${CHIBI_STYLE}`,
    EXHAUSTED:
      `Give this character an over-the-top exhausted face: pale skin, spiral swirly eyes, tongue hanging out, ` +
      `a drop of drool, a few "z" letters and a tiny ghost-like soul drifting out of the mouth. ${KEEP_POSE} ${CHIBI_STYLE}`,
  },
  // Measured on the first generated set; `belly` overrides the point below the head for lying poses.
  anchors: {
    NORMAL: { x: 500, y: 305, scale: 1 },
    TIRED: { x: 510, y: 335, scale: 1 },
    EXHAUSTED: { x: 360, y: 650, scale: 1, belly: { x: 600, y: 730 } },
    LAZY: { x: 360, y: 330, scale: 1 },
  },
}

const STYLES = { chibi: CHIBI, photo: PHOTO }
const style = STYLES[STYLE_NAME]

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
  if (typeof node.b64_json === 'string') return node.b64_json
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

function geminiRequest(prompt, references) {
  const body = {
    model: provider.model,
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
  const api = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'
  return fetch(`${api}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.key },
    body: JSON.stringify(body),
  })
}

function openaiRequest(prompt, references) {
  const form = new FormData()
  form.append('model', provider.model)
  form.append('prompt', prompt)
  for (const file of references) {
    form.append('image[]', new Blob([fs.readFileSync(file)], { type: mimeOf(file) }), path.basename(file))
  }
  form.append('size', '1024x1024')
  form.append('quality', process.env.OPENAI_IMAGE_QUALITY ?? 'medium')
  form.append('output_format', 'png')
  form.append('background', style.transparent ? 'transparent' : 'opaque')
  // Only these models take input_fidelity; high keeps the reference's face closer.
  if (/^gpt-image-1(\.5)?$/.test(provider.model)) form.append('input_fidelity', 'high')
  const api = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  return fetch(`${api}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.key}` },
    body: form,
  })
}

/** One image edit: prompt + reference images in, image bytes out. Retries rate limits and 5xx. */
async function generate(prompt, references) {
  for (let attempt = 1; ; attempt++) {
    let response, text
    try {
      response = await (PROVIDER === 'openai' ? openaiRequest : geminiRequest)(prompt, references)
      text = await response.text()
    } catch (error) {
      // Network errors ("fetch failed", connection reset) are worth retrying like a 5xx.
      if (attempt >= 5) throw error
      const wait = 2000 * 2 ** attempt
      console.warn(`  ${error.cause?.code ?? error.message}, retrying in ${wait / 1000}s`)
      await sleep(wait)
      continue
    }
    // A daily quota (e.g. "limit: 0 requests per day" on Gemini's free tier) or an empty balance won't recover by waiting.
    const permanent = response.status === 429 && /per day|insufficient_quota|billing/i.test(text)
    if ((response.status === 429 || response.status >= 500) && !permanent && attempt < 5) {
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

const frameFile = (pose, face) => path.join(outDir, `${pose}_${face}.${provider.ext}`)
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
    await make(pose, face, style.master, [photo])
  } else if (face === 'NEUTRAL') {
    const master = await ensure('NORMAL', 'NEUTRAL', photo)
    await make(pose, face, style.poses[pose], [master, photo])
  } else {
    const base = await ensure(pose, 'NEUTRAL', photo)
    await make(pose, face, style.faces[face], [base])
  }
  madeThisRun.add(file)
  return file
}

function writeManifest() {
  const frames = {}
  for (const pose of POSES) {
    for (const face of FACES) {
      if (fs.existsSync(frameFile(pose, face))) frames[`${pose}/${face}`] = path.basename(frameFile(pose, face))
    }
  }
  const manifestFile = path.join(outDir, 'avatar.json')
  // Keep hand-tuned anchors from a previous run of the same style.
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {}
  const sameStyle = (previous.style ?? 'photo') === STYLE_NAME
  const manifest = {
    avatarId: previous.avatarId ?? `generated-${new Date().toISOString().slice(0, 10)}`,
    styleVersion: 1,
    // chibi: drawn over the app's illustrated room and effects; photo: a realistic scene of its own.
    style: STYLE_NAME,
    provider: DRY_RUN ? 'dry-run' : PROVIDER,
    model: DRY_RUN ? 'dry-run' : provider.model,
    // Head center and size per pose. Tune these in /gallery?anchors if overlays sit in the wrong place.
    poseAnchors: (sameStyle && previous.poseAnchors) || style.anchors,
    frames,
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n${Object.keys(frames).length}/24 frames, manifest: ${manifestFile}`)
}

async function main() {
  if (!style) throw new Error(`--style must be one of: ${Object.keys(STYLES).join(', ')}`)
  if (!provider) throw new Error(`--provider must be one of: ${Object.keys(PROVIDERS).join(', ')}`)
  if (!DRY_RUN && !provider.key) {
    console.error(`Set ${provider.keyName} or use --dry-run.`)
    process.exitCode = 1
    return
  }
  const photo = findPhoto()
  fs.mkdirSync(outDir, { recursive: true })
  console.log(
    DRY_RUN
      ? 'Dry run: no API calls, frames are copies of your photo.'
      : `Sending ${path.basename(photo)} to ${provider.label} (${provider.model}), style ${STYLE_NAME}. Output: ${outDir}`,
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
  if (style && provider && fs.existsSync(outDir)) writeManifest()
  process.exitCode = 1 // not process.exit(): avoids a libuv assertion on Windows after fetch
})
