/// <reference types="cypress" />
import { Then } from '@badeball/cypress-cucumber-preprocessor'
import { lastCall, norm } from './helpers'

Then('the admin sees the last PUT to {string} has exactly the keys {string}', (path: string, keys: string) => {
  lastCall('PUT', path).then((c) => expect(Object.keys(c.body).sort()).to.deep.eq(keys.split(', ').sort()))
})

Then('the admin sees the last PUT to {string} has {int} intro paragraphs', (path: string, n: number) => {
  lastCall('PUT', path).then((c) => {
    expect(c.body.intro).to.have.length(n)
    c.body.intro.forEach((p: unknown) => expect(p).to.be.a('string'))
  })
})

Then('the admin sees the About row {string} with the pill {string}', (title: string, pill: string) => {
  cy.contains('section.set h2', title).closest('section.set').find('.pill').should(($p) => expect(norm($p.first().text())).to.eq(pill))
})

Then('the admin sees the About rows stacked', () => {
  cy.get('section.set').first().then(($s) => {
    const [left, right] = $s.children().toArray()
    expect(right.getBoundingClientRect().top, 'panel below the title').to.be.at.least(left.getBoundingClientRect().bottom - 1)
  })
})

Then('the admin sees the tab {string}', (label: string) => {
  const [name, n] = [label.replace(/\s*\d+$/, ''), (label.match(/(\d+)$/) || [])[1]]
  cy.get('[role="tab"]').should(($t) => {
    const tab = $t.toArray().find((t) => norm(Array.from(t.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent).join('')) === name)
    expect(tab, 'tab ' + name).to.exist
    expect(norm(tab!.querySelector('.n')?.textContent || '')).to.eq(n)
  })
})

Then('the admin sees the first recommendation is from {string}', (name: string) => {
  cy.get('ul.rows > li.row').first().should(($r) => expect(norm($r.find('.r2').text())).to.match(new RegExp('^' + name)))
})
