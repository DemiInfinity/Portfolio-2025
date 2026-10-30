const PATHS = {
  dashboard: 'M4 4h7v8H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  projects: 'M4 7h16v12H4zM9 7V5h6v2M4 12h16',
  blog: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h6M10 16h4',
  work: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7v5l3 2',
  education: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.4 2.7 3 6 3s6-1.6 6-3v-5',
  certifications: 'M12 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11zM9 13.5 7.5 21l4.5-2.5 4.5 2.5L15 13.5',
  learning: 'M4 5h5a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-5a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h6z',
  analytics: 'M5 20V11M11 20V5M17 20v-6M3 20h18',
  flags: 'M6 21V4M6 4h11l-2 4 2 4H6',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4M4 12h14',
  signout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14zM20 20l-4-4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  file: 'M7 3h7l4 4v14H7zM14 3v4h4',
  about: 'M12 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
} as const

export type IconName = keyof typeof PATHS

type Props = { name: IconName; size?: number; stroke?: number }

const DEFAULT_STROKE: Partial<Record<IconName, number>> = { plus: 2, external: 2, close: 1.8, menu: 1.8, search: 1.8, refresh: 1.8 }

export default function Icon({ name, size = 18, stroke }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke ?? DEFAULT_STROKE[name] ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
