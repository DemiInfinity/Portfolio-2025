import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'

export function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
}

/** Render inside the app's providers (data router, react-query, toasts, `.ad` root), like main.tsx. */
export function renderApp(ui: ReactElement, { route = '/', client = makeClient() }: { route?: string; client?: QueryClient } = {}) {
  const router = createMemoryRouter(
    [{ path: '*', element: <div className="ad"><ToastProvider>{ui}</ToastProvider></div> }],
    { initialEntries: [route] },
  )
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { client, router, ...result }
}
