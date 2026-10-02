# Stefano Coniglio — Personal Website

## Authoritative sources for content updates

When updating the homepage or any other page, pull information from these sources before making edits:

### 1. CV (LaTeX source) — primary source
All biographical data, publications, grants, talks, awards, and service.

The CV that the site links to is built from this repository: `cv/cv_SC.tex` plus `cv/sections/*.tex`.
A GitHub Action rebuilds `cv/cv_SC.pdf` on every push that touches those files (and commits it as
"Rebuild CV PDF", so `git pull --rebase` before pushing). Keep the site and `cv/sections/` in sync.
`cv/sections/public_engagement.tex` (Public engagement, Professional training, Media coverage) is generated
from `engagement.html`, `training.html` and `news.html` by `python3 tools/site_to_cv.py`: edit those pages,
rerun the script, and never edit that CV file by hand.
`cv/cv_SC_europass.tex` is the same CV in Europass format (work contacts only, dated and signed, with the
declarations under art. 76 DPR 445/2000 and art. 13 GDPR). It inputs the same `cv/sections/*.tex`, mapping the moderncv
commands onto `europasscv`, so content is written once. Build it with `latexmk -pdf -outdir=build cv_SC_europass.tex` in
`cv/`; it is not built by the GitHub Action and its PDF is not committed.
The Google Drive copy below is older and is not what the site serves.

- Main file: `/home/coniglio/Insync/stefano.coniglio@unibg.it/Google Drive/WORK/CAREER/CV/cv/cv_SC.tex`
- Publications: `publications_SC.tex` (same directory)
- Seminars/talks: `seminars.tex` (same directory)
- Submitted/working papers: `submitted.tex`, `workingpapers.tex` (same directory)

### 2. Google Scholar — citation metrics and paper list
URL: https://scholar.google.com/citations?user=F9mrD0gAAAAJ&hl=en&oi=ao

Use for: h-index, total citations, most-cited papers, recent papers.

### 3. LinkedIn — about text and headline
URL: https://www.linkedin.com/in/stefanoconiglio/ (requires login; check manually)

Use for: polished About prose and professional headline.

## Site structure

GitHub Pages builds the site with Jekyll; every page has empty front matter so `{% include %}` works.

- `index.html` — Home: About (centre) and the shared News column (right)
- `career.html` — Career: appointments, roles, teaching, PhD supervision & examination, service, education
  (`about.html` only redirects here)
- `group.html` — Research Group: UniBg, then previous group at Southampton
- `publications.html`, `talks.html` (Research Talks), `projects.html`
- `engagement.html` — Public Engagement (talks, panels, interviews, events)
- `training.html` — Professional Training (courses and seminars for professionals)
- `news.html` — In the Press, thumbnail cards; `news-verbose.html` — the same as a list
- `_includes/sidebar.html` — photo, roles, address, links (every page)
- `_includes/news.html` — the News column (every page); keep about six recent items
- `style.css` — all styling; bump `style.css?v=` on every page when it changes
- `site.js` — Menu button on small screens
- `images/press/` — 640x400 press thumbnails; `files/events/` — posters and programmes
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`; `coniglio-dse-edt.jpg` — profile photo

## Conventions

- Every page repeats the same `<nav>` (9 tabs, current one marked `aria-current="page"`)
  and the same `<head>` block (description, canonical, Open Graph, favicons).
- List rows are `<li><span class="date">…</span><div>…</div></li>`; text outside the `<div>` breaks the grid.
- On Public Engagement and Professional Training, people named in an entry are wrapped in
  `<span class="person">` (underlined); journalists who interviewed Stefano are not named anywhere.
- Intermediaries are not named for paid training (e.g. Politecnico di Milano for Eni, IAL Lombardia).
- Preview locally with Jekyll, or strip the front matter and inline the includes, then screenshot.
