#!/usr/bin/env node
// Generates the shared (non-personal) art with OpenAI's image API: the room at 4 mess levels,
// smell clouds, a fly, belly-growl lines, a sparkle and the thought icons. The output is
// committed (src/character/art/), so the app ships with it; nobody's photo is involved.
//
//   OPENAI_API_KEY=... npm run art:generate              # all missing assets
//   npm run art:generate -- --only room-2                # (re)generate one asset
//   npm run art:generate -- --force                      # regenerate everything
//
// Rooms 1-3 are edited from the previous level, so it stays the same room getting messier.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(here, '../src/character/art')

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined
const KEY = process.env.OPENAI_API_KEY
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare'
const QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? 'medium'
const API = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'

const STYLE =
  'Cute chibi cartoon game art: thick dark outlines, flat colors with soft cel shading, warm cosy palette, ' +
  'clean sticker-like look. No text, no letters, no watermark, no people, no characters.'

const SPRITE = 'Centered on the canvas with a small margin, fully transparent background, nothing else in the image.'

const KEEP_ROOM =
  'Keep everything that is already there, the same camera, walls, window, poster, plant and layout. ' +
  'Keep the middle third of the room completely empty (a character stands there). Add mess only near the left and right edges and on the floor.'

/** name -> how to make it. `from` = edit that asset instead of generating from scratch. `size` = longest side after trimming. */
const ASSETS = [
  {
    name: 'room-0',
    transparent: false,
    size: 1024,
    prompt:
      'A square illustration of a cosy, tidy small room seen straight on like a stage. A warm cream back wall fills ' +
      'the top two thirds; a light wooden plank floor fills the bottom third, the floor line about 68% down. A window ' +
      'with light-blue sky on the left of the wall, a small framed poster on the right of the wall, a potted green ' +
      'plant on the floor at the far right. The middle third of the room is completely empty open space, from the ' +
      'floor up to the ceiling: no furniture, no rug, no objects there. ' +
      STYLE,
  },
  {
    name: 'room-1',
    from: 'room-0',
    transparent: false,
    size: 1024,
    prompt: `Edit this room so it is slightly untidy: add one sock on the floor at the lower left and one crumpled paper ball on the floor at the lower right. ${KEEP_ROOM} ${STYLE}`,
  },
  {
    name: 'room-2',
    from: 'room-1',
    transparent: false,
    size: 1024,
    prompt:
      'Edit this room so it is messy: add an open greasy pizza box on the floor at the left, a dirty coffee mug on the ' +
      'floor at the right, more crumpled papers and socks near the edges of the floor, a brown stain on the floor, the ' +
      `plant's leaves drooping and a bit yellow, the window a little grimy. ${KEEP_ROOM} ${STYLE}`,
  },
  {
    name: 'room-3',
    from: 'room-2',
    transparent: false,
    size: 1024,
    prompt:
      'Edit this room so it is filthy: add two full black trash bags at the left and right edges of the floor, a ' +
      'large brown stain on the wall, food wrappers and garbage scattered near the floor edges, the poster hanging ' +
      `crooked, a dingy brownish tint over everything and a few flies around the trash. ${KEEP_ROOM} ${STYLE}`,
  },
  {
    name: 'smell-1',
    transparent: true,
    size: 384,
    prompt: `Three faint pale-green wavy cartoon stink lines rising upward, a light whiff of bad breath. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'smell-2',
    transparent: true,
    size: 384,
    prompt: `A puffy green cartoon stink cloud with a few wavy stink lines rising from it, bad breath. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'smell-3',
    transparent: true,
    size: 384,
    prompt: `A big dark murky green toxic-looking cartoon stink cloud with swirls and wavy stink lines rising from it, terrible smell. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'fly',
    transparent: true,
    size: 128,
    prompt: `One small cute cartoon housefly seen from above, black round body, white translucent wings. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'growl',
    transparent: true,
    size: 192,
    prompt: `A cute cartoon grumpy pink stomach with a squeezed angry face and small orange jolt marks beside it, a hungry growling stomach badge. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'sparkle',
    transparent: true,
    size: 128,
    prompt: `One four-pointed bright yellow cartoon sparkle star with a tiny pink glint. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'icon-lunchbox',
    transparent: true,
    size: 256,
    prompt: `A cute cartoon orange lunchbox with a handle on top, an icon. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'icon-book',
    transparent: true,
    size: 256,
    prompt: `A cute cartoon open green school textbook, a homework icon. ${SPRITE} ${STYLE}`,
  },
  {
    name: 'icon-generic',
    transparent: true,
    size: 256,
    prompt: `A cute cartoon yellow sticky note with a big bold red exclamation mark drawn on it, a reminder icon. ${SPRITE} ${STYLE.replace('No text, no letters, ', 'No words, ')}`,
  },
]

const fileOf = (name) => path.join(outDir, `${name}.webp`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** One image from OpenAI: generated from the prompt, or edited from `reference`. Retries 429/5xx and network errors. */
async function openaiImage(prompt, reference, transparent) {
  for (let attempt = 1; ; attempt++) {
    let response, text
    try {
      const params = {
        model: MODEL,
        prompt,
        size: '1024x1024',
        quality: QUALITY,
        output_format: 'png',
        background: transparent ? 'transparent' : 'opaque',
      }
      let body
      if (reference) {
        // Edits are multipart with files; send the reference as PNG so the model gets lossless pixels.
        body = new FormData()
        for (const [key, value] of Object.entries(params)) body.append(key, value)
        const png = await sharp(fs.readFileSync(reference)).png().toBuffer()
        body.append('image[]', new Blob([png], { type: 'image/png' }), 'reference.png')
      } else {
        // Generations only accept JSON.
        body = JSON.stringify(params)
      }
      response = await fetch(`${API}/images/${reference ? 'edits' : 'generations'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, ...(reference ? {} : { 'Content-Type': 'application/json' }) },
        body,
      })
      text = await response.text()
    } catch (error) {
      if (attempt >= 5) throw error
      console.warn(`  ${error.cause?.code ?? error.message}, retrying`)
      await sleep(2000 * 2 ** attempt)
      continue
    }
    const permanent = response.status === 429 && /insufficient_quota|billing/i.test(text)
    if ((response.status === 429 || response.status >= 500) && !permanent && attempt < 5) {
      console.warn(`  HTTP ${response.status}, retrying`)
      await sleep(2000 * 2 ** attempt)
      continue
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`)
    const json = JSON.parse(text)
    const data = json.data?.[0]?.b64_json
    if (!data) throw new Error(`no image in response: ${text.slice(0, 300)}`)
    if (json.usage) console.log(`  usage: ${JSON.stringify(json.usage)}`)
    return Buffer.from(data, 'base64')
  }
}

/** Sprites are trimmed to their content and scaled to fit `size`; rooms stay full-frame. */
async function save(asset, bytes) {
  let image = sharp(bytes)
  if (asset.transparent) image = sharp(await image.trim().toBuffer())
  const out = await image
    .resize({ width: asset.size, height: asset.size, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: asset.transparent ? 90 : 85, alphaQuality: 90, effort: 6 })
    .toBuffer()
  fs.writeFileSync(fileOf(asset.name), out)
}

async function main() {
  if (!KEY) {
    console.error('Set OPENAI_API_KEY.')
    process.exitCode = 1
    return
  }
  fs.mkdirSync(outDir, { recursive: true })
  const todo = ASSETS.filter((a) => (ONLY ? a.name === ONLY : FORCE || !fs.existsSync(fileOf(a.name))))
  if (ONLY && todo.length === 0) throw new Error(`unknown asset ${ONLY}; one of: ${ASSETS.map((a) => a.name).join(', ')}`)
  console.log(`${todo.length} asset(s) with ${MODEL} (${QUALITY}) -> ${outDir}`)
  for (const asset of todo) {
    console.log(`- ${asset.name}`)
    const reference = asset.from ? fileOf(asset.from) : null
    if (reference && !fs.existsSync(reference)) throw new Error(`${asset.name} needs ${asset.from} first`)
    await save(asset, await openaiImage(asset.prompt, reference, asset.transparent))
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  process.exitCode = 1
})
