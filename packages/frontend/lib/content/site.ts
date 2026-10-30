/**
 * Static site copy, word for word from the approved designs. Anything the API
 * serves is NOT here. One object per section so an endpoint can replace a
 * section later (owner decision D-1 makes the About text editable; that copy
 * will come from the API, not from this file).
 */

export const contact = {
  email: 'demi.21@outlook.com',
  github: 'https://github.com/DemiInfinity',
  githubHandle: 'DemiInfinity',
  linkedin: 'https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40',
  portfolio: 'https://www.demitaylornimmo.com',
  portfolioLabel: 'demitaylornimmo.com',
  location: 'UK · Remote',
} as const

export const person = {
  name: 'Demi Taylor Nimmo',
  shortName: 'Demi',
} as const

export const homeHero = {
  greeting: 'Hi, I’m',
  lead: 'Full-stack software engineer. I build every layer, and I make every layer lovely.',
  primaryCta: 'View my work',
  secondaryCta: 'Experience',
  openToWork: 'Open to work',
  illustrationLabel: 'Illustration of a full stack as three floating layers: interface, API and database',
  callouts: [
    { title: 'The interface', body: 'Angular, React, Next.js, StencilJS' },
    { title: 'The API', body: 'Node.js, Express, .NET, AWS Lambda' },
    { title: 'The data', body: 'PostgreSQL, SQLite, Supabase' },
  ],
  chips: ['Interface', 'API', 'Data'],
} as const

export const colourways = [
  { name: 'Lilac', c1: '#f472b6', c2: '#7c3aed', b1: '#7c3aed', b2: '#5b21b6', soft: '#e9d5ff' },
  { name: 'Rose', c1: '#ff6b9d', c2: '#c44569', b1: '#d6336c', b2: '#a61e4d', soft: '#ffb3ba' },
  { name: 'Moonlight', c1: '#5ec8ff', c2: '#3a6cf4', b1: '#2f6fe0', b2: '#1f4fb8', soft: '#cfe8ff' },
] as const

export type Colourway = (typeof colourways)[number]

export const marquee = ['Angular', 'Next.js', 'Node.js', 'PostgreSQL', '.NET', 'AWS', 'Electron', 'Storybook'] as const

export const homeContact = {
  title: 'Let’s work together',
  body: 'I’m always interested in new opportunities and exciting projects. Tell me what you’re building.',
} as const

export const experienceHero = {
  lead: 'Five years of full-stack work, from legacy .NET to micro-frontends, serverless and component libraries.',
  stats: ['−30% infrastructure costs', '−50% build times', '−60% data processing time', '99.9% uptime migration'],
} as const


export const author = {
  name: 'Demi Taylor Nimmo',
  role: 'Software Developer',
  cardTitle: 'Written by Demi',
  bio: 'Full-stack software engineer at Cintra HR & Payrolls. I build component libraries, MCP servers and pretty things.',
} as const

export const homeTeaser = {
  titleStart: 'Girly code,',
  titleScript: 'serious craft',
  body: 'I’m a software developer at Cintra HR & Payrolls, where I built the Angular component library the whole platform now runs on. Five years in, I still love the moment a hard problem turns into something beautiful.',
  portraitAlt: 'Portrait of Demi Taylor Nimmo, smiling softly, with long wavy brown hair',
  caption: 'that’s me',
  /** Fallbacks when work history / education can't be loaded. */
  yearsStat: '5+',
  yearsLabel: 'years building software',
  librariesStat: '2',
  librariesLabel: 'component libraries built',
  degreeStat: 'BSc',
  degreeLabel: 'Computer Science, Teesside',
} as const

/**
 * H-16 seed copy: used only when GET /api/content/about fails. The live text
 * is edited in the admin (D-1).
 */
export const aboutSeed = {
  intro: [
    'I’m Demi, a full-stack software engineer with five years of building real products: payroll platforms, learning platforms, desktop tools and, after hours, my own apps.',
    'I love the whole stack, but my heart is in the front end and the systems behind it: component libraries, design tokens and the small details that make an interface feel finished. These days I’m also deep into AI tooling, building MCP servers that help developers generate code that actually fits their design system.',
  ],
  looking_for: {
    summary: 'A remote role I can do from anywhere. I’m set up for remote work and open to working as a digital nomad.',
    items: [
      { label: 'Work style', value: 'Fully remote, digital nomad friendly' },
      { label: 'Roles', value: 'Full-stack or frontend-leaning engineer' },
      { label: 'Sweet spot', value: 'Design systems, component libraries, AI tooling' },
      { label: 'Based', value: 'UK, flexible across time zones' },
      { label: 'Also open to', value: 'Freelance projects' },
    ],
  },
  open_to_work_off_line: 'Happily at Cintra, always up for a chat',
  cv_headline: 'Full-stack Software Engineer',
  cv_profile: '',
  cv_ai_workflow: '',
  contact: {
    email: contact.email,
    linkedin_url: contact.linkedin,
    github_url: contact.github,
    portfolio_url: contact.portfolio,
    location: contact.location,
  },
  updated_at: null,
}

