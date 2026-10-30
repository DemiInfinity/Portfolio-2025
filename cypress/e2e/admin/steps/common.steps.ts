/// <reference types="cypress" />
import { Given, When, Then, DataTable } from '@badeball/cypress-cucumber-preprocessor'
import { installMockApi, mock } from './mockApi'
import {
  control,
  exact,
  expectIncludes,
  field,
  lastCall,
  noCall,
  noHorizontalScroll,
  norm,
  setPath,
  state,
  toast,
  visitAdmin,
} from './helpers'

// ---------- setup ----------
Given('the admin API serves the content fixture', () => {
  state.token = false
  state.console = []
  state.clipboard = null
  state.copied = []
  state.opened = []
  cy.viewport(1440, 900)
  installMockApi()
})

Given('the admin fixture has {string} set to {string}', (path: string, json: string) => {
  cy.wrap(null).then(() => setPath(mock.db, path, JSON.parse(json)))
})

Given('today is {string} for the admin', (iso: string) => {
  cy.clock(new Date(iso).getTime(), ['Date'])
  cy.wrap(null).then(() => (mock.now = new Date(iso).getTime()))
})

Given('the admin is signed in', () => {
  state.token = true
  cy.wrap(null).then(() => (mock.signedIn = true))
})

Given('the admin screen is {int} by {int}', (w: number, h: number) => {
  cy.viewport(w, h)
})

Given('the admin API answers {word} {string} with status {int} and body {string}', (method: string, path: string, status: number, body: string) => {
  cy.wrap(null).then(() =>
    mock.on(method, new RegExp('^' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), () => ({ statusCode: status, body: JSON.parse(body) })),
  )
})

Given('the admin API delays {word} {string} by {int} ms', (method: string, path: string, ms: number) => {
  cy.wrap(null).then(() => (mock.delays[method.toUpperCase() + ' ' + path] = ms))
})

When('the admin opens {string}', (path: string) => {
  visitAdmin(path)
  if (state.token) cy.get('main', { timeout: 15000 }).should('exist')
  else cy.get('form', { timeout: 15000 }).should('exist')
})

// ---------- actions ----------
When('the admin clicks {string}', (name: string) => {
  control(name).should('be.visible').click()
})

When('the admin clicks {string} in the sidebar', (name: string) => {
  cy.get('.ad-side, nav').contains('a', exact(name)).click()
})

When('the admin types {string} into {string}', (text: string, label: string) => {
  field(label).clear().type(text, { delay: 10 })
})

When('the admin replaces {string} with {string}', (label: string, text: string) => {
  field(label).clear().type(text, { delay: 10 })
})

When('the admin clears {string}', (label: string) => {
  field(label).clear()
})

When('the admin types into {string}:', (label: string, doc: string) => {
  field(label).clear().type(doc.replace(/\n/g, '{enter}'), { delay: 10 })
})

When('the admin presses Escape', () => {
  cy.focused().type('{esc}')
})

When('the admin types {string} into the top search', (text: string) => {
  cy.get('form[role="search"] input').filter(':visible').first().clear().type(text, { delay: 10 })
})

When('the admin waits {int} ms', (ms: number) => {
  cy.wait(ms)
})

// ---------- checks ----------
Then('the admin sees {string}', (text: string) => {
  cy.contains(text, { matchCase: true }).should('be.visible')
})

Then('the admin does not see {string}', (text: string) => {
  cy.contains(text).should('not.exist')
})

Then('the admin sees no text {string} on the page', (text: string) => {
  cy.get('body').should(($b) => expect($b.text()).not.to.contain(text))
})

Then('the admin sees that the h1 reads {string}', (text: string) => {
  cy.get('h1').filter(':visible').first().should(($h) => expect(norm($h.text())).to.eq(text))
})

Then('the admin sees that the sub line reads {string}', (text: string) => {
  cy.get('.ad-sub').filter(':visible').first().should(($s) => expect(norm($s.text())).to.eq(text))
})

Then('the admin sees that the toast reads {string}', (text: string) => {
  toast().should(($t) => expect(norm($t.text())).to.eq(text))
})

Then('the admin sees that a dialog titled {string} is open', (title: string) => {
  cy.get('[role="dialog"], [role="alertdialog"]')
    .filter(':visible')
    .should(($d) => {
      const titles = $d
        .toArray()
        .map((d) => {
          const id = d.getAttribute('aria-labelledby')
          const t = id ? d.ownerDocument.getElementById(id) : null
          return norm(t?.textContent || d.getAttribute('aria-label') || '')
        })
      expect(titles).to.include(title)
    })
})

