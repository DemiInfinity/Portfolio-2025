/// <reference types="cypress" />
import { Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { exact, norm } from './helpers'

When('the admin clicks the segment {string}', (label: string) => {
  cy.get('.seg[role="group"] button').filter(':visible').filter((_, b) => norm(b.textContent || '').replace(/\s*\d+$/, '') === label).first().click()
})

When('the admin flips the switch {string}', (name: string) => {
  cy.get('[role="dialog"]:visible, main').last().find('[role="switch"]').filter((_, s) => norm(s.textContent || '').startsWith(name) || s.getAttribute('aria-label') === name).first().click()
})

When('the admin clicks the confirm button {string}', (name: string) => {
  cy.get('[role="alertdialog"]').contains('button', exact(name)).click()
})

Then('the admin sees that exactly {int} row reads {string}', (n: number, text: string) => {
  cy.get('ul.rows > li.row').should(($r) => {
    const hits = $r.toArray().filter((r) => Array.from(r.querySelectorAll('*')).some((e) => e.children.length === 0 && norm(e.textContent || '') === text))
    expect(hits.length).to.eq(n)
  })
})

Then('the admin sees that the row {string} reads {string}', (title: string, r2: string) => {
  cy.get('ul.rows > li.row').should(($r) => {
    const row = $r.toArray().find((r) => norm(r.querySelector('.r1')?.textContent || '') === title)
    expect(row, title).to.exist
    expect(norm(row!.querySelector('.r2')?.textContent || '')).to.eq(r2)
  })
})

Then('the admin sees that the case study has {int} {string} items', (n: number, kind: string) => {
  cy.get('[role="dialog"] .item-head').should(($h) => {
    const k = $h.toArray().filter((h) => new RegExp('^' + kind + ' \\d+').test(norm(h.textContent || '')))
    expect(k.length).to.eq(n)
  })
})

Then('the admin sees that the dialog tabs fit or scroll inside the dialog', () => {
  cy.get('[role="dialog"] [role="tablist"]').should('be.visible').then(($t) => {
    const dlg = $t.closest('[role="dialog"]')[0].getBoundingClientRect()
    const t = $t[0]
    const r = t.getBoundingClientRect()
    expect(r.right, 'tablist inside the dialog').to.be.at.most(dlg.right + 1)
    if (t.scrollWidth > t.clientWidth) expect(getComputedStyle(t).overflowX).to.match(/auto|scroll/)
  })
  cy.get('[role="dialog"]').then(($d) => expect($d[0].getBoundingClientRect().right).to.be.at.most(391))
})
