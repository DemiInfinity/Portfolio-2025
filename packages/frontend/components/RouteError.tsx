'use client'

import ErrorView from './ErrorView'
import type { RouteErrorCopy } from '@/lib/routeErrors'

/**
 * The route's "couldn't load" view, rendered by the page itself when the API
 * is unavailable (no thrown error during the server render, so no React #419
 * on recovery). "Try again" re-fetches with router.refresh() in a transition.
 */
export default function RouteError({ title, message, reference }: RouteErrorCopy & { reference?: string }) {
  // The reference plays the role of Next's error digest: it is in the server log too.
  const error = Object.assign(new Error(title), reference ? { digest: reference } : {})
  return <ErrorView error={error} reset={() => {}} title={title} message={message} />
}