Then('the admin sees that no dialog is open', () => {
  cy.get('[role="dialog"]:visible, [role="alertdialog"]:visible').should('not.exist')
})

Then('the admin sees that the confirm reads {string}', (title: string) => {
  cy.get('[role="alertdialog"]').should('be.visible').and(($d) => {
    const id = $d.attr('aria-labelledby')
    const t = id ? $d[0].ownerDocument.getElementById(id) : $d.find('h2')[0]
    expect(norm(t?.textContent || '')).to.eq(title)
  })
})

Then('the admin sees that the confirm text includes {string}', (text: string) => {
  cy.get('[role="alertdialog"]').should(($d) => expect(norm($d.text())).to.contain(text))
})

Then('the admin sees that no {word} request was sent to {string}', (method: string, path: string) => {
  noCall(method, path)
})

Then('the admin sees that no {word} request was sent at all', (method: string) => {
  noCall(method, /.*/)
})

Then('the admin sees that a {word} request was sent to {string}', (method: string, path: string) => {
  lastCall(method, path)
})

Then('the admin sees that {int} {word} requests were sent to {string}', (n: number, method: string, path: string) => {
  cy.wait(600)
  cy.wrap(null).should(() => expect(mock.calls(method, path)).to.have.length(n))
})

Then('the admin sees that the last {word} to {string} had the body:', (method: string, path: string, doc: string) => {
  lastCall(method, path).then((c) => expectIncludes(c.body, JSON.parse(doc)))
})

Then('the admin sees that the last {word} to {string} had no {string} key', (method: string, path: string, key: string) => {
  lastCall(method, path).then((c) => expect(c.body || {}).not.to.have.property(key))
})

Then('the admin sees that the URL path is {string}', (p: string) => {
  cy.location('pathname').should('eq', p)
})

Then('the admin sees that the URL search is {string}', (s: string) => {
  cy.location('search').should('eq', s)
})

Then('the admin sees that the page has no horizontal scroll', () => {
  noHorizontalScroll()
})

Then('the admin sees that the page did not reload', () => {
  cy.window().its('__qaNoReload').should('eq', true)
})

Then('the admin sees that the field {string} shows the error {string}', (label: string, msg: string) => {
  field(label).should('have.attr', 'aria-invalid', 'true').then(($c) => {
    const ids = ($c.attr('aria-describedby') || '').split(/\s+/).filter(Boolean)
    const doc = $c[0].ownerDocument
    const texts = ids.map((id) => norm(doc.getElementById(id)?.textContent || ''))
    const near = norm($c.closest('.field, .fld, div').find('.err-text').text())
    expect([...texts, near].join(' | ')).to.contain(msg)
  })
})

Then('the admin sees that the field {string} has the value {string}', (label: string, v: string) => {
  field(label).should('have.value', v.replace(/\\n/g, '\n'))
})

Then('the admin sees that the field {string} is disabled', (label: string) => {
  field(label).should('be.disabled')
})

Then('the admin sees that the {string} control is disabled', (name: string) => {
  control(name).should('be.disabled')
})

Then('the admin sees that the {string} control is enabled', (name: string) => {
  control(name).should('not.be.disabled')
})

Then('the admin sees that the document title is {string}', (t: string) => {
  cy.title().should('eq', t)
})

Then('the admin sees that the rows read, in order:', (table: DataTable) => {
  const want = table.raw().map((r) => r[0])
  cy.get('ul.rows > li.row').filter(':visible').should(($rows) => {
    const got = $rows.toArray().map((r) => norm(r.textContent || ''))
    expect(got.length, 'row count').to.eq(want.length)
    want.forEach((w, i) => expect(got[i], `row ${i + 1}`).to.contain(w))
  })
})

Then('the admin sees that there are {int} visible rows', (n: number) => {
  cy.get('ul.rows > li.row').filter(':visible').should('have.length', n)
})

Then('the admin sees that no text on the page or in the title is an emoji', () => {
  cy.get('body').then(($b) => {
    const text = $b[0].innerText + ' ' + $b[0].ownerDocument.title
    const hits = text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/gu)
    expect(hits, 'emoji found: ' + (hits || []).join(' ')).to.eq(null)
  })
})

Then('the admin sees that the segment {string} shows the count {string}', (label: string, n: string) => {
  cy.get('.seg[role="group"] button').filter(':visible').should(($b) => {
    const btn = $b.toArray().find((b) => norm(b.textContent || '').startsWith(label))
    expect(btn, `segment ${label}`).to.exist
    expect(norm(btn!.querySelector('.n')?.textContent || '')).to.eq(n)
  })
})

