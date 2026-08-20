import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
// This subpath (rather than '@testing-library/jest-dom/matchers') both
// registers the matchers on Vitest's `expect` and augments Vitest's
// `Assertion` type - importing '/matchers' alone leaves `expect(...).toBeInTheDocument()`
// working at runtime but failing `tsc`, which is what broke the production build.
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000'

