import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { projects } from './data/projects';
import './styles.css';

function InteractiveField() {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const interactionHost = host?.parentElement; // Listen on the whole portrait stage, not the canvas layer.
    if (!canvas || !host || !interactionHost) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0, height = 0, dpr = 1, frame = 0;
    const pointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, vx: 0, vy: 0, active: false };
    const particles = [], ripples = [];
    const count = window.innerWidth < 700 ? 175 : 360;
    const random = (min, max) => min + Math.random() * (max - min);
    const localPoint = (event) => {
      const rect = host.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.length = 0;
      // Distribute the field across the complete visual stage, not just the area above the portrait.
      for (let i = 0; i < count; i++) {
        const angle = random(0, Math.PI * 2), radius = Math.sqrt(Math.random());
        const x = width * .52 + Math.cos(angle) * radius * width * .49;
        const y = height * .51 + Math.sin(angle) * radius * height * .49;
        particles.push({ x, y, ox: x, oy: y, vx: 0, vy: 0, r: random(.65, 1.65), a: random(.24, .64), phase: random(0, Math.PI * 2) });
      }
    };
    const move = (event) => {
      const point = localPoint(event);
      if (pointer.active) {
        pointer.vx = Math.max(-18, Math.min(18, (point.x - pointer.lastX) * .16));
        pointer.vy = Math.max(-18, Math.min(18, (point.y - pointer.lastY) * .16));
      }
      pointer.lastX = point.x; pointer.lastY = point.y;
      pointer.x = point.x; pointer.y = point.y; pointer.active = true;
    };
    const leave = () => { pointer.active = false; pointer.vx = 0; pointer.vy = 0; };
    const burst = (event) => {
      const point = localPoint(event);
      ripples.push({ x: point.x, y: point.y, radius: 2, alpha: .48 });
    };
    // pointermove bubbles from the portrait overlay, so the effect remains live even over the photo.
    interactionHost.addEventListener('pointermove', move, { passive: true });
    interactionHost.addEventListener('pointerleave', leave);
    interactionHost.addEventListener('click', burst);
    const observer = new ResizeObserver(resize); observer.observe(host); resize();

    const drawConnections = () => {
      const cellSize = 82;
      const cells = new Map();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i], key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(i);
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i], cx = Math.floor(a.x / cellSize), cy = Math.floor(a.y / cellSize);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const neighbours = cells.get(`${cx + ox},${cy + oy}`);
          if (!neighbours) continue;
          for (const j of neighbours) {
            if (j <= i) continue;
            const b = particles[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < cellSize * cellSize) {
              const distance = Math.sqrt(d2);
              let alpha = (1 - distance / cellSize) * .105;
              if (pointer.active) {
                const midX = (a.x + b.x) * .5 - pointer.x, midY = (a.y + b.y) * .5 - pointer.y;
                if (midX * midX + midY * midY < 190 * 190) alpha *= 2.1;
              }
              ctx.strokeStyle = `rgba(106,159,182,${alpha})`;
              ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
      }
    };
    const draw = (time = 0) => {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      const t = time * .00025;
      for (const p of particles) {
        const driftX = reduced ? 0 : Math.sin(t + p.phase) * 2.5;
        const driftY = reduced ? 0 : Math.cos(t * .8 + p.phase) * 2.5;
        let ax = (p.ox + driftX - p.x) * .012;
        let ay = (p.oy + driftY - p.y) * .012;
        if (pointer.active && !reduced) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const distance = Math.hypot(dx, dy) || .001;
          const radius = 255;
          if (distance < radius) {
            const influence = (1 - distance / radius) ** 2;
            const nx = dx / distance, ny = dy / distance;
            // Soft repulsion plus a little directional wake, so the whole field follows the cursor.
            ax += nx * influence * 1.05 - ny * influence * pointer.vx * .018;
            ay += ny * influence * 1.05 + nx * influence * pointer.vy * .018;
          }
        }
        p.vx = (p.vx + ax) * .91;
        p.vy = (p.vy + ay) * .91;
        p.x += p.vx; p.y += p.vy;
      }
      drawConnections();
      for (const p of particles) {
        const pulse = reduced ? 1 : .78 + Math.sin(t * 4 + p.phase) * .22;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(73,132,157,${p.a})`; ctx.fill();
      }
      if (pointer.active && !reduced) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 175);
        glow.addColorStop(0, 'rgba(185,220,235,.19)');
        glow.addColorStop(.42, 'rgba(185,220,235,.07)');
        glow.addColorStop(1, 'rgba(185,220,235,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 175, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i]; ripple.radius += reduced ? 0 : 3.1; ripple.alpha *= .965;
        ctx.beginPath(); ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(106,159,182,${ripple.alpha})`; ctx.lineWidth = 1; ctx.stroke();
        if (ripple.alpha < .025 || ripple.radius > 250) ripples.splice(i, 1);
      }
      pointer.vx *= .82; pointer.vy *= .82;
    };
    draw();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      interactionHost.removeEventListener('pointermove', move);
      interactionHost.removeEventListener('pointerleave', leave);
      interactionHost.removeEventListener('click', burst);
    };
  }, []);
  return <div className="universe" ref={hostRef} aria-hidden="true"><canvas ref={canvasRef}/></div>;
}

