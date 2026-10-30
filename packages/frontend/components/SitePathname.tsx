'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { NOT_FOUND_REWRITE } from '@/lib/originalPath'

const OriginalPath = createContext<string | null>(null)

export function OriginalPathProvider({ value, children }: { value: string | null; children: ReactNode }) {
  return <OriginalPath.Provider value={value}>{children}</OriginalPath.Provider>
}

/**
 * usePathname(), except during the server render of a proxy 404 rewrite,
 * where it returns the visitor's URL (what the browser's usePathname() will
 * return), so the header and footer hydrate without a mismatch.
 */
export function useSitePathname(): string {
  const pathname = usePathname() || '/'
  const original = useContext(OriginalPath)
  return pathname === NOT_FOUND_REWRITE && original ? original : pathname
}
