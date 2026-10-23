#!/usr/bin/env python3
"""Link each paper on the Publications page and in the CV to its AISberg record.

AISberg (https://aisberg.unibg.it) is the University of Bergamo's repository
of publications, a Cineca IRIS. The script lists Stefano's records there (the
author authority rp75754), reads each one's metadata over OAI-PMH, keeps those
that carry his ORCID, and saves them to tools/aisberg.json. Every entry of
publications.html and cv/sections/publications.tex that matches a record (by
DOI, else by title) gets an "AISberg" link to its handle, after its other
links. It then prints the titles that differ from AISberg's on a DOI match
and the papers found on one side only. Run it again whenever papers are added
to AISberg, to the page or to the CV:

    python3 tools/aisberg_to_site.py            # fetch from AISberg, then link
    python3 tools/aisberg_to_site.py --cached   # link from tools/aisberg.json
"""
import argparse
import difflib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "publications.html"
CV = ROOT / "cv" / "sections" / "publications.tex"
CACHE = ROOT / "tools" / "aisberg.json"
AISBERG = "https://aisberg.unibg.it"
AUTHORITY = "rp75754"
ORCID = "0000-0001-9568-4385"
NS = {"oai": "http://www.openarchives.org/OAI/2.0/",
      "dc": "http://purl.org/dc/elements/1.1/"}
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"'<>?#{}]+", re.I)
# Records whose title differs from the entry's for a reason, not by mistake:
# the AISberg record of the white paper is the volume Stefano's chapter is in.
SAME_PAPER = {"10446/276449": "Definitional questions in a historical perspective"}

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "stefanoconiglio.github.io aisberg_to_site.py"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")

def from_oai(h):
    xml = get(f"{AISBERG}/oai/request?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:aisberg.unibg.it:{h}")
    dc = ET.fromstring(xml).find(".//oai:metadata/*", NS)
    if dc is None:
        return None
    f = lambda tag: [(e.text or "").strip() for e in dc.findall(f"dc:{tag}", NS)]
    if not any(ORCID in c for c in f("creator")):
        print(f"  {h}: not Stefano's ORCID, skipped", file=sys.stderr)
        return False
    rel = dict(r.split(":", 1) for r in f("relation") if ":" in r and not r.startswith("info:"))
    return {
        "handle": h,
        "title": (f("title") or [""])[0],
        "authors": [a.strip() for a in f("contributor") if a.strip()],
        "year": (f("date") or [""])[0][:4],
        "type": (f("type") or [""])[0].rsplit("/", 1)[-1],
        "doi": next((i.lower() for i in f("identifier") if DOI_RE.fullmatch(i)), None),
        "venue": rel.get("journal") or rel.get("ispartofbook") or rel.get("conference") or "",
        "rights": [r for r in f("rights") if r.startswith("info:eu-repo")],
        "source": "oai",
    }

def from_page(h):
    """A record OAI-PMH does not serve yet (not validated): its item page's tags.
    Being listed under Stefano's authority stands in for the ORCID check."""
    page = get(f"{AISBERG}/handle/{h}")
    meta = lambda name: [html.unescape(v) for v in re.findall(rf'<meta name="{name}" content="([^"]*)"', page)]
    return {
        "handle": h,
        "title": (meta("citation_title") or [""])[0],
        "authors": meta("citation_author"),
        "year": (meta("citation_date") or meta("citation_publication_date") or [""])[0][:4],
        "type": next((t.rsplit("/", 1)[-1] for t in meta("DC.type") if t.startswith("info:eu-repo")), ""),
        "doi": next((d.lower() for d in meta("citation_doi")), None),
        "venue": (meta("citation_conference_title") or meta("citation_journal_title") or [""])[0],
        "rights": [],
        "source": "item page",
    }

def fetch():
    """Stefano's records on AISberg, from the author browse page and OAI-PMH."""
    listing = get(f"{AISBERG}/browse?type=author&authority={AUTHORITY}&rpp=1000&sort_by=ASC")
    handles = sorted(set(re.findall(r'href="/handle/(10446/\d+)"', listing)), key=lambda h: int(h.split("/")[1]))
    records = []
    for h in handles:
        r = from_oai(h)
        if r is None:
            r = from_page(h)
        if r:
            records.append(r)
        time.sleep(0.3)
    return records

def norm(title):
    t = html.unescape(title)
    t = re.sub(r"\\[a-zA-Z]+\s*|[\\$]", "", t)       # TeX commands and math shifts
    return re.sub(r"[^a-z0-9]", "", t.lower())

def braces(text, i):
    """The end of the {...} group that opens at text[i]."""
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "{" and text[j - 1] != "\\":
            depth += 1
        elif text[j] == "}" and text[j - 1] != "\\":
            depth -= 1
            if depth == 0:
                return j + 1
    raise ValueError(f"unbalanced braces at {i}")

