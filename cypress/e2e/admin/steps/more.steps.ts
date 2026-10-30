/// <reference types="cypress" />
import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { mock } from './mockApi'
import { exact, lastCall, norm } from './helpers'

const group = (title: string) => cy.get(`[role="group"][aria-label="Change progress for ${title}"]`)

When('the admin steps {string} for {string}', (btn: string, title: string) => {
  group(title).find(`button[aria-label="${btn}"]`).click()
})

Then('the admin sees the progress for {string} reads {string}', (title: string, pct: string) => {
  group(title).find('output').should(($o) => expect(norm($o.text())).to.eq(pct))
})

When('the admin clicks the tab starting {string}', (label: string) => {
  cy.get('[role="tab"]').filter((_, t) => norm(t.textContent || '').startsWith(label)).first().click()
})

Then('the admin sees the header button {string}', (label: string) => {
  cy.get('.ad-head').contains('button, a', exact(label)).should('be.visible')
})

Then('the admin sees every visible row has the pill {string}', (pill: string) => {
  cy.get('ul.rows > li.row').filter(':visible').each(($r) => expect(norm($r.find('.pill').text())).to.eq(pill))
})

Then('the admin sees the stepper and Edit for {string} are visible and the bar is hidden', (title: string) => {
  group(title).should('be.visible').find('button').should('be.visible')
  cy.get(`button[aria-label="Edit ${title}"]`).should('be.visible')
  group(title).closest('li').find('[role="progressbar"]').should('not.be.visible')
})

Then('the admin sees the preview shows the {string} pill', (t: string) => {
  cy.contains('h2', 'What visitors see now').closest('section').find('.pill').filter((_, p) => norm(p.textContent || '') === t).should('have.length', 1)
})

Then('the admin sees the preview does not show the {string} pill', (t: string) => {
  cy.contains('h2', 'What visitors see now').closest('section').should(($s) => {
    expect($s.find('.pill').filter((_, p) => norm(p.textContent || '') === t).length).to.eq(0)
  })
})

// ---- settings
Given('the admin API returns the CV status {string} after a rebuild', (json: string) => {
  cy.wrap(null).then(() => mock.on('POST', /^\/cv\/regenerate$/, (_r, db) => {
    db.cvStatus = JSON.parse(json)
    return undefined
  }))
})

Then('the admin sees the page has no file input', () => {
  cy.get('main').should('be.visible')
  cy.get('input[type="file"]').should('not.exist')
})

Then('the admin sees the {string} link goes to {string}', (name: string, href: string) => {
  cy.contains('a', exact(name)).should('have.attr', 'href', href)
})

When('the admin sees that the CV status becomes idle after the next poll', () => {
  cy.wrap(null).then(() => {
    const n = mock.calls('GET', '/cv/status').length
    ;(mock as any).pollMark = n
    mock.db.cvStatus = { ...mock.db.cvStatus, state: 'idle', startedAt: null }
  })
})

Then('the admin sees {string} within {int} seconds', (text: string, s: number) => {
  cy.contains(text, { timeout: s * 1000 }).should('be.visible')
})

Then('the admin sees the CV status stops polling', () => {
  cy.wrap(null).then(() => ((mock as any).afterIdle = mock.calls('GET', '/cv/status').length))
  cy.wait(4000)
  cy.wrap(null).then(() => expect(mock.calls('GET', '/cv/status').length, 'no more polls once idle').to.eq((mock as any).afterIdle))
})

// ---- analytics
Then('the admin sees the analytics KPIs read {string}, {string}, {string} and {string}', (a: string, b: string, c: string, d: string) => {
  cy.get('.kpis .kpi').should('have.length', 4).and(($k) => {
    const vals = $k.toArray().map((k) => norm(k.querySelector('.kpi-v')?.textContent || ''))
    expect(vals).to.deep.eq([a, b, c, d])
  })
})

Then('the admin sees the last GET to {string} had the query {string}', (path: string, q: string) => {
  const [k, v] = q.split('=')
  lastCall('GET', path).then((c) => expect(c.query[k]).to.eq(v))
})

Then('the admin sees there are {int} bar buttons', (n: number) => {
  cy.get('.bars button').should('have.length', n)
})

Then('the admin sees the bar {string} has the class {string}', (name: string, cls: string) => {
  cy.get(`.bars button[aria-label="${name}"]`).should('have.class', cls)
  cy.get(`.bars button.${cls}`).should('have.length', 1)
})

When('the admin focuses the bar {string}', (name: string) => {
  cy.get(`.bars button[aria-label="${name}"]`).focus()
})

Then('the admin sees the referrer list reads {string}', (list: string) => {
  cy.get('ul.blist > li').should(($li) => {
    const names = $li.toArray().map((l) => norm((l.querySelector('span') as HTMLElement)?.textContent || ''))
    expect(names).to.deep.eq(list.split(', '))
  })
})

Then('the admin sees the pill {string} in full', (text: string) => {
  cy.get('.pill').filter((_, p) => norm(p.textContent || '') === text).should('have.length', 1).then(($p) => {
    const el = $p[0]
    expect(el.scrollWidth, 'pill text not clipped').to.be.at.most(el.clientWidth + 1)
    expect(el.getBoundingClientRect().right, 'pill inside the viewport').to.be.at.most(el.ownerDocument.documentElement.clientWidth)
    let a: HTMLElement | null = el.parentElement
    while (a && a.tagName !== 'LI') {
      if (getComputedStyle(a).overflow !== 'visible') expect(a.scrollWidth, 'container not clipping the pill').to.be.at.most(a.clientWidth + 1)
      a = a.parentElement
    }
  })
})
