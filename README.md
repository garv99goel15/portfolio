# GARV — Portfolio

An immersive, single-page portfolio inspired by award-winning sites like hatom.com:
a WebGL crystal orb, a cinematic 6-phase hero, smooth scrolling, a full-screen menu,
scroll-reveal animations, animated counters, and optional ambient sound.

## Run it

No build step. From this folder:

```powershell
node server.js
```

Then open **http://localhost:5173** (it opens automatically inside VS Code's browser
when launched from the assistant).

## Stack

- **Three.js** (ES modules via CDN import map) — noise-displaced orb + bloom
- **GSAP + ScrollTrigger** — animations & scroll triggers
- **Lenis** — smooth scrolling
- **Vanilla CSS** — design system in `css/style.css`
- **Zero-dependency Node server** — `server.js`

## Make it yours

| What | Where |
|------|-------|
| Name / wordmark | `index.html` (loader `#loaderBrand`, `.brand__name`) and `<title>` |
| Hero phase lines | `HERO` array in `js/app.js` |
| Projects | `.work__list` cards in `index.html` |
| Skills | `.skills__grid` in `index.html` |
| Experience / Education | `.timeline` lists in `index.html` |
| Email & socials | `mailto:` + social links in `index.html` |
| Colours / vibe | CSS tokens at top of `css/style.css` (`--purple`, `--lime`, `--cyan`) |
| Orb look per phase | `PHASES` array in `js/orb.js` |

## Résumé download

The **Download CV** buttons link to `./assets/Garv_Goel_Resume.pdf`.
Drop your PDF into `assets/` with that exact name and the buttons just work.
Until then, clicking shows a friendly toast instead of a 404.

## Contact form

The form works **out of the box** with no backend: submitting opens the
visitor's email app with a prefilled message to `garv99goel15@gmail.com`.

To receive messages **without** the visitor needing an email client, enable
async sending via [Web3Forms](https://web3forms.com) (free, no server):

1. Get a free **access key** at web3forms.com (just enter your email).
2. Open `js/app.js` and set `const WEB3FORMS_KEY = 'your-key-here';`.

That's it — submissions now POST directly and land in your inbox.

## Deploy

It's a pure static site (no build), so any static host works.

**GitHub Pages** (automated): push to a GitHub repo. The included
`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

**Netlify**: drag the folder onto app.netlify.com, or connect the repo —
`netlify.toml` is already configured (publish `.`, no build command).

**Vercel**: `vercel` from this folder, or import the repo — `vercel.json`
is already configured.

**Any host**: upload the folder as-is. `index.html` is the entry point.

## Folder structure

```
garv-portfolio/
  index.html
  server.js
  css/style.css
  js/orb.js       ← WebGL orb
  js/app.js       ← UI logic + contact form
  assets/         ← put Garv_Goel_Resume.pdf here
  netlify.toml · vercel.json · .github/workflows/deploy.yml
```

