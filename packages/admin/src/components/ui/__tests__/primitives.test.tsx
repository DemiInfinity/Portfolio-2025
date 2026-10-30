import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dialog from '../Dialog'
import ConfirmDialog from '../ConfirmDialog'
import { ToastProvider, useToast } from '../Toast'
import Switch from '../Switch'
import Segmented from '../Segmented'
import Field from '../Field'

function DialogHarness({ saving = false }: { saving?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Dialog title="Edit thing" onClose={() => setOpen(false)} saving={saving} footer={<button type="submit">Save</button>}>
          <input aria-label="First" />
          <p>Inside</p>
        </Dialog>
      )}
    </>
  )
}

describe('Dialog', () => {
  it('closes on Esc and returns focus to the opener', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const opener = screen.getByText('Open')
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on a scrim click but not on a click inside', async () => {
    const user = userEvent.setup()
    const { container } = render(<DialogHarness />)
    await user.click(screen.getByText('Open'))
    await user.click(screen.getByText('Inside'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(container.querySelector('.scrim')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ignores Close, Esc and the scrim while saving', async () => {
    const user = userEvent.setup()
    const { container } = render(<DialogHarness saving />)
    await user.click(screen.getByText('Open'))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    fireEvent.click(container.querySelector('.scrim')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('moves focus in on open and wraps Tab from the last control to the first', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    await user.click(screen.getByText('Open'))
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toHaveFocus()
    screen.getByRole('button', { name: 'Save' }).focus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  })
})

describe('ConfirmDialog', () => {
  it('focuses "Keep it" on open; Keep it cancels without confirming', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Delete LunaLore?" description="Gone." confirmLabel="Delete project" onConfirm={onConfirm} onCancel={onCancel} />)
    const dlg = screen.getByRole('alertdialog', { name: 'Delete LunaLore?' })
    expect(dlg).toHaveClass('dialog', 'slim')
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Delete project' })).toHaveClass('btn-negfill')
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

function ToastHarness() {
  const { say } = useToast()
  return (
    <>
      <button onClick={() => say('A')}>A</button>
      <button onClick={() => say('B')}>B</button>
    </>
  )
}

describe('Toast', () => {
  afterEach(() => vi.useRealTimers())

  it('shows only the latest message and hides after 2400 ms', () => {
    vi.useFakeTimers()
    render(<ToastProvider><ToastHarness /></ToastProvider>)
    fireEvent.click(screen.getByText('A'))
    fireEvent.click(screen.getByText('B'))
    const toasts = screen.getAllByRole('status')
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toHaveTextContent('B')
    act(() => { vi.advanceTimersByTime(2399) })
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

function SwitchHarness() {
  const [on, setOn] = useState(false)
  return <Switch checked={on} onChange={setOn}>Open to work badge</Switch>
}

describe('Switch', () => {
  it('toggles aria-checked on click, Space and Enter', async () => {
    const user = userEvent.setup()
    render(<SwitchHarness />)
    const sw = screen.getByRole('switch', { name: 'Open to work badge' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.keyboard(' ')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.keyboard('{Enter}')
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Segmented', () => {
  it('marks the chosen option with aria-pressed and shows counts', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Segmented aria-label="Filter by status" value="all" onChange={onChange} options={[{ value: 'all', label: 'All', count: 3 }, { value: 'done', label: 'Completed', count: 1 }]} />)
    expect(screen.getByRole('group', { name: 'Filter by status' })).toHaveClass('seg')
    expect(screen.getByRole('button', { name: 'All 3' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Completed 1' }))
    expect(onChange).toHaveBeenCalledWith('done')
  })
})

describe('Field', () => {
  it('sets aria-invalid and aria-describedby on error', () => {
    render(<Field label="Title" error="Give the project a title." hint="A hint">{(p) => <input {...p} />}</Field>)
    const input = screen.getByLabelText('Title')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('input', 'err')
    expect(input).toHaveAccessibleDescription('Give the project a title. A hint')
  })
})
