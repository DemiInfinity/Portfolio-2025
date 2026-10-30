import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth.tsx'
import { ToastProvider } from '@/components/ui/Toast'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// A data router (one splat route; App keeps its own <Routes>) so pages can use useBlocker (About's unsaved-changes guard).
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <div className="ad">
          <ToastProvider>
            <App />
          </ToastProvider>
        </div>
      </AuthProvider>
    ),
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
