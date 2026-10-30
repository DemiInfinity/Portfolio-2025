import nextVitals from 'eslint-config-next/core-web-vitals'

// Next 16 removed `next lint`; this is the ESLint CLI flat config it recommends.
const config = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**'],
  },
]

export default config