function HeroPortrait() {
  const frameRef = useRef(null);
  const onMove = (event) => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5, y = (event.clientY - rect.top) / rect.height - .5;
    frameRef.current.style.setProperty('--tilt-x', `${-y * 3.2}deg`);
    frameRef.current.style.setProperty('--tilt-y', `${x * 3.8}deg`);
    frameRef.current.style.setProperty('--shift-x', `${x * 7}px`);
    frameRef.current.style.setProperty('--shift-y', `${y * 6}px`);
  };
  const reset = () => {
    if (!frameRef.current) return;
    frameRef.current.style.setProperty('--tilt-x', '0deg'); frameRef.current.style.setProperty('--tilt-y', '0deg');
    frameRef.current.style.setProperty('--shift-x', '0px'); frameRef.current.style.setProperty('--shift-y', '0px');
  };
  return <div className="hero-portrait-stage" ref={frameRef} onPointerMove={onMove} onPointerLeave={reset}>
    <div className="portrait-aura"/><div className="portrait-orbit orbit-a"/><div className="portrait-orbit orbit-b"/>
    <img className="hero-portrait" src="/images/rajveerr-pose-crossed.png" alt="Rajveerr Awachat standing with arms crossed, wearing a navy blazer and black turtleneck" fetchPriority="high" />
    <div className="portrait-light-sweep"/>
    <div className="portrait-index"><span>RA / 01</span><i/><span>PORTRAIT</span></div>
    <div className="portrait-caption">BUILD WITH INTENT.<br/>STAY CURIOUS.</div>
  </div>;
}

