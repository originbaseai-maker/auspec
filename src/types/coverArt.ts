export type CropMode = 'circle' | 'square' | 'none'

export interface CoverArtImage {
  file: File
  objectUrl: string
  width: number
  height: number
}

export const ACCEPTED_IMAGE_MIME = 'image/jpeg,image/png,image/webp,image/gif'
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export function isValidImageFile(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
    file.type,
  )
}

export async function loadImageFile(file: File): Promise<CoverArtImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () =>
      resolve({
        file,
        objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}
