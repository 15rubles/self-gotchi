/** Longest side sent to the server; more detail doesn't help the drawing and costs upload time. */
const MAX_SIDE = 1536

/**
 * Any photo the browser can show (including iPhone HEIC in Safari) as a JPEG of at most
 * {@link MAX_SIDE} px, with the camera's rotation applied. Drawing it on a canvas also drops the
 * EXIF data (location, device) before it leaves the device.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => {
      throw new Error("This file isn't a photo the browser can open.")
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read the photo."))), 'image/jpeg', 0.9),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
