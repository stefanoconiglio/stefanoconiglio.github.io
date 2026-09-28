#!/usr/bin/env python3
"""Regenerate cv/sections/public_engagement.tex from the website.

The CV must list every entry of Public Engagement, Professional Training and
In the Press, so this script rebuilds that CV file from engagement.html,
training.html and news.html. Run it after editing any of those pages:

    python3 tools/site_to_cv.py
"""
import html
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://stefanoconiglio.github.io/"

def tex_escape(t):
    rep = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#",
           "_": r"\_", "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\^{}"}
    return "".join(rep.get(c, c) for c in t)

def url_escape(u):
    return u.replace("%", r"\%").replace("#", r"\#")

class ToTex(HTMLParser):
    """Turn the inner HTML of one entry into LaTeX."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.href = [], [], None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "em":
            self.out.append(r"\emph{"); self.stack.append("}")
        elif tag == "strong":
            self.out.append(r"\textbf{"); self.stack.append("}")
        elif tag == "a":
            href = a.get("href", "")
            if not href.startswith("http"):
                href = BASE + href
            self.out.append(r"\publink{" + url_escape(href) + "}{"); self.stack.append("}")
        elif tag == "br":
            self.out.append(" ")
        else:
            self.stack.append("")
    def handle_endtag(self, tag):
        if tag == "br":
            return
        if self.stack:
            self.out.append(self.stack.pop())
    def handle_data(self, d):
        self.out.append(tex_escape(d))

def to_tex(fragment):
    fragment = fragment.replace("&nbsp;·&nbsp;", " \\quad ").replace("&nbsp;", " ")
    p = ToTex(); p.feed(fragment); p.close()
    t = "".join(p.out)
    t = re.sub(r"\s+", " ", t).strip()
    t = t.replace(r"\textbackslash{}quad", r"\quad")          # our own separator
    t = re.sub(r'"([^"]*)"', r"``\1''", t)                   # straight quotes -> TeX quotes
    return t

def date_tex(d):
    return tex_escape(d.replace("–", "--"))

def list_items(page_html, section_label=None):
    s = page_html
    if section_label:
        i = s.index(f'<h2 class="section-label">{section_label}</h2>')
        s = s[i:s.index("</ul>", i)]
    return re.findall(r'<li>\s*<span class="date">([^<]*)</span>\s*<div>(.*?)</div>\s*</li>', s, flags=re.S)

eng = (ROOT / "engagement.html").read_text(encoding="utf-8")
trn = (ROOT / "training.html").read_text(encoding="utf-8")
news = (ROOT / "news.html").read_text(encoding="utf-8")

out = ["% Generated from engagement.html, training.html and news.html by tools/site_to_cv.py.",
       "% Edit the website pages and rerun the script instead of editing this file by hand.", ""]

out.append(r"\section{Public engagement}")
for d, body in list_items(eng, "Events &amp; talks"):
    out.append(r"\cvitem{" + date_tex(d) + "}{" + to_tex(body) + "}")
out.append("")
out.append(r"\subsection{Written contributions for the general public}")
for d, body in list_items(eng, "Written contributions"):
    out.append(r"\cvitem{" + date_tex(d) + "}{" + to_tex(body) + "}")
out.append("")

out.append(r"\section{Professional training}")
for d, body in list_items(trn):
    out.append(r"\cvitem{" + date_tex(d) + "}{" + to_tex(body) + "}")
out.append("")

out.append(r"\section{Media coverage}")
for card in re.findall(r'<li class="press-card">(.*?)</li>', news, flags=re.S):
    meta = html.unescape(re.search(r'<p class="press-meta">([^<]*)</p>', card).group(1))
    parts = [x.strip() for x in meta.split("·")]
    date, source = parts[-1], " · ".join(parts[:-1])
    kind = ""
    if source.startswith("Video · "):
        kind, source = " (video)", source[len("Video · "):]
    title_m = re.search(r'<h3 class="press-title">(.*?)</h3>', card, flags=re.S)
    href_m = re.search(r'<a href="([^"]+)"', title_m.group(1))
    title = to_tex(re.sub(r"</?a[^>]*>", "", title_m.group(1)))
    desc = to_tex(re.search(r'<p class="press-desc">(.*?)</p>', card, flags=re.S).group(1))
    link = (r" \quad \publink{" + url_escape(href_m.group(1)) + "}{" + ("Watch" if kind else "Read") + "}") if href_m else ""
    out.append(r"\cvitem{" + date_tex(date) + "}{\\emph{" + tex_escape(source) + "}" + kind + ": " + title + ". " + desc + link + "}")
out.append("")

(ROOT / "cv/sections/public_engagement.tex").write_text("\n".join(out), encoding="utf-8")
print("written:", sum(1 for l in out if l.startswith(r"\cvitem")), "entries")
