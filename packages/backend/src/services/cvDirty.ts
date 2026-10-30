/**
 * Called after every successful write to CV content (projects, work history,
 * education, certifications, learning, skills, about content,
 * recommendations). Never throws into the request.
 *
 * Loads the build pipeline lazily: cvBuild → cvData → the route formatters
 * would otherwise be a circular import from the routes that call this.
 */
export async function markCvDirty(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { markCvDirty: mark } = require('./cvBuild') as typeof import('./cvBuild')
    await mark()
  } catch (error) {
    console.warn('CV rebuild not scheduled:', error)
  }
}
