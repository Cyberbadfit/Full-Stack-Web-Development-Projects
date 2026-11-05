import { useEffect, useMemo, useState } from 'react'
import { fallbackProjects, type Project } from './data/projects'
import { getGithubData, type GithubProfile } from './lib/github'

const github = 'https://github.com/Cyberbadfit'
const navItems = ['Home', 'Projects', 'Contact']

function External({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}<span aria-hidden="true"> ↗</span></a>
}

function HeroOrb() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  return <div className="orb-wrap" aria-hidden="true" onPointerMove={(event) => {
    const rect = event.currentTarget.getBoundingClientRect(); setTilt({ x: (event.clientY - rect.top - rect.height / 2) / 15, y: (event.clientX - rect.left - rect.width / 2) / -15 })
  }} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
    <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="dust dust-one" /><div className="dust dust-two" />
    <div className="orb" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}><div className="orb-core">CB</div></div>
  </div>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('Home')
  const [filter, setFilter] = useState('All')
  const [projects, setProjects] = useState<Project[]>(fallbackProjects)
  const [profile, setProfile] = useState<GithubProfile>()
  const [apiStatus, setApiStatus] = useState<'loading' | 'live' | 'fallback'>('loading')
  const [loading, setLoading] = useState(true)

  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 420); return () => window.clearTimeout(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    getGithubData(controller.signal).then((data) => { setProjects(data.projects); setProfile(data.profile); setApiStatus(data.live ? 'live' : 'fallback') }).catch(() => setApiStatus('fallback'))
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.getAttribute('data-name') || 'Home') }), { rootMargin: '-40% 0px -50% 0px' })
    document.querySelectorAll('section[data-name]').forEach((section) => observer.observe(section)); return () => observer.disconnect()
  }, [])
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [])
  const categories = useMemo(() => ['All', ...Array.from(new Set(projects.map((project) => project.category)))], [projects])
  const shownProjects = filter === 'All' ? projects : projects.filter((project) => project.category === filter)
  const go = (label: string) => { document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  const year = new Date().getFullYear()

  return <>
    {loading && <div className="preloader" role="status" aria-label="Loading portfolio"><span>CYBERBADFIT</span><i /></div>}
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="progress" aria-hidden="true" />
    <header className="nav-shell">
      <a className="brand" href="#home" onClick={() => go('Home')} aria-label="CYBERBADFIT home"><b>CB</b><span>CYBERBADFIT</span></a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="primary-menu"><span /><span /><span /><em className="sr-only">Toggle navigation</em></button>
      <nav id="primary-menu" className={menuOpen ? 'open' : ''} aria-label="Primary navigation">
        {navItems.map((item) => <button className={active === item ? 'active' : ''} onClick={() => go(item)} key={item}>{item}</button>)}
        <button className="nav-cta" onClick={() => go('Contact')}>Let's Talk <span aria-hidden="true">↗</span></button>
      </nav>
    </header>
    <main id="main">
      <section id="home" data-name="Home" className="hero">
        <div className="grid-bg" /><div className="hero-copy">
          <p className="eyebrow hero-kicker"><span /> CYBERBADFIT / DIGITAL DEVELOPER</p>
          <h1>MAKE IT<br /><i>MOVE.</i><br />MAKE IT MATTER.</h1>
          <p className="lede">Interactive web experiences, built with intent.</p>
          <div className="actions"><button className="button primary" onClick={() => go('Projects')}>Explore my work <span>↓</span></button><button className="button ghost" onClick={() => go('Contact')}>Let's connect <span>↗</span></button></div>
          <External href={github} className="github-link">Visit GitHub profile</External>
        </div>
        <HeroOrb />
        <div className="hero-index"><span>SCROLL TO EXPLORE</span><i /></div>
      </section>
      <div className="marquee" aria-label="Design, develop, build, iterate"><div>DESIGN <b>✦</b> DEVELOP <b>✦</b> BUILD <b>✦</b> SHIP <b>✦</b> DESIGN <b>✦</b> DEVELOP <b>✦</b> BUILD <b>✦</b> SHIP <b>✦</b></div></div>
      <section id="projects" data-name="Projects" className="section projects"><div className="section-top"><div><p className="eyebrow"><span /> SELECTED WORK / 02</p><h2>Code with <i>presence.</i></h2></div><External href={`${github}?tab=repositories`} className="text-link">View all work</External></div><div className="filters" aria-label="Filter projects">{categories.map((category) => <button className={filter === category ? 'selected' : ''} onClick={() => setFilter(category)} key={category}>{category}</button>)}</div><div className="project-grid">{shownProjects.slice(0, 3).map((project, index) => <article className="project-card" key={project.url}><div className={`project-art art-${index % 4}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{project.language}</strong><div /></div><div className="project-meta"><small>{project.category} / {project.language}</small><h3>{project.name}</h3><p>{project.description}</p><div className="project-links"><External href={project.url}>Repository</External>{project.demo && <External href={project.demo}>Live site</External>}</div></div></article>)}</div>{!shownProjects.length && <p className="empty">No public projects in this category yet.</p>}</section>
      <section className="github-section" aria-labelledby="github-heading"><div><p className="eyebrow"><span /> OPEN SOURCE / 03</p><h2 id="github-heading">Built in<br /><i>public.</i></h2><External href={github} className="button primary">GitHub <span>↗</span></External></div><div className="stat-panel">{apiStatus === 'loading' ? <p>Retrieving public profile…</p> : <><div><b>{profile?.public_repos ?? '—'}</b><span>repositories</span></div><div><b>{profile?.followers ?? '—'}</b><span>followers</span></div><p>{apiStatus === 'live' ? 'Live profile signal.' : 'Verified fallback loaded.'}</p></>}</div></section>
      <section id="contact" data-name="Contact" className="section contact"><p className="eyebrow"><span /> CONTACT / 04</p><h2>Let’s make<br /><i>something sharp.</i></h2><External href={github} className="contact-link">github.com/Cyberbadfit <span>↗</span></External></section>
    </main>
    <footer><div className="brand"><b>CB</b><span>CYBERBADFIT</span></div><p>© {year} CYBERBADFIT. Crafted with intent.</p><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></footer>
  </>
}
export default App
