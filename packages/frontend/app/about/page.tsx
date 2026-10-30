import type { Metadata } from 'next'
import {
  fetchAbout,
  fetchBlogPosts,
  fetchCertifications,
  fetchLearning,
  fetchRecommendations,
  fetchSkills,
} from '@/lib/api'
import type { AboutContent } from '@/lib/api'
import { fetchPublicFeatureFlag } from '@/lib/featureFlags'
import { aboutSeed, contact } from '@/lib/content/site'
import AboutClient from './about-client'

// The backend cold-starts when idle; render per request.
export const dynamic = 'force-dynamic'

function isControlFlow(error: unknown) {
  return Boolean((error as { digest?: unknown } | null)?.digest)
}

/** A failing section is hidden (null), never the whole page. */
async function optional<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch (error) {
    if (isControlFlow(error)) throw error
    console.error(`About: ${label} unavailable`, error)
    return null
  }
}

/** H-16: the seed copy is the fallback only when the endpoint fails. */
async function loadAbout(): Promise<{ about: AboutContent; seed: boolean }> {
  const about = await optional('about content', fetchAbout)
  return about ? { about, seed: false } : { about: aboutSeed, seed: true }
}

function firstSentence(markdown: string | undefined): string {
  const plain = (markdown || '').replace(/[*_`#>[\]]/g, '').replace(/\(([^)]*)\)/g, '').trim()
  const match = /^(.+?[.!?])(\s|$)/.exec(plain)
  return match ? match[1] : plain
}

export async function generateMetadata(): Promise<Metadata> {
  const { about } = await loadAbout()
  return {
    title: 'About',
    description: firstSentence(about.intro?.[0]) || 'About Demi Taylor Nimmo, full-stack software engineer.',
    alternates: { canonical: '/about' },
  }
}

export default async function AboutPage() {
  const [{ about }, openToWork, recommendations, learning, skills, posts, certifications] = await Promise.all([
    loadAbout(),
    fetchPublicFeatureFlag('open_to_work'),
    optional('recommendations', fetchRecommendations),
    optional('learning', fetchLearning),
    optional('skills', fetchSkills),
    optional('blog posts', () => fetchBlogPosts({ limit: 2 })),
    optional('certifications', fetchCertifications),
  ])

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Demi Taylor Nimmo',
    jobTitle: 'Full-stack Software Engineer',
    url: `${siteUrl}/about`,
    sameAs: [about.contact?.github_url || contact.github, about.contact?.linkedin_url || contact.linkedin].filter(Boolean),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutClient
        about={about}
        openToWork={openToWork}
        recommendations={recommendations}
        learning={learning}
        skills={skills}
        posts={posts ? posts.slice(0, 2) : null}
        certifications={certifications}
      />
    </>
  )
}
