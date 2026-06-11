// ============================================================
//  GARV — App logic
//  Loader · custom cursor · menu · phase engine · smooth scroll
//  scroll reveals · counters · marquee · ambient sound
// ============================================================
import { initOrb, startOrb, setPhase, pulseOrb } from './orb.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.classList.add('js-ready');

// ---------- Hero phases (auto-cycling headline + eyebrow + orb look) ----------
const HERO = [
  { words: ['Building', 'Scalable', 'Backend', 'Systems'], eyebrow: "Hi, I'm Garv — a Software Engineer at MAQ Software." },
  { words: ['Optimizing', 'Performance', 'At', 'Scale'], eyebrow: 'I turned a 3h 40m query into 2.5 minutes on a 90M+ record dataset.' },
  { words: ['Engineering', 'In', 'C#', '& .NET'], eyebrow: 'Architecting product features in C# / ASP.NET Core, end-to-end.' },
  { words: ['Modernizing', 'The', 'Office', 'Add-in'], eyebrow: 'Led the migration from Electron to a React-based Office Web Add-in.' },
  { words: ['Automating', 'With', 'AI', 'Agents'], eyebrow: 'Building autonomous, spec-driven developer tooling with LLMs.' },
  { words: ['Engineering', 'The', 'Future', 'Today'], eyebrow: "Let's build what comes next, together." },
];
const PHASE_INTERVAL = 5500;
let phase = 0;
let autoTimer = null;

const els = {
  loader: $('#loader'),
  count: $('#loaderCount'),
  bar: $('#loaderBar'),
  enter: $('#enterBtn'),
  webgl: $('#webgl'),
  title: $('#heroTitle'),
  eyebrow: $('#heroEyebrow'),
  prev: $('#phasePrev'),
  next: $('#phaseNext'),
  cursor: $('#cursor'),
  cursorDot: $('.cursor__dot'),
  cursorRing: $('.cursor__ring'),
  menuBtn: $('#menuBtn'),
  overlay: $('#overlay'),
  soundBtn: $('#soundBtn'),
};

// ============================================================
//  Custom cursor
// ============================================================
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  const loop = () => {
    dx += (mx - dx) * 0.9; dy += (my - dy) * 0.9;
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    els.cursorDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    els.cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  };
  loop();
  const hoverSel = 'a, button, .card, .overlay__link, [data-cursor]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSel)) els.cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSel)) els.cursor.classList.remove('is-hover');
  });
  document.addEventListener('mouseleave', () => els.cursor.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => els.cursor.classList.remove('is-hidden'));
}

// ============================================================
//  Loader
// ============================================================
function runLoader() {
  // Self-contained rAF loop — independent of the GSAP ticker (which Lenis hijacks).
  const DURATION = prefersReduced ? 400 : 2600;
  let start = null;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    els.count.textContent = '100';
    els.bar.style.width = '100%';
    els.loader.classList.add('is-ready');
  };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    if (start === null) start = now; // base on first frame's clock to avoid origin mismatch
    const t = Math.min(Math.max((now - start) / DURATION, 0), 1);
    const v = easeOut(t) * 100;
    els.count.textContent = Math.round(v);
    els.bar.style.width = v + '%';
    if (t < 1) requestAnimationFrame(step);
    else finish();
  };
  requestAnimationFrame(step);
  // Safety fallback in case rAF is throttled (e.g. background tab).
  setTimeout(finish, DURATION + 1400);
}

function enter() {
  els.loader.classList.add('is-done');
  els.webgl.classList.add('is-visible');
  document.body.classList.remove('is-locked');
  startOrb();
  introAnimation();
  startAuto();
}

// ============================================================
//  Hero phase engine — auto-cycling + manual prev/next
// ============================================================
function renderPhase(i, animate = true) {
  phase = (i + HERO.length) % HERO.length;
  const data = HERO[phase];
  els.eyebrow.textContent = data.eyebrow;
  setPhase(phase);

  els.title.innerHTML = data.words.map((w) => `<span>${w}</span>`).join('');
  if (gsap && animate && !prefersReduced) {
    const spans = $$('span', els.title);
    gsap.fromTo(spans,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'power4.out' });
    gsap.fromTo(els.eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.6 });
  }
}

function goPhase(i) { renderPhase(i); startAuto(); } // manual nav also resets the timer

function startAuto() {
  clearInterval(autoTimer);
  if (prefersReduced) return;
  autoTimer = setInterval(() => {
    if (!menuOpen && isHeroInView()) renderPhase(phase + 1);
  }, PHASE_INTERVAL);
}
function isHeroInView() {
  const r = $('#hero').getBoundingClientRect();
  return r.bottom > window.innerHeight * 0.4;
}

// ============================================================
//  Menu overlay
// ============================================================
let menuOpen = false;
function toggleMenu(force) {
  menuOpen = force ?? !menuOpen;
  els.menuBtn.classList.toggle('is-open', menuOpen);
  els.menuBtn.setAttribute('aria-expanded', String(menuOpen));
  els.menuBtn.querySelector('.menu-btn__text').textContent = menuOpen ? 'Close' : 'Menu';
  els.overlay.classList.toggle('is-open', menuOpen);
  els.overlay.setAttribute('aria-hidden', String(!menuOpen));
  if (window.__lenis) menuOpen ? window.__lenis.stop() : window.__lenis.start();
}

