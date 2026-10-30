import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import { API_ORIGIN } from '@/lib/config'
import { apiError } from '@/lib/errors'
import { useToast } from './ui/Toast'

type Props = {
  onUploaded: (absoluteUrl: string) => void
  label?: string
  className?: string
}

/** The "Upload" half of a `.joined` image URL field. Posts multipart `image` to /upload/image. */
export function ImageUploadButton({ onUploaded, label = 'Upload', className = 'btn' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { say } = useToast()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('/upload/image', formData)
      const path = res.data?.data?.url as string | undefined
      if (!path) throw new Error('No URL in response')
      onUploaded(path.startsWith('http') ? path : `${API_ORIGIN}${path}`)
      say('Image uploaded')
    } catch (err) {
      say(apiError(err, "Couldn't upload the image. Try again."))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} tabIndex={-1} aria-hidden="true" />
      <button type="button" className={className} disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? 'Uploading' : label}
      </button>
    </>
  )
}
