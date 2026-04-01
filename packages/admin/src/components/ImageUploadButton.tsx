import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const API_ORIGIN = ((import.meta as any).env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://api.demitaylornimmo.com'

type Props = {
  onUploaded: (absoluteUrl: string) => void
  label?: string
  className?: string
}

export function ImageUploadButton({ onUploaded, label = 'Upload image', className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('/upload/image', formData)
      const path = res.data?.data?.url as string | undefined
      if (!path) {
        throw new Error('No URL in response')
      }
      const absolute = path.startsWith('http') ? path : `${API_ORIGIN}${path}`
      onUploaded(absolute)
      toast.success('Image uploaded')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      toast.error(message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-2 border-pink-200 bg-white text-pink-700 hover:bg-pink-50 transition-colors disabled:opacity-60 ${className}`}
      >
        <ImagePlus className="w-4 h-4" />
        {uploading ? 'Uploading…' : label}
      </button>
    </>
  )
}