function Arrow({ diagonal = false }) { return <span className="arrow" aria-hidden="true">{diagonal ? '↗' : '↓'}</span>; }
function Header() {
  const [open, setOpen] = useState(false);
  const links = [['About', '#about'], ['Work', '#work'], ['Toolkit', '#toolkit'], ['Contact', '#contact']];
  return <header className="header">
    <a className="wordmark" href="#top" aria-label="Rajveerr Awachat home">RA<span>.</span></a>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}><span/><span/></button>
    <nav className={open ? 'nav nav-open' : 'nav'}>{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>)}<a className="nav-availability" href="mailto:rajveerrawachat@gmail.com">Let's talk <Arrow diagonal /></a></nav>
  </header>;
}
function ProjectCard({ project, index }) {
  const [expanded, setExpanded] = useState(false);
  return <article className={`project-card project-${index + 1}`}>
    <div className="project-top"><span>{project.number} / 05</span><span>{project.category}</span></div>
    <div className="project-main">
      <div className="project-index">{project.number}</div>
      <div className="project-copy">
        <div className="project-name-line"><h3>{project.name}</h3><span className="project-year">{project.year}</span></div>
        <p className="project-summary">{project.summary}</p>
        {expanded && <p className="project-description">{project.description}</p>}
        <div className="tag-row">{project.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="project-actions"><button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Less about this' : 'More about this'} <span>{expanded ? '−' : '+'}</span></button>{project.link ? <a className="text-button" href={project.link} target="_blank" rel="noreferrer">{project.linkLabel} <Arrow diagonal /></a> : <span className="coming-soon">{project.note}</span>}</div>
      </div>
    </div>
    <div className="project-bottom"><span>{project.status}</span><span>RA / WORK</span></div>
  </article>;
}
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dot = dotRef.current; const ring = ringRef.current;
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y;
    const move = (event) => { x = event.clientX; y = event.clientY; dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; };
    const animate = () => { rx += (x-rx)*.16; ry += (y-ry)*.16; ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`; frame = requestAnimationFrame(animate); };
    let frame = requestAnimationFrame(animate);
    const enter = (event) => { if (event.target.closest('a,button,.project-card')) document.body.classList.add('cursor-hover'); };
    const leave = (event) => { if (event.target.closest('a,button,.project-card')) document.body.classList.remove('cursor-hover'); };
    window.addEventListener('pointermove', move); document.addEventListener('pointerover', enter); document.addEventListener('pointerout', leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); document.removeEventListener('pointerover', enter); document.removeEventListener('pointerout', leave); };
  }, []);
  return <><span className="cursor-dot" ref={dotRef}/><span className="cursor-ring" ref={ringRef}/></>;
}
function App() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        gsap.from('.hero-kicker, .hero-title, .hero-description, .hero-actions, .hero-bottom', { y: 34, opacity: 0, duration: 1.05, stagger: .13, ease: 'power3.out', delay: .18 });
        gsap.from('.hero-portrait-stage', { y: 70, opacity: 0, scale: .94, duration: 1.45, ease: 'power4.out', delay: .28 });
        gsap.from('.portrait-index, .portrait-caption', { opacity: 0, y: 16, duration: .8, stagger: .12, delay: .9, ease: 'power2.out' });
        gsap.utils.toArray('.section-label, .about-note, .intro-copy, .work-heading, .toolkit-grid, .closing-main').forEach((element) => gsap.from(element, { y: 42, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 86%', once: true } }));
        gsap.utils.toArray('.project-card').forEach((element, index) => gsap.from(element, { y: 55, opacity: 0, duration: .8, delay: (index % 2) * .08, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } }));
        gsap.utils.toArray('.skill-group').forEach((element, index) => gsap.from(element, { x: 28, opacity: 0, duration: .7, delay: index * .07, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } }));
      }
    });
    return () => { ctx.revert(); ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); };
  }, []);
  return <>
    <CustomCursor />
    <Header />
    <main id="top">
      <section className="hero section-shell">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="hero-kicker"><span className="status-dot"/> INDEPENDENTLY CURIOUS · NAGPUR, INDIA</div>
          <h1 className="hero-title">I build things.<br/>Some work!<br/><span>Some teach me<br/>something.</span></h1>
          <p className="hero-description">A developer, researcher and builder who enjoys turning ideas into working systems — from AI agents to healthcare tech, from data experiments to Formula 1 visualizations.</p>
          <div className="hero-actions"><a href="#work" className="primary-action">Explore Projects <Arrow diagonal /></a><a href="#about" className="secondary-action">About Me <Arrow diagonal /></a></div>
          <div className="hero-bottom"><div className="hero-role">AI ENGINEER <i>·</i> RESEARCHER <i>·</i> BUILDER</div><a href="#work" className="scroll-link">SCROLL TO EXPLORE <Arrow /></a></div>
        </div>
        <div className="hero-visual"><InteractiveField /><HeroPortrait /><div className="hero-coordinate">21°08' N<br/>79°05' E</div><div className="orbit-label orbit-label-one">IDEAS → SYSTEMS</div><div className="orbit-label orbit-label-two">BUILD / BREAK / LEARN</div></div>
        <div className="hero-vertical">PORTFOLIO / 2026</div>
      </section>

      <section className="intro section-shell" id="about">
        <div className="section-label"><span>01</span> / A LITTLE ABOUT ME</div>
        <div className="intro-grid">
          <div className="about-note"><span className="about-note-mark">RA.</span><p>BUILD<br/> / BREAK<br/> / LEARN</p><span className="about-note-foot">A LITTLE ORDER<br/>IN THE UNKNOWN.</span></div>
          <div className="intro-copy"><p className="eyebrow">HELLO, I'M RAJVEERR.</p><h2>Curiosity is<br/>my <em>starting point.</em></h2><p className="body-large">I'm a Computer Science student at Ramdeobaba University, Nagpur, interested in building intelligent systems and making ideas tangible.</p><p className="body-copy">My work moves between AI, software, robotics and experiments. I like understanding how things work, trying to make them work better, and learning something useful when they don't.</p><div className="intro-meta"><div><span>BASED IN</span><strong>Nagpur, India</strong></div><div><span>STUDYING</span><strong>B.Tech · Computer Science</strong></div></div><a className="underlined-link" href="https://www.linkedin.com/in/rajveerrawachat" target="_blank" rel="noreferrer">A little more on LinkedIn <Arrow diagonal /></a></div>
        </div>
      </section>

      <section className="work section-shell" id="work">
        <div className="section-label"><span>02</span> / SELECTED WORK <span className="section-count">05 PROJECTS</span></div>
        <div className="work-heading"><h2>Things I've<br/><em>been building.</em></h2><p>A snapshot of projects, experiments and ideas in progress. This is a living list — the details will grow as the work does.</p></div>
        <div className="project-list">{projects.map((project, i) => <ProjectCard key={project.number} project={project} index={i} />)}</div>
      </section>

      <section className="toolkit section-shell" id="toolkit">
        <div className="section-label"><span>03</span> / THE TOOLKIT</div>
        <div className="toolkit-grid"><div><h2>Tools are<br/><em>just the start.</em></h2><p className="body-copy">I care about choosing the right tool for the problem — and staying curious enough to learn a new one.</p></div><div className="skill-groups">
          <div className="skill-group"><span>01 / LANGUAGES</span><div>Python <b>·</b> C <b>·</b> Java</div></div>
          <div className="skill-group"><span>02 / AI & INTELLIGENT SYSTEMS</span><div>Machine Learning <b>·</b> Local LLMs <b>·</b> AI Agents</div></div>
          <div className="skill-group"><span>03 / BUILD & CONNECT</span><div>Arduino <b>·</b> ESP32 <b>·</b> Raspberry Pi</div></div>
          <div className="skill-group"><span>04 / TOOLS & PLATFORMS</span><div>Git <b>·</b> Ollama <b>·</b> SQLite <b>·</b> Linux</div></div>
        </div></div>
      </section>

      <section className="closing section-shell" id="contact"><div className="section-label"><span>04</span> / THE NEXT THING</div><div className="closing-main"><p className="eyebrow">HAVE A GOOD QUESTION OR AN INTERESTING IDEA?</p><h2>Let's make<br/><em>something real.</em></h2><a className="contact-link" href="mailto:rajveerrawachat@gmail.com">rajveerrawachat@gmail.com <Arrow diagonal /></a></div><div className="contact-footer"><div className="socials"><a href="https://github.com/rajveerrawachat" target="_blank" rel="noreferrer">GITHUB <Arrow diagonal /></a><a href="https://www.linkedin.com/in/rajveerrawachat" target="_blank" rel="noreferrer">LINKEDIN <Arrow diagonal /></a></div><div className="footer-note">MADE WITH CURIOSITY<br/>© 2026 RAJVEERR AWACHAT</div></div></section>
    </main>
    <footer className="site-footer"><a href="#top">RAJVEERR AWACHAT<span>®</span></a><span>ONE IDENTITY. MANY DIRECTIONS.</span><a href="#top">BACK TO TOP ↑</a></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
