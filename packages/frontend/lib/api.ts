const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.demitaylornimmo.com/api'

/**
 * Thrown when the API could not be reached or returned an unexpected error.
 * The backend runs on Railway and cold-starts when idle, so this can simply
 * mean "the server is waking up" rather than "the data doesn't exist" -
 * callers should surface this distinctly from a genuinely empty result and
 * from a genuine 404, not silently swallow it into an empty list/null.
 */
export class ApiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'ApiUnavailableError'
    if (options?.cause !== undefined) {
      // @ts-expect-error - `cause` typing varies across TS lib targets
      this.cause = options.cause
    }
  }
}

async function fetchList<T>(url: string, description: string, init?: RequestInit): Promise<T[]> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch (error) {
    console.error(`Error fetching ${description}:`, error)
    throw new ApiUnavailableError(
      `Unable to reach the API to load ${description}. It may be waking up from a cold start - please try again shortly.`,
      { cause: error }
    )
  }
  if (!response.ok) {
    console.error(`Error fetching ${description}: status ${response.status}`)
    throw new ApiUnavailableError(
      `The API returned an error while loading ${description} (status ${response.status}).`
    )
  }
  try {
    const data = await response.json()
    if (data.success === false) {
      throw new ApiUnavailableError(
        `The API reported a failure while loading ${description}: ${data.error ?? 'unknown error'}.`
      )
    }
    return (data.data ?? []) as T[]
  } catch (error) {
    if (error instanceof ApiUnavailableError) throw error
    console.error(`Error parsing response for ${description}:`, error)
    throw new ApiUnavailableError(
      `The API returned an unexpected response while loading ${description}.`,
      { cause: error }
    )
  }
}

async function fetchSingle<T>(url: string, description: string, init?: RequestInit): Promise<T | null> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch (error) {
    console.error(`Error fetching ${description}:`, error)
    throw new ApiUnavailableError(
      `Unable to reach the API to load ${description}. It may be waking up from a cold start - please try again shortly.`,
      { cause: error }
    )
  }
  if (response.status === 404) {
    // Genuinely doesn't exist - not a connectivity/availability problem.
    return null
  }
  if (!response.ok) {
    console.error(`Error fetching ${description}: status ${response.status}`)
    throw new ApiUnavailableError(
      `The API returned an error while loading ${description} (status ${response.status}).`
    )
  }
  try {
    const data = await response.json()
    if (data.success === false) {
      throw new ApiUnavailableError(
        `The API reported a failure while loading ${description}: ${data.error ?? 'unknown error'}.`
      )
    }
    return (data.data ?? null) as T | null
  } catch (error) {
    if (error instanceof ApiUnavailableError) throw error
    console.error(`Error parsing response for ${description}:`, error)
    throw new ApiUnavailableError(
      `The API returned an unexpected response while loading ${description}.`,
      { cause: error }
    )
  }
}

export async function fetchProjects() {
  return fetchList<any>(`${API_BASE_URL}/projects`, 'projects', { cache: 'no-store' })
}

export async function fetchProjectById(id: string | number) {
  return fetchSingle<any>(`${API_BASE_URL}/projects/${id}`, 'project', { cache: 'no-store' })
}

export async function fetchProjectBySlug(slug: string) {
  return fetchSingle<any>(`${API_BASE_URL}/projects/slug/${slug}`, 'project', { cache: 'no-store' })
}

export async function fetchBlogPosts() {
  return fetchList<any>(`${API_BASE_URL}/blog`, 'blog posts')
}

export async function fetchBlogPostBySlug(slug: string) {
  return fetchSingle<any>(`${API_BASE_URL}/blog/${slug}`, 'blog post', { next: { revalidate: 60 } })
}

export async function fetchLearning() {
  return fetchList<any>(`${API_BASE_URL}/learning`, 'learning items')
}

export async function fetchWorkHistory() {
  return fetchList<any>(`${API_BASE_URL}/work-history`, 'work history')
}

export async function fetchEducation() {
  return fetchList<any>(`${API_BASE_URL}/education`, 'education')
}

export async function fetchCertifications() {
  return fetchList<any>(`${API_BASE_URL}/certifications`, 'certifications')
}