export const aboutPage = {
  portraitAlt: 'Portrait of Demi Taylor Nimmo with long wavy brown hair, wearing a white t-shirt',
  caption: 'hi, that’s me',
  /** The code card text. The design ends `vibe` with an emoji; it is dropped (no emoji anywhere). */
  code:
    "const demi = {\n  role: 'Full-stack software engineer',\n  now: 'Cintra HR & Payrolls',\n  loves: ['Angular', '.NET', 'PostgreSQL'],\n  building: ['LunaLore', 'Infinity Tracker'],\n  superpower: 'component libraries',\n  vibe: 'pink, always',\n};\n\nexport default demi;",
  codeLabel: 'Code describing Demi: a full-stack engineer who loves Angular, .NET and PostgreSQL, building LunaLore and Infinity Tracker',
  workWith: [
    { title: 'Frontend', body: 'Angular, StencilJS, React, Next.js, Vite, Storybook' },
    { title: 'Backend', body: 'C# and .NET Core, Node.js, Express, AWS Lambda' },
    { title: 'Data', body: 'PostgreSQL, SQL, Supabase, SQLite' },
    { title: 'Desktop & mobile', body: 'Electron, Avalonia, Android (Java), PWAs' },
  ],
  ai: {
    lead: 'AI-assisted, never AI-driven. I steer: the problem, the architecture and the final say stay with me. AI helps me get there faster and think more widely along the way.',
    quote: 'AI should make developers better, not replace their judgement.',
    flowTitle: 'Who’s driving, step by step',
    flow: [
      { who: 'Me', tone: 'me', title: 'Understand the problem', body: 'Talk to people, read the code, define what done means.' },
      { who: 'Me + AI input', tone: 'both', title: 'Plan the architecture', body: 'I design it; AI helps me poke holes and weigh options.' },
      { who: 'AI assists', tone: 'ai', title: 'Draft the code', body: 'AI speeds up the typing, with my patterns and my design system as context.' },
      { who: 'Me', tone: 'me', title: 'Review every line', body: 'Nothing ships that I don’t understand and can’t explain.' },
      { who: 'Me + AI', tone: 'both', title: 'Test it', body: 'AI suggests edge cases and drafts tests; I decide what good looks like.' },
      { who: 'Me', tone: 'me', title: 'Ship and own it', body: 'The decision, and the responsibility, are mine.' },
    ],
    toolkitTitle: 'My AI toolkit',
    toolkit: [
      { name: 'Claude', badge: 'Daily driver', badgeStyle: 'fill', body: 'My go-to, at work and at home: planning, pairing on code and thinking problems through.' },
      { name: 'Cursor', badge: 'Used before', badgeStyle: 'soft', body: 'AI pair-programming right inside the editor.' },
      { name: 'ChatGPT', badge: 'Chat, Codex soon', badgeStyle: 'rose', body: 'I use it for chat today, and I’m about to start using Codex at work.' },
    ],
    mcp: 'It’s why I built an MCP server at Cintra: so AI tools generate components that fit our design system, instead of guessing.',
  },
  people: {
    lead: 'The best things I’ve shipped came out of good teams. I like making the people around me faster: clear reviews, shared standards and plenty of pairing.',
    rows: [
      { value: '+25%', title: 'Team productivity', body: 'After mentoring junior developers and sharing Agile practices at 3T Global.' },
      { value: '1', title: 'Team founded', body: 'I started the component library team at Cintra, which now owns the platform’s UI.' },
      { value: '2', title: 'Shared standards introduced', body: 'Storybook and design tokens, so designers and developers speak the same language.' },
    ],
  },
  otherSelf: {
    imageAlt: 'Anime wolf girl with silver hair and blue eyes, the guide character from LunaLore',
    title: 'My other self',
    body: 'Online I’m also a cybernetic anime wolf girl called Demi: the guide who welcomes creators into LunaLore.',
    link: 'Meet her in the case study',
    href: '/projects/lunalore',
  },
  offKeyboard: {
    title: 'Off the keyboard',
    body: 'A former Teesside Wildcats cheerleader, forever in pink and purple, and happiest when a project has a bit of sparkle in it.',
    prompt: 'Want to build something together?',
  },
} as const

export const futureGoals = ['Advanced React patterns', 'Machine learning fundamentals', 'System design', 'Web3 development'] as const
