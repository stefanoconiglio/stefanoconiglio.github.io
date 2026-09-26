# stefanoconiglio.github.io

Personal website of Stefano Coniglio (University of Bergamo), served by GitHub Pages at
https://stefanoconiglio.github.io.

Hand-written HTML and CSS (Source Serif 4 + IBM Plex Mono). GitHub Pages builds the site with Jekyll,
which expands the shared fragments in `_includes/` (sidebar and News column); every page has empty
front matter for that reason.

## Pages

| File | Tab |
| --- | --- |
| `index.html` | Home: About and News |
| `career.html` | Career (appointments, roles, teaching, supervision, service, education) |
| `group.html` | Research Group |
| `publications.html` | Publications |
| `projects.html` | Projects |
| `talks.html` | Research Talks |
| `engagement.html` | Public Engagement |
| `training.html` | Professional Training |
| `news.html`, `news-verbose.html` | In the Press (thumbnails / list) |

`about.html` redirects to `career.html`.

## Other files

- `style.css` — all styling (bump the `?v=` query on every page after editing it)
- `site.js` — Menu button on small screens
- `images/press/` — press thumbnails (640x400); `files/events/` — event posters and programmes
- `cv/` — LaTeX sources of the CV; `.github/workflows/build-cv.yml` rebuilds `cv/cv_SC.pdf` on push

## Local preview

Run a local Jekyll server (`jekyll serve`), or open the pages after expanding
`{% include … %}` tags; opening the source files directly will not show the sidebar or News column.
