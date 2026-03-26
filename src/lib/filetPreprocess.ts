/**
 * Convert image to binary (filled/open) for filet crochet.
 * threshold: 0-255. Pixels darker than threshold = filled (black), lighter = open (white).
 * invert: flips filled/open (useful when subject is light on dark background).
 */
export async function processImageForFilet(
  imageDataUrl: string,
  threshold: number,
  invert: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        let filled = gray < threshold
        if (invert) filled = !filled
        const val = filled ? 20 : 250
        data[i] = data[i + 1] = data[i + 2] = val
        data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = () => reject(new Error('Could not process image'))
    img.src = imageDataUrl
  })
}
