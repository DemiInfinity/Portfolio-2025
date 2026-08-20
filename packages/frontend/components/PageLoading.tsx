import { Loader2 } from 'lucide-react'

/**
 * Shared loading state for pages that fetch from the backend on Railway,
 * which cold-starts when idle. Without this, a slow cold start just looks
 * like a blank/frozen page instead of something visibly happening.
 */
export default function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center py-20"
      style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #f8f4ff 50%, #fff8f0 100%)' }}
    >
      <div className="text-center px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 float-animation"
             style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)' }}>
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-xl font-semibold gradient-text mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {label} ✨
        </p>
        <p className="text-gray-600 font-medium max-w-sm mx-auto">
          Our server naps when nobody's around, so this can take a few extra seconds to wake up. 💤
        </p>
      </div>
    </div>
  )
}
