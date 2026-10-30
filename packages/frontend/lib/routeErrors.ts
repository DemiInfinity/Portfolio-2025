/**
 * Copy for the route-level "couldn't load" states. Used by each route's
 * error.tsx (unexpected render errors) and by the pages themselves, which
 * render the same view inline when the API is unavailable instead of throwing
 * during the server render (QA N-8: a server error inside the root loading
 * Suspense boundary surfaces as React #419 when the page later recovers).
 */
export type RouteErrorCopy = { title: string; message?: string }

export const ROUTE_ERRORS = {
  about: { title: "Couldn't load the about page" },
  blog: { title: "Couldn't load the blog", message: 'We couldn’t reach the server to load this blog content. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds.' },
  cv: { title: "Couldn't load the CV" },
  experience: { title: "Couldn't load experience", message: 'We couldn’t reach the server to load work history and education. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds.' },
  learning: { title: "Couldn't load the learning journey", message: 'We couldn’t reach the server to load learning progress and skills. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds.' },
  projects: { title: "Couldn't load projects", message: 'We couldn’t reach the server to load the projects. The server naps when nobody’s around, so it may just need a moment to wake up. Try again in a few seconds.' },
} satisfies Record<string, RouteErrorCopy>
