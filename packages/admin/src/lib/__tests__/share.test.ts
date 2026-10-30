import { describe, it, expect } from 'vitest'
import { counterLabel, hashtags, isOver, linkedInShareUrl, publicUrl, starterText, type ShareItem } from '../share'

const SITE = 'https://www.demitaylornimmo.com'
const POST: ShareItem = {
  kind: 'post',
  title: 'How I Built Automatic Updates Into a Desktop App (Without the Headache)',
  slug: 'automatic-updates-desktop-app',
  summary: 'I wanted updates to just work.',
  tags: ['Velopack', 'C#', 'Avalonia'],
  image: null,
}

describe('share', () => {
  it('builds public URLs for posts and projects', () => {
    expect(publicUrl('post', 'automatic-updates-desktop-app', SITE)).toBe('https://www.demitaylornimmo.com/blog/automatic-updates-desktop-app')
    expect(publicUrl('project', 'lunalore', SITE + '/')).toBe('https://www.demitaylornimmo.com/projects/lunalore')
  })

  it('encodes the URL for the LinkedIn share link', () => {
    expect(linkedInShareUrl('https://www.demitaylornimmo.com/blog/a-b?x=1&y=2')).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.demitaylornimmo.com%2Fblog%2Fa-b%3Fx%3D1%26y%3D2',
    )
  })

  it('sanitises hashtags', () => {
    expect(hashtags(['Velopack', 'C# / .NET', 'AWS Lambda', 'Micro-frontends', '  ', 'velopack', 'Node.js'])).toBe('#Velopack #CNET #AWSLambda #Microfrontends #Nodejs')
    expect(hashtags([])).toBe('')
  })

  it('builds the three starters from the design', () => {
    const url = 'https://www.demitaylornimmo.com/blog/automatic-updates-desktop-app'
    expect(starterText(POST, 'announce', SITE)).toBe(`New post: ${POST.title}\n\nI wanted updates to just work.\n\nRead it here: ${url}\n\n#Velopack #C #Avalonia`)
    expect(starterText(POST, 'lesson', SITE)).toBe(`Something I learned the hard way, written up:\n\nI wanted updates to just work.\n\n${url}\n\n#Velopack #C #Avalonia`)
    expect(starterText(POST, 'short', SITE)).toBe(`${POST.title}\n${url}`)
  })

  it('skips empty parts and uses project wording', () => {
    const p: ShareItem = { kind: 'project', title: 'LunaLore', slug: 'lunalore', summary: '', tags: [], image: null }
    expect(starterText(p, 'announce', SITE)).toBe('New project: LunaLore\n\nSee it here: https://www.demitaylornimmo.com/projects/lunalore')
  })

  it('counts characters against 3,000', () => {
    expect(counterLabel('x'.repeat(3000))).toBe('3,000 / 3,000 characters')
    expect(isOver('x'.repeat(3000))).toBe(false)
    expect(isOver('x'.repeat(3001))).toBe(true)
  })
})
