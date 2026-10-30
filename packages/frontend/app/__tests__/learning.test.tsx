import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LearningClient from '../learning/learning-client'

const items = [
  { id: 1, title: 'Bootcamp', status: 'in_progress', progress: 19 },
  { id: 2, title: 'Paused course', status: 'paused', progress: 40 },
  { id: 3, title: 'Finished', status: 'completed', progress: 100 },
]

describe('Learning', () => {
  it('renders courses with percentages and skills by category', () => {
    render(<LearningClient learning={items as any} skills={[{ id: 1, name: 'TypeScript', category: 'Languages', level: 'Advanced' }] as any} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('My learning journey')
    expect(screen.getByText('19%')).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByText('Languages')).toBeInTheDocument()
  })

  it('shows a note when skills could not load', () => {
    render(<LearningClient learning={items as any} skills={null} />)
    expect(screen.getByRole('note')).toHaveTextContent("couldn't load skills")
    expect(screen.getByText('Bootcamp')).toBeInTheDocument()
  })
})
