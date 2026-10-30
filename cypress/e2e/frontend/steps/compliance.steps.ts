/// <reference types="cypress" />
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { accName, byName, norm, rendered } from '../../../support/frontend/site'

Given('the visitor records requests to supabase.co', () => {
  cy.intercept({ url: /supabase\.co/ }).as('supabase')
})

When('the visitor scrolls through the page', () => {
  cy.window().then((win) => {
    const h = win.document.documentElement.scrollHeight
    for (let y = 0; y <= h; y += 600) cy.scrollTo(0, y, { ensureScrollable: false, log: false })
  })
  cy.wait(800)
})

Then('no request went to supabase.co', () => {
  cy.get('@supabase.all').should('have.length', 0)
  cy.get('body').should(($b) => {
    const urls = [
      ...Array.from($b[0].ownerDocument.querySelectorAll('[src]')).map((e) => e.getAttribute('src') || ''),
      ...Array.from($b[0].ownerDocument.querySelectorAll('[href]')).map((e) => e.getAttribute('href') || ''),
      ...Array.from($b[0].ownerDocument.querySelectorAll('img')).map((e) => (e as HTMLImageElement).srcset || ''),
    ]
    expect(urls.filter((u) => u.includes('supabase.co')), 'supabase.co URLs in the page').to.deep.eq([])
  })
})

Then("every image source is on the site's own origin or the API", () => {
  cy.document().then((doc) => {
    const origin = doc.location.origin
    const bad = Array.from(doc.images)
      .map((img) => img.currentSrc || img.src)
      .filter((src) => src && !src.startsWith('data:'))
      .filter((src) => {
        const u = new URL(src, origin)
        return u.origin !== origin && u.origin !== 'http://localhost:4010'
      })
    expect(bad, 'images from other origins').to.deep.eq([])
  })
})

Then('no cookie is set', () => {
  cy.getAllCookies().should('have.length', 0)
})

Then('an image source starts with {string}', (prefix: string) => {
  cy.get('img').should(($i) => {
    const srcs = Array.from($i).map((img) => img.getAttribute('src') || '')
    expect(srcs.some((s) => s.startsWith(prefix) || s.includes(`${new URL(String(Cypress.config('baseUrl'))).host}${prefix}`)), `an img src starting ${prefix}: ${srcs.join(' | ')}`).to.eq(true)
  })
})

Then('the {string} link is same-origin under {string}', (name: string, prefix: string) => {
  byName(name, 'a').filter((_, el) => rendered(el)).should('have.length', 1).and(($a) => {
    const href = $a.attr('href') || ''
    const u = new URL(href, String(Cypress.config('baseUrl')))
    expect(u.origin, 'origin').to.eq(new URL(String(Cypress.config('baseUrl'))).origin)
    expect(u.pathname.startsWith(prefix), `path ${u.pathname}`).to.eq(true)
  })
})

function events(calls: any[]) {
  return calls.map((c) => (typeof c.request.body === 'string' ? JSON.parse(c.request.body) : c.request.body))
}

Then('the page_view events are for {string} with distinct view IDs', (paths: string) => {
  cy.get('@track.all').should((calls: any) => {
    const views = events(calls).filter((b) => b.event === 'page_view')
    expect(views.map((v) => v.page_path), 'page_view paths in order').to.deep.eq(paths.split(', '))
    expect(new Set(views.map((v) => v.view_id)).size, 'distinct view_ids').to.eq(views.length)
    views.forEach((v) => expect(v.view_id, 'uuid').to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i))
  })
})

Then('every view_update refers to an earlier page_view and is not a page_view', () => {
  cy.get('@track.all').then((calls: any) => {
    const all = events(calls)
    const seen = new Set<string>()
    all.forEach((b) => {
      if (b.event === 'page_view') seen.add(b.view_id)
      else {
        expect(b.event, 'event').to.eq('view_update')
        expect(seen.has(b.view_id), `view_update ${b.view_id} follows its page_view`).to.eq(true)
        expect(b.duration_seconds, 'duration_seconds').to.be.a('number')
      }
    })
  })
})

Then('the first page_view has utm_source {string}', (value: string) => {
  cy.get('@track.all').should((calls: any) => {
    const views = events(calls).filter((b) => b.event === 'page_view')
    expect(views.length).to.be.gte(1)
    expect(String(views[0].utm_source).toLowerCase()).to.eq(value)
  })
})

Then('the later page_views carry no utm_source and no referrer', () => {
  cy.get('@track.all').should((calls: any) => {
    const views = events(calls).filter((b) => b.event === 'page_view')
    expect(views.length, `page_views; all events: ${JSON.stringify(events(calls))}`).to.be.gte(2)
    views.slice(1).forEach((v) => {
      expect(v.utm_source, 'utm_source').to.be.undefined
      expect(v.referrer, 'referrer').to.be.undefined
    })
  })
})

Then('the URL has no query string', () => {
  cy.location('search').should('eq', '')
})

Then('localStorage {string} is set', (key: string) => {
  cy.window().should((win) => expect(win.localStorage.getItem(key)).not.to.eq(null))
})

Then('the page text includes each of {string}', (list: string) => {
  cy.get('body').should(($b) => {
    const t = norm($b[0].innerText)
    list.split(', ').forEach((x) => expect(t, x).to.contain(x))
  })
})

Then('the dialog has a link containing {string} to {string}', (name: string, href: string) => {
  cy.get(`[role="dialog"] a[href="${href}"]`).filter((_, el) => accName(el).includes(name)).should('have.length.gte', 1)
})
