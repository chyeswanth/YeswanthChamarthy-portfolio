# Yeswanth Chamarthy — Portfolio

A from-scratch, single-page portfolio for a Data &amp; AI Engineer. No template, no framework, no
build step — just hand-written HTML, CSS, and JavaScript.

## What makes it different

- **Live Text-to-SQL playground** (hero) — a working, client-side miniature of the production Teams
  bot: pick a business question, watch it generate guard-railed Athena SQL, "scan" the lake, and
  return a result table plus a plain-English summary.
- **Interactive case studies** — each flagship project renders an **animated architecture diagram**
  (data packets flowing between services). Hover any node to see what it does.
- **Data-flow visual identity** — instrument-panel palette (data-cyan / signal-green / amber),
  `Space Grotesk` + `JetBrains Mono`, and an animated flow-field background. Deliberately *not* the
  default purple-gradient AI-builder look.
- **Animated stat read-out**, click-to-copy email, and a real `mailto:` contact action.
- Respects `prefers-reduced-motion`.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup and content |
| `style.css`  | Design tokens + all component styles |
| `script.js`  | SQL playground, architecture diagrams, flow-field, count-ups |

## Before you publish

- Replace the `TODO` placeholder **LinkedIn** and **GitHub** URLs (search the codebase for `TODO`).
  They appear in the hero socials, the contact links, and the footer.
- The Text-to-SQL demo data is illustrative sample data, not live production figures.

## Local preview

Open `index.html` in a browser. For full clipboard support, serve it locally instead of `file://`:

```bash
python -m http.server 8000   # then visit http://localhost:8000
```

## Hosting on GitHub Pages

1. Push to a GitHub repository.
2. Settings → Pages → Source: "Deploy from a branch" → `main` / root.
3. Save — the site goes live at `https://<username>.github.io/<repo>/`.