class Page:
    """publications.html: each <li> row, its links in the <div>."""
    LINK = re.compile(r'\s*&nbsp;·&nbsp; <a href="https://hdl\.handle\.net/10446/\d+">AISberg</a>')
    ROW = re.compile(r'<li><span class="date">([^<]*)</span>\s*<div>(.*?)</div>\s*</li>', re.S)
    path = PAGE

    def entries(self, text):
        out = []
        for m in self.ROW.finditer(text):
            t = re.search(r"<strong>(.*?)</strong>", m.group(2), re.S)
            out.append({"start": m.start(2), "end": m.end(2), "year": m.group(1),
                        "title": re.sub(r"<[^>]+>", "", t.group(1)) if t else ""})
        return out

    def add(self, body, url):
        body = self.LINK.sub("", body)
        if url is None:
            return body
        tail = body[len(body.rstrip()):]
        return body.rstrip() + f'\n            &nbsp;·&nbsp; <a href="{url}">AISberg</a>' + tail

class Cv:
    r"""cv/sections/publications.tex: each \cventry, its links in the fourth argument."""
    LINK = re.compile(r"(\\,\$\\cdot\$\\,|\\quad ?)\\publink\{https://hdl\.handle\.net/10446/\d+\}\{AISberg\}")
    path = CV

    def entries(self, text):
        out = []
        for m in re.finditer(r"\\cventry", text):
            if re.search(r"(?<!\\)%", text[text.rfind("\n", 0, m.start()) + 1:m.start()]):
                continue                                   # commented out
            i, args = m.end(), []
            while len(args) < 4 and i < len(text) and text[i] == "{":
                j = braces(text, i)
                args.append((i + 1, j - 1))
                i = j
            if len(args) == 4:
                label, title = text[args[0][0]:args[0][1]], text[args[1][0]:args[1][1]]
                out.append({"start": args[3][0], "end": args[3][1], "year": label, "title": title})
        return out

    def add(self, body, url):
        body = self.LINK.sub("", body)
        if url is None:
            return body
        sep = r"\,$\cdot$\," if r"\publink" in body else r"\quad "
        return body + sep + r"\publink{" + url + "}{AISberg}"

def match(records, doc, text, ents):
    """Entry index -> (record, how), each record used once."""
    for e in ents:
        e["dois"] = {d.lower().rstrip(".") for d in DOI_RE.findall(doc.add(text[e["start"]:e["end"]], None))}
    by_doi = {r["doi"]: r for r in records if r["doi"]}
    used, found = set(), {}
    def take(i, r, how):
        found[i] = (r, how); used.add(r["handle"])
    for i, e in enumerate(ents):
        r = next((by_doi[d] for d in e["dois"] if d in by_doi and by_doi[d]["handle"] not in used), None)
        if r:
            take(i, r, "DOI")
    for i, e in enumerate(ents):
        if i in found:
            continue
        free = [r for r in records if r["handle"] not in used]
        same = [r for r in free if norm(SAME_PAPER.get(r["handle"], "")) == norm(e["title"])]
        exact = [r for r in free if norm(r["title"]) == norm(e["title"])]
        ratio = lambda r: difflib.SequenceMatcher(None, norm(r["title"]), norm(e["title"])).ratio()
        close = [r for r in free if ratio(r) >= 0.9]
        if same:
            take(i, same[0], "same paper")
        elif exact:
            take(i, exact[0], "title")
        elif close:
            take(i, max(close, key=ratio), "close title")
    return found

def update(records, doc):
    text = doc.path.read_text()
    ents = doc.entries(text)
    found = match(records, doc, text, ents)
    pieces, last = [], 0
    for i, e in enumerate(ents):
        url = f"https://hdl.handle.net/{found[i][0]['handle']}" if i in found else None
        pieces += [text[last:e["start"]], doc.add(text[e["start"]:e["end"]], url)]
        last = e["end"]
    doc.path.write_text("".join(pieces) + text[last:])
    hows = [how for _, how in found.values()]
    print(f"\n{doc.path.relative_to(ROOT)}: {len(ents)} entries, {len(found)} linked ("
          + ", ".join(f"{hows.count(h)} by {h}" for h in ("DOI", "title", "close title", "same paper")) + ")")
    for i, (r, how) in sorted(found.items()):
        if how != "title" and norm(r["title"]) != norm(ents[i]["title"]):
            print(f"  title differs ({how}): {ents[i]['title']!r}\n      AISberg {r['handle']}: {r['title']!r}")
    used = {r["handle"] for r, _ in found.values()}
    print("  On AISberg, not here:")
    for r in records:
        if r["handle"] not in used:
            print(f"    {r['year']}  {r['title']}  ({r['venue'] or r['type']}; {r['handle']})")
    print("  Here, not on AISberg:")
    for i, e in enumerate(ents):
        if i not in found:
            print(f"    {e['year']}  {e['title']}")

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cached", action="store_true", help="use tools/aisberg.json instead of fetching")
    args = ap.parse_args()
    if args.cached:
        records = json.loads(CACHE.read_text())
    else:
        records = fetch()
        CACHE.write_text(json.dumps(records, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(records)} AISberg records")
    update(records, Page())
    update(records, Cv())

if __name__ == "__main__":
    main()