// ============================================================
//  Smooth scroll (Lenis) + reveals
// ============================================================
function initScroll() {
  let lenis = null;
  if (Lenis && !prefersReduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', () => ScrollTrigger?.update());
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.3 });
    else el.scrollIntoView({ behavior: 'smooth' });
  };

  $$('[data-scroll]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href?.startsWith('#')) { e.preventDefault(); scrollTo(href); if (menuOpen) toggleMenu(false); }
    }));
  $('#heroCta')?.addEventListener('click', () => scrollTo('#work'));

  // Reveal animations
  if (gsap && ScrollTrigger && !prefersReduced) {
    $$('.reveal, .reveal-lines').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' },
      });
    });
    // Section headers slide their kicker line
    $$('.section__head').forEach((h) => {
      gsap.from(h, { opacity: 0, x: -24, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: h, start: 'top 88%' } });
    });
    // Marquee scroll-linked drift
    const track = $('.marquee__track');
    if (track) {
      gsap.to(track, { xPercent: -50, ease: 'none',
        scrollTrigger: { trigger: '#skills', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    }
    initCounters();
  }
}

function initCounters() {
  $$('[data-count]').forEach((el) => {
    const end = Number.parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, {
        v: end, duration: 1.8, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(obj.v) + (el.classList.contains('fact__num') ? '' : suffix); },
        onComplete: () => { el.textContent = Math.round(end) + (el.classList.contains('fact__num') ? '' : suffix); },
      }),
    });
  });
}

function introAnimation() {
  if (!gsap || prefersReduced) { renderPhase(0, false); return; }
  renderPhase(0, true);
  pulseOrb();
  gsap.from('.header', { y: -40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
  gsap.from('.hero__stat, .hero__scroll', { opacity: 0, duration: 1, delay: 0.8, stagger: 0.1 });
  gsap.from('.pill', { opacity: 0, y: 20, duration: 0.8, delay: 0.9 });
}

// ============================================================
//  Ambient sound (WebAudio) — gentle, optional
// ============================================================
let audioCtx = null, masterGain = null, soundOn = false;
function buildAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 0.6;
    filter.connect(masterGain);

    [110, 164.81, 220].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 1) * 6;
      const g = audioCtx.createGain(); g.gain.value = i === 2 ? 0.12 : 0.22;
      o.connect(g); g.connect(filter); o.start();
    });
    // slow shimmer LFO on filter cutoff
    const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 240;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
  } catch { /* audio unavailable on this device */ }
}
function toggleSound() {
  if (!audioCtx) buildAudio();
  if (!audioCtx) return;
  soundOn = !soundOn;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const target = soundOn ? 0.14 : 0;
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 0.8);
  els.soundBtn.classList.toggle('is-on', soundOn);
  els.soundBtn.setAttribute('aria-pressed', String(soundOn));
}

// ============================================================
//  Toast
// ============================================================
let toastEl = null, toastTimer = null;
function toast(message, ms = 4200) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  requestAnimationFrame(() => toastEl.classList.add('is-show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), ms);
}

// ============================================================
//  Résumé download guard — friendly message if file not added yet
// ============================================================
function initResume() {
  $$('[data-resume]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      const href = link.getAttribute('href');
      try {
        const res = await fetch(href, { method: 'HEAD' });
        if (!res.ok) throw new Error('missing');
      } catch {
        e.preventDefault();
        toast('Résumé not added yet — drop your PDF at /assets/Garv_Goel_Resume.pdf');
      }
    });
  });
}

// ============================================================
//  Contact form — Web3Forms (set a key) with mailto fallback
// ============================================================
const WEB3FORMS_KEY = ''; // paste your free access key from https://web3forms.com to enable async sending
const CONTACT_EMAIL = 'garv99goel15@gmail.com';

function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;
  const status = $('#formStatus');
  const submit = $('#cfSubmit');

  const setStatus = (msg, cls = '') => {
    status.textContent = msg;
    status.className = 'form-status' + (cls ? ' ' + cls : '');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#cfName').value.trim();
    const email = $('#cfEmail').value.trim();
    const message = $('#cfMessage').value.trim();

    if (!name || !email || !message) { setStatus('Please fill in every field.', 'is-err'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('That email looks off — mind checking it?', 'is-err'); return; }

    // No backend key configured → open the user's mail client, prefilled.
    if (!WEB3FORMS_KEY) {
      const subject = encodeURIComponent(`Portfolio message from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      setStatus('Opening your email app…', 'is-ok');
      form.reset();
      return;
    }

    // Async send via Web3Forms.
    try {
      setStatus('Sending…', 'is-busy');
      submit.disabled = true;
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, name, email, message, subject: `Portfolio message from ${name}` }),
      });
      const data = await res.json();
      if (data.success) { setStatus('Thanks! Your message is on its way. ✦', 'is-ok'); form.reset(); }
      else { setStatus('Something went wrong — please email me directly.', 'is-err'); }
    } catch {
      setStatus('Network error — please email me directly.', 'is-err');
    } finally {
      submit.disabled = false;
    }
  });
}

// ============================================================
//  Boot
// ============================================================
function boot() {
  $('#year').textContent = new Date().getFullYear();
  document.body.classList.add('is-locked');
  initCursor();
  try { initOrb(els.webgl); } catch (e) { console.warn('WebGL init failed', e); }
  runLoader();
  initScroll();
  initResume();
  initContactForm();

  els.enter.addEventListener('click', enter);
  els.menuBtn.addEventListener('click', () => toggleMenu());
  els.soundBtn.addEventListener('click', toggleSound);
  els.prev?.addEventListener('click', () => goPhase(phase - 1));
  els.next?.addEventListener('click', () => goPhase(phase + 1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) toggleMenu(false);
    if (menuOpen || !isHeroInView()) return;
    if (e.key === 'ArrowLeft') goPhase(phase - 1);
    if (e.key === 'ArrowRight') goPhase(phase + 1);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
