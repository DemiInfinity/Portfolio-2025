import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Projects from '../Projects'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const LIST = [
  { id: 1, title: 'LunaLore', slug: 'lunalore', status: 'in_development', featured: true, image: 'https://x/l.png', technologies: ['Electron', 'Next.js', 'Supabase', 'Vercel'], images: [], show_on_site: true, has_case_study: true },
  { id: 2, title: 'Infinity Tracker', slug: 'infinity-tracker', status: 'in_development', featured: false, image: '', technologies: ['Electron', 'TypeScript', 'SQLite'], images: [], show_on_site: false, has_case_study: false },
  { id: 3, title: 'This portfolio', slug: 'portfolio-website', status: 'completed', featured: false, image: '', technologies: ['Next.js'], images: [], show_on_site: true, has_case_study: false },
]
const FULL: Record<number, object> = {
  1: { ...LIST[0], description: 'VTubers', content: '', role: 'Solo: design, frontend, backend', platform: 'Desktop app and web', case_study: { overview: 'Saved overview', process: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] } },
  2: { ...LIST[1], description: '', content: '# old', role: null, platform: null, case_study: null },
}

describe('Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/admin/all') return { data: { success: true, data: LIST } } as never
      const id = Number(url.split('/').pop())
      return { data: { success: true, data: FULL[id] } } as never
    })
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: { unfeatured: [] } } })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 9, unfeatured: [] } } })
  })

  it('lists from the admin endpoint with the sub, search counts, filters and not-on-site suffix', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />)
    expect(await screen.findByText('3 projects, 1 featured on the home page.')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/projects/admin/all')
    expect(api.get).not.toHaveBeenCalledWith('/projects')
    expect(screen.getByText('/projects/infinity-tracker · not on the site')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search projects'), 'sqlite')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    for (const n of ['All 1', 'In development 1', 'Ideas 0', 'Completed 0']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Search projects'))
    await user.click(screen.getByRole('button', { name: /^Ideas/ }))
    expect(screen.getByText('No projects with this status.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('validates a new project, slugs the title, and posts arrays with show_on_site true', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'New project' }))
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(screen.getByText('Give the project a title.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(api.post).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Title'), 'My New App!')
    expect(screen.getByLabelText('URL slug')).toHaveValue('my-new-app')
    expect(screen.getByText('Ideas never show on the site, even with this on.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Show on site/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.change(screen.getByLabelText('Technologies'), { target: { value: 'A, B ,C' } })
    fireEvent.change(screen.getByLabelText('Gallery images'), { target: { value: 'https://a\n\nhttps://b' } })
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/projects', expect.objectContaining({ technologies: ['A', 'B', 'C'], images: ['https://a', 'https://b'], show_on_site: true, role: null, platform: null, case_study: null })))
    expect(await screen.findByRole('status')).toHaveTextContent('Saved My New App!')
  })

  it('edits through /projects/admin/:id, shows role/platform and the featured hint, and clears to null', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit Infinity Tracker' }))
    expect(await screen.findByRole('dialog', { name: 'Edit Infinity Tracker' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/projects/admin/2')
    await user.click(screen.getByRole('switch', { name: /Feature on the home page/ }))
    expect(screen.getByText('Replaces LunaLore in the home page spotlight.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your role'), 'Solo: design, frontend, backend')
    await user.type(screen.getByLabelText('Platform'), 'Desktop app and web')
    await user.click(screen.getByRole('switch', { name: /Show on site/ }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/projects/2', expect.objectContaining({ role: 'Solo: design, frontend, backend', platform: 'Desktop app and web', featured: true, show_on_site: true, content: '# old' })))
  })

  it('shows the saved case study, sends only the overview, and drops metrics missing a label', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit Infinity Tracker' }))
    await user.click(await screen.findByRole('tab', { name: /Case study/ }))
    expect(screen.getByRole('tab', { name: /Case study/ })).toHaveTextContent('empty')
    expect(screen.getByText('Old Markdown case study')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Overview'), { target: { value: 'Hello' } })
    await user.click(screen.getByRole('button', { name: 'Add metric' }))
    expect(screen.getByLabelText('Value')).toHaveFocus()
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '30%' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/projects/2', expect.objectContaining({ case_study: { overview: 'Hello' } })))
  })

  it('loads phases, blocks an image without a description, reorders, and caps at 8', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit LunaLore' }))
    await user.click(await screen.findByRole('tab', { name: /Case study/ }))
    expect(screen.getByLabelText('Overview')).toHaveValue('Saved overview')
    expect(screen.getByText('Phase 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Move phase 2 up' }))
    const imgs = screen.getAllByLabelText('Image')
    fireEvent.change(imgs[0], { target: { value: 'https://x/p.png' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Describe the image.')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
    fireEvent.change(imgs[0], { target: { value: '' } })
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Add phase' }))
    expect(screen.getByRole('button', { name: 'Add phase' })).toBeDisabled()
    expect(screen.getAllByText('Up to 8.').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalled())
    const body = vi.mocked(api.put).mock.calls[0][1] as { case_study: { process: { title: string }[] } }
    expect(body.case_study.process.map((p) => p.title)).toEqual(['B', 'A', 'C'])
  })

  it('maps a case_study 400 path to the item and switches tab', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValueOnce({ response: { status: 400, data: { success: false, error: 'Invalid input', details: [{ path: 'case_study.process[0].title', msg: 'Too fancy.' }] } } })
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit LunaLore' }))
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Too fancy.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Case study/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('confirms delete by name; Keep it sends nothing', async () => {
    const user = userEvent.setup()
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit LunaLore' }))
    await user.click(await screen.findByRole('button', { name: 'Delete project' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(api.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete project' }))
    const c = screen.getByRole('alertdialog', { name: 'Delete LunaLore?' })
    await user.click(within(c).getByRole('button', { name: 'Delete project' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/projects/1'))
    expect(await screen.findByRole('status')).toHaveTextContent('Deleted LunaLore')
  })

  it('keeps the dialog open and disabled while saving; Esc does nothing', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockImplementation(() => new Promise(() => {}))
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Edit LunaLore' }))
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
