/// <reference types="cypress" />
import { DataTable, Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { exact, norm } from './helpers'

Then('the admin sees that the KPIs read:', (t: DataTable) => {
  const want = t.raw()
  cy.get('.kpis .kpi').should('have.length', want.length).and(($k) => {
    want.forEach(([label, value, caption], i) => {
      const k = $k.eq(i)
      expect(norm(k.find('.kpi-l').text()), `kpi ${i + 1} label`).to.eq(label)
      expect(norm(k.find('.kpi-v').text()), `${label} value`).to.eq(value)
      expect(norm(k.find('.kpi-c').text()), `${label} caption`).to.eq(caption)
    })
  })
})

const sw = (name: string) =>
  cy.get('[role="switch"]').filter((_, s) => s.getAttribute('aria-label') === name || norm(s.textContent || '').startsWith(name)).first()

const attentionRows = () => cy.contains('h2', 'Needs attention').closest('section').find('ul.rows > li')

Then('the admin sees that the Needs attention count reads {string}', (n: string) => {
  cy.contains('h2', 'Needs attention').should(($h) => expect(norm($h.text())).to.eq('Needs attention ' + n))
})

Then('the admin sees that the Needs attention rows read, in order:', (t: DataTable) => {
  const want = t.raw()
  attentionRows().should('have.length', want.length).and(($r) => {
    want.forEach(([title, detail, pill, action], i) => {
      const r = $r.eq(i)
      expect(norm(r.find('.r1').text()), `row ${i + 1} title`).to.eq(title)
      expect(norm(r.find('.r2').text()), `row ${i + 1} detail`).to.contain(detail)
      expect(norm(r.find('.pill').text()), `row ${i + 1} pill`).to.eq(pill)
      expect(norm(r.find('a, button').last().text()), `row ${i + 1} action`).to.eq(action)
    })
  })
})

Then('the admin sees that the Needs attention rows include {string} with {string} and the pill {string}', (title: string, detail: string, pill: string) => {
  attentionRows().should(($r) => {
    const row = $r.toArray().find((r) => norm(r.querySelector('.r1')?.textContent || '') === title)
    expect(row, title).to.exist
    expect(norm(row!.querySelector('.r2')!.textContent || '')).to.eq(detail)
    expect(norm(row!.querySelector('.pill')!.textContent || '')).to.eq(pill)
  })
})

Then('the admin sees that the CV PDF row reads {string}', (s: string) => {
  cy.contains('dt', exact('PDF for download')).next('dd').should(($d) => expect(norm($d.text())).to.eq(s))
})

When('the admin clicks the header button {string}', (name: string) => {
  cy.get('.ad-head').contains('a, button', exact(name)).click()
})

Then('the admin sees that the switch {string} is off', (name: string) => {
  sw(name).should('have.attr', 'aria-checked', 'false')
})

Then('the admin sees that the switch {string} is on', (name: string) => {
  sw(name).should('have.attr', 'aria-checked', 'true')
})

Then('the admin sees that the KPI strip has {int} columns', (n: number) => {
  cy.get('.kpis .kpi').should('have.length', 5).then(($k) => {
    const lefts = new Set($k.toArray().map((k) => Math.round(k.getBoundingClientRect().left)))
    expect(lefts.size).to.eq(n)
  })
})

Then('the admin sees that the Needs attention pills are hidden', () => {
  attentionRows().find('.pill').each(($p) => expect($p).not.to.be.visible)
})
