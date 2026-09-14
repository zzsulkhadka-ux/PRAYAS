# Prayas Studio — Website

A static, 3D-animated site for Prayas Studio. No backend, no build step, no
payment system — pure HTML/CSS/JS, so it runs directly on GitHub Pages.

## What's inside

```
prayas-studio/
├── index.html          # all page content
├── css/style.css        # design system + layout
├── js/main.js           # header state, mobile nav, scroll-reveal
├── js/scene.js          # Three.js hero background + about visual
└── assets/prayas-logo.png
```

- **3D**: [Three.js](https://threejs.org) loaded from a CDN via an import
  map — no `npm install` needed. The hero has a drifting ember particle
  field and a rotating faceted "shard" with glowing red edges. A smaller
  version of the shard sits in the About section.
- **Scroll animation**: content in each section is hidden until it scrolls
  into view, then reveals one element at a time (staggered ~110ms apart)
  using `IntersectionObserver` — this is what makes things animate in
  "1 by 1" as you scroll down, with no animation library required.
- Respects `prefers-reduced-motion` (disables the particle loop and
  reveal animation for people who've asked their OS to reduce motion).

## Editing content

Everything is in `index.html` — headline, About copy, the four service
rows, the four work-sample cards, and the contact email/social links are
all plain text/markup, no CMS. Swap the placeholder project names in the
`.work-card` blocks and the email address in `.contact-email` for your
real details.

## Running locally

Any static file server works, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly by double-clicking will also mostly work,
but some browsers restrict ES module imports over the `file://` protocol —
a local server avoids that.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository (it can be the repo root, or a
   `docs/` folder — either works).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a
   branch."
4. Pick the branch (usually `main`) and the folder (`/root` or `/docs`,
   matching where you put these files).
5. Save. GitHub will give you a URL like
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No further configuration, secrets, or build step is required.

## Notes

- The Prayas Studio logo (`assets/prayas-logo.png`) is used as-is in the
  header, footer, and browser tab icon — it is not recreated or modified.
- Particle count auto-reduces on narrow viewports for performance.
