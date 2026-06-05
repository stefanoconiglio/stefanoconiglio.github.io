# stefanoconiglio.github.io — starting scaffold

Hand-coded HTML/CSS site modelled on the structure of Ivana Ljubić's page
(https://ivanaljubic.github.io/) but with restrained typography (Source Serif 4
+ IBM Plex Mono) instead of the AcademicPages defaults.

No build step. No Jekyll. Edit the HTML directly.

## Files

- `index.html` — landing page: bio, news, recent talks
- `publications.html` — stub list, fill in
- `talks.html` — stub list, fill in
- `projects.html` — stubs for HEXAGON, AI4SF, etc.
- `style.css` — shared stylesheet for all pages

## Deploy

From the repo root:

```
git add index.html publications.html talks.html projects.html style.css
git commit -m "Initial site scaffold (Ljubić-style)"
git push
```

GitHub Pages will serve at https://stefanoconiglio.github.io within ~1 minute.

## Things to do before going live

All marked with `[BRACKETED PLACEHOLDERS]` in the HTML:

1. **Title.** Replace `[Associate / Full]` with your actual rank.
2. **Career sentence** in the About section (PhD institution and year, prior
   positions before UniBg).
3. **Research sentence** in the About section (methodological focus +
   application domains).
4. **Email.** Replace `[your-email]@unibg.it`.
5. **Scholar / ORCID / DBLP IDs.** Search-and-replace `[ID]` and `[ORCID-ID]`.
6. **Profile photo.** Drop a square JPG into `images/profile.jpg` and uncomment
   the `<img>` tag in the sidebars (remove the `<div class="photo-placeholder">`
   block). Or just delete the photo block entirely if you'd rather not have one.
7. **News items** in `index.html` — add 3-5 recent things, dated.
8. **Publications** — fill `publications.html` (or generate it from a BibTeX
   file later if you want).
9. **HEXAGON / AI4SF descriptions** in `projects.html`.

## Design notes

- The page is two-column (sticky 240px sidebar + flexible main) on desktop,
  collapses to single-column on mobile (< 760px).
- Source Serif 4 for body, IBM Plex Mono for nav + dates + small labels. The
  monospace is a nod to your terminal taste without going full hacker-page.
- Color palette: warm off-white (`#fdfcf8`) background, deep charcoal text,
  muted scholarly blue (`#2d4a6b`) for links. All variables at the top of
  `style.css` if you want to tweak.
- Section headings use a small-caps mono label (e.g. "NEWS") rather than a
  big serif heading — keeps the page calm.

## If you want to extend

- **Italian version:** duplicate `index.html` → `index.it.html`, translate, add a
  language switcher in the sidebar.
- **BibTeX-driven publications:** drop a `papers.bib` and a small JS parser, or
  generate `publications.html` from a script you run locally.
- **News feed from Obsidian/Quartz:** point a "Notes" link in the sidebar at
  your Quartz site rather than duplicating content here.
