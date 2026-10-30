/// <reference types="cypress" />
import { ADMIN_URL, mock } from './mockApi'

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Whole-text match, ignoring surrounding whitespace. */
export const exact = (s: string) => new RegExp('^\\s*' + esc(s) + '\\s*$')
export const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

export const state = {
  token: false,
  /** Every console call the app made, serialised (for the no-leak check). */
  console: [] as string[],
  /** 'ok' | 'fail' | null: stub navigator.clipboard.writeText before load. */
  clipboard: null as null | 'ok' | 'fail',
  copied: [] as string[],
  opened: [] as unknown[][],
}

export const visitAdmin = (path: string) => {
  cy.visit(ADMIN_URL + path, {
    onBeforeLoad(win) {
      if (state.token) win.localStorage.setItem('auth_token', 'test-access-token-123')
      else win.localStorage.removeItem('auth_token')
      ;(win as any).__qaNoReload = true
      ;(['log', 'info', 'warn', 'error', 'debug'] as const).forEach((k) => {
        const orig = win.console[k].bind(win.console)
        win.console[k] = (...args: unknown[]) => {
          state.console.push(args.map((a) => { try { return typeof a === 'string' ? a : JSON.stringify(a) } catch { return String(a) } }).join(' '))
          orig(...args)
        }
      })
      win.open = ((...args: unknown[]) => {
        state.opened.push(args)
        return null
      }) as typeof win.open
      if (state.clipboard) {
        const mode = state.clipboard
        Object.defineProperty(win.navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: (t: string) => {
              state.copied.push(t)
              return mode === 'ok' ? Promise.resolve() : Promise.reject(new Error('denied'))
            },
          },
        })
      }
    },
  })
}

/** The topmost open dialog (confirm on top of editor), or the document. */
export const scope = () =>
  cy.get('body').then(($b) => {
    const d = $b.find('[role="alertdialog"]:visible, [role="dialog"]:visible').not('.ad-sheet:hidden')
    return d.length ? cy.wrap(d.last()) : cy.wrap($b)
  })

const CONTROLS = 'button, a, [role="tab"], [role="switch"], summary'

/** A control by its exact accessible name: aria-label first, then exact text. */
export const control = (name: string, within?: () => Cypress.Chainable<JQuery<HTMLElement>>) =>
  (within ? within() : scope()).then(($s) => {
    const byAria = $s.find(CONTROLS).filter((_, el) => el.getAttribute('aria-label') === name)
    if (byAria.length) return cy.wrap(byAria.filter(':visible').first().length ? byAria.filter(':visible').first() : byAria.first())
    const byText = $s.find(CONTROLS).filter((_, el) => norm(el.textContent || '') === name)
    if (byText.length) return cy.wrap(byText.filter(':visible').first().length ? byText.filter(':visible').first() : byText.first())
    // retrying fallback (element may still be rendering)
    return cy.wrap($s).contains(CONTROLS, exact(name))
  })

/** A form control by its <label> text (exact), inside the current scope. */
export const field = (label: string) =>
  scope().then(($s) => {
    return cy
      .wrap($s)
      .contains('label', exact(label))
      .then(($l) => {
        const id = $l.attr('for')
        if (id) return cy.get(`[id="${id}"]`)
        return cy.wrap($l).find('input, textarea, select').first()
      })
  })

export const toast = () => cy.get('.toast[role="status"]')

/** Retry until there is a matching logged request, then yield the last one. */
export const lastCall = (method: string, path: string) =>
  cy
    .wrap(null, { timeout: 8000 })
    .should(() => {
      expect(mock.calls(method, path), `${method} ${path} sent`).to.have.length.greaterThan(0)
    })
    .then(() => {
      const c = mock.calls(method, path)
      return c[c.length - 1]
    })

export const noCall = (method: string, path: string | RegExp, waitMs = 600) => {
  cy.wait(waitMs)
  cy.wrap(null).then(() => {
    expect(mock.calls(method, path), `${method} ${path} must not be sent`).to.have.length(0)
  })
}

/** Partial deep match: every key in `expected` equals the actual value (arrays and nested objects compared deeply). */
export const expectIncludes = (actual: any, expected: any) => {
  Object.keys(expected).forEach((k) => {
    expect(actual, `body has ${k}`).to.have.property(k)
    expect(actual[k], `body.${k}`).to.deep.equal(expected[k])
  })
}

export const setPath = (obj: any, path: string, value: any) => {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let o = obj
  parts.slice(0, -1).forEach((p) => (o = o[p]))
  o[parts[parts.length - 1]] = value
}

export const noHorizontalScroll = () =>
  cy.document().then((doc) => {
    const w = doc.documentElement.clientWidth
    expect(doc.documentElement.scrollWidth, 'document scrollWidth').to.be.at.most(w)
    expect(doc.body.scrollWidth, 'body scrollWidth').to.be.at.most(w)
  })
