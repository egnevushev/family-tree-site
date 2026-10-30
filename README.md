# Family tree — a site for your own archive

**Live demo: https://egnevushev.github.io/family-tree-site/app/**

A static site for genealogical research. Every link and every fact cites a document, and reliability is shown by the kind of source: a document of the time, a publication, the family's word, someone else's tree. The site never invents confidence percentages.

What it does:

- **tree** with the branches of the family; the weight and dash of a line show what the link rests on;
- **person cards**: life story, timeline, family, documents with links to scans;
- **scan viewer** with a box around the record that matters;
- **disagreements** (⚑) and decisions about them;
- **hypotheses**: possible kinship drawn dashed, never mixed with what is proven;
- **«This is me» and «How related»**: the kinship of any two people;
- **map of places**, **all documents** by place and by year, **«On this day»**;
- **finds**: the most surprising things from the archives on a ribbon of years; a find opens in place beside its scan, can be shared by link, and once the reader has pressed «This is me» every name in it says how that person is related to them;
- **«new» dots**, kept in each reader's browser: on a find not read yet (and «updated» on one rewritten since), on a person whose life story is new or rewritten since the reader's first visit, on the Finds button and on «What's new»;
- **book of stories** and printing the tree on A3;
- **«What's new»** and **«Help fill in»** — questions to the family;
- **a short video** about the site, shown at the first visit and under «?», in each language;
- **two languages**, English and Russian, with a switch in the header: the interface and, where they are translated, the data.

`data/` now holds a **demo family**: the Sokolovs, Belovs and Vershinins, written in English and Russian. All people, documents and archive references are invented, and the «scans» are drawn by a script. Replace it with your own data.

## Quick start

You need Python 3 (3.9 or newer) and Pillow (`pip install pillow`); for PDF pages also `pypdfium2`.

```sh
python3 scripts/build_media.py   # copies of scans for the site → site-media/
python3 scripts/build.py         # checks the data → app/data.js
python3 scripts/serve.py         # http://127.0.0.1:8765/app/
```

`build.py` stops with a clear message when a reference leads nowhere, a fact has no source, a forbidden word got into a story, and so on. The site is plain files: put the whole folder on any static hosting (GitHub Pages, Netlify, your own nginx) and open `/app/`. On GitHub Pages: Settings → Pages → Deploy from a branch, `main`, `/ (root)`; the `index.html` at the root leads to `app/`.

## Your own family instead of the demo

The demo files refer to demo people, so replacing `family.json` alone will not work: the build stops at the first foreign reference. Do it in this order:

1. Delete `data/stories/*`, `data/site-evidence.json`, `data/site-hypotheses.json`, `data/site-places.json`, `data/site-questions*.md`, `data/site-finds*.md`, `data/changelog*.md`, `data/site-personal.json`.
2. Delete `sources/*` and `site-media/*`.
3. Write your own `data/family.json` (format below; `root_person_id` is where the tree opens) and edit `data/site.json`: title, text, branches with `head` set to ids of your own people. A branch whose `head` does not exist quietly disappears.
4. Put your files into `sources/` and run `python3 scripts/build_media.py`, then `python3 scripts/build.py`.
5. Keep the base map as it is (Eastern Europe) or rebuild it for your places (see «Map»).

Then bring back what you need one by one: stories, places, boxes on scans, questions, finds.

**About privacy.** Everything in `data/`, `app/data.js` and `site-media/` is visible on the site. There is no password. If you publish it openly, first decide what may be shown about living people. If the repository is public, keep your data in a private copy.

## How it is built

```
data/family.json          the canon: people, facts, links, sources, disagreements
data/site.json            settings: title, «About» text, branches, contacts, languages
data/stories/<id>.md      life stories (only facts with references [C…] [R…] [X…] [S:…])
data/changelog.md         «What's new»
data/site-questions.md    «Help fill in»
data/site-finds.md        «Finds»
data/site-places.json     places for the map
data/site-evidence.json   PDF pages and boxes on scans
data/site-hypotheses.json possible kinship
data/site-personal.json   people the family knows itself
data/site-merges.json     (optional) several records of one person on one card
data/site-words.json      words that stop the build
data/site-map-base.json   base map (Natural Earth)
sources/                  your files: scans, PDFs, texts
scripts/                  the build
app/                      the site itself (HTML, CSS, JS, no frameworks)
```

`app/data.js` and `site-media/` are generated; do not edit them by hand.

All optional files can be deleted: the site does without stories, places, hypotheses, questions and finds (without finds the switch has no fourth button).

## Languages

The site speaks English and Russian. The reader switches with the EN/RU button in the header, and the choice is kept in their browser. Without a choice the site opens in `lang` of `data/site.json` (English in the demo).

- `languages` lists the languages offered, for example `["en"]` to hide the switch.
- The interface is translated by the site itself: buttons, status names, fact labels (`birth`, `marriage`…), kinship words («first cousin twice removed» in English, «двоюродный прадед» in Russian).
- **Any text of the data may be written in both languages** as `{"en": "…", "ru": "…"}`: a name, a fact's value, locator and note, a source title, a disagreement, a place name, a box label, every text of `site.json` and `site-hypotheses.json`. A plain string is shown in every language, so dates, ids and untranslated texts need nothing. When one language is missing, the other is shown.

```json
{"id": "C021", "person_id": "ivan", "field": "death",
 "value": {"en": "1942, killed on the Volkhov Front", "ru": "1942, погиб на Волховском фронте"},
 "locator": {"en": "vol. 3, p. 112", "ru": "т. 3, с. 112"}, "...": "..."}
```

- Stories, `changelog.md`, `site-questions.md` and `site-finds.md` are written in the site's `lang`; a translation lies beside them as `<name>.<lang>.md`: `stories/ivan.md` and `stories/ivan.ru.md`, `changelog.md` and `changelog.ru.md`. The front matter (`written`, `checked`) is read from the main file; «What's new» entries use the same headings in both files, and a translation of the finds holds the same finds, with the same people, years and document.
- Names are read into surname, given name and patronymic, Cyrillic or Latin («Sokolova (Belova) Zinaida Petrovna»), and a woman is told from a man by the patronymic or the surname ending. Where that fails, set `"sex": "f"` or `"m"` on the person. Other names are shown as written.
- Town names of the base map come in both languages from Natural Earth.

## data/family.json

```json
{
  "schema_version": 1,
  "updated": "2026-01-15",
  "title": "…",
  "root_person_id": "andrey",
  "status_labels": {"primary_document": "В документе эпохи", "…": "…"},
  "people": [],
  "claims": [],
  "relationships": [],
  "sources": [],
  "conflicts": []
}
```

**Person** (`people`):

```json
{"id": "ivan", "name": {"en": "Sokolov Ivan Matveevich", "ru": "Соколов Иван Матвеевич"}, "group": "historical", "status": "primary_document",
 "birth": "1898-01-14", "death": "1942", "note": "", "media": []}
```

- `id` — in Latin letters; it is also the address of the card (`#p=ivan`) and the file name of the story.
- `name` — «Surname Given-name Patronymic». A maiden name goes in brackets: «Sokolova (Belova) Zinaida Petrovna». A name that does not split into parts is shown as written.
- `birth`, `death` — ISO (`1898-01-14`, `1898-01`, `1898`) or text («ок. 1868»).
- `media` — ids of photo sources for the portrait.
- Optional fields:
  - `sex` — `"f"` or `"m"`, when the name does not tell;
  - `date_display` — the date shown on the card with references to facts (see `matvey` in the demo);
  - `off_tree: true` — the record stays in the database but is not drawn on the tree.

**Fact** (`claims`):

```json
{"id": "C019", "person_id": "ivan", "field": "birth", "value": "1898-01-14", "status": "primary_document",
 "source_ids": ["D-1-1-12"], "locator": "л. 3 об., № 3", "note": ""}
```

- `field` — for example `birth`, `baptism`, `death`, `marriage`, `occupation`, `education`, `service`, `military_event`, `residence`, `arrest`, `rehabilitation`, `canonization`, `identification`. The labels are `FIELDS` and `FIELDS_EN` in `app/app.js`. Dated facts go into the timeline.
- `decided_by` (optional) — `{"by": "…", "date": "…", "note": "…"}`: the status is set by the family's decision, not by a document. The site shows the date and the note.

**Link** (`relationships`): `kind` is `parent` (`from_id` is the parent), `spouse` or `sibling`.

```json
{"id": "R019", "from_id": "matvey", "to_id": "ivan", "kind": "parent", "status": "primary_document",
 "source_ids": ["D-1-1-12"], "note": ""}
```

**Source** (`sources`):

```json
{"id": "D-1-1-12", "title": "…", "kind": "archival_scan", "local_path": "sources/archive/….jpg",
 "url": "https://…", "download_status": "saved"}
```

- `local_path` — an image, a PDF or a text (`.txt`, `.md`). Without a file, give only `url`.
- `kind: research_note` is shown apart, as a «Research note».
- `historical_photo` can serve as a portrait.

**Disagreement** (`conflicts`):

```json
{"id": "X01", "title": "…", "people": ["ivan"], "source_ids": ["…"], "detail": "…", "resolution": "…",
 "state": "open"}
```

`state` is `open`, `resolved_by_document` or `resolved_by_decision`. An open one puts ⚑ on the card.

### Statuses

| Status | When |
|---|---|
| `primary_document` | read on the image of a document of the time: a parish register, a census, a certificate |
| `publication` | printed (a book, a book of remembrance, a hagiography); the original not read |
| `index_record` | a line of an index or a database |
| `family_testimony` | the family's word, or a family document with no archive copy |
| `inference` | a conclusion from at least two independent matches and no contradiction; no direct record |
| `archive_lead` | an archive lead: it is known where to look |
| `chart_only` | only a family chart |
| `unverified_tree` | someone else's tree, not checked |
| `unknown` | the ground is unknown |

A line is drawn by its weakest parent. Only a document raises a status. Matching names are not kinship yet: do not merge people of the same name without a direct document (to show them on one card there is `site-merges.json`).

## data/site.json

```json
{
  "title": {"en": "The Sokolovs and the Vershinins", "ru": "Соколовы и Вершинины"},
  "lang": "en",
  "languages": ["en", "ru"],
  "about": "Text under «?»",
  "branches": [{"id": "sokolovy", "title": {"en": "Sokolovs", "ru": "Соколовы"}, "head": "nikolay"}],
  "recipient": "the keeper of the tree",
  "contact": "Write to: **mail@example.com**",
  "inbox_url": "",
  "intro_video": {"en": "../site-media/intro-en.mp4", "ru": "../site-media/intro-ru.mp4"},
  "intro_poster": {"en": "../site-media/intro-en.jpg", "ru": "../site-media/intro-ru.jpg"},
  "source_url": "https://github.com/egnevushev/family-tree-site"
}
```

- `branches` — the branches of the family. Usually one per grandparent of the root person; `head` is the id of that person. A branch holds their ancestors, the ancestors' descendants and those who married in. Colours follow the order, up to six branches.
- `contact` — text shown instead of the message form. There is no form until `inbox_url` is set: no server for messages is included. The protocol is described at `bindForm` in `app/app.js`: `POST <inbox_url>file` for each file, then `POST <inbox_url>send` with JSON; the answer is `{ok, id}` or `{error}`.
- `intro_video` and `intro_poster` — the video about the site and its still, paths from `app/`, one per language. A new reader sees it once; later it is under «?». Leave them out and there is no video.
- `source_url` — a link to the code of the site at the foot of «?». Point it at your own repository or leave it out.

## Stories, «What's new», questions, finds

A story is `data/stories/<person id>.md`:

```markdown
---
written: 2026-01-15
checked: C047 R020 X02
---
Ivan Matveevich Sokolov was born on 14 January 1898… [C019][C020][R019]
```

- `checked` — up to which numbers of facts, links and disagreements the story was checked. If newer facts about the person appear, `build.py` warns.
- `**bold**` works.
- The formats of `changelog.md`, `site-questions.md` and `site-finds.md` are described at the top of the files themselves. The keys of questions may be Russian or English (`About:`, `Status:`, `Known:`, `Missing:`, `How to help:`, `## Disagreements`), and so may those of finds (`Years:`, `Where:`, `People:`, `Document:`, `In short:`, `Rests on:`).
- A find is a short story for the whole family: `## <id>: <title>`, the key lines, then the paragraphs with references. The id is its address on the site (`#finds=<id>`). `Document:` is optional: a fact `C…` whose source has a scan in `site-media/`, shown beside the find.

## Rules the build checks

- **Children under 18** (a year of birth, no date of death) are shown by name and year of birth only. The site has no stories, notes, full dates or questions about them.
- **The living** — no date of death and born in 1930 or later, or listed in `site-personal.json`. Their full birth dates must not appear in «What's new».
- **Words of `site-words.json`** outside quotes stop the build in stories, «What's new», hypotheses, questions and finds. For example, kinship counted from the author («great-grandfather») when the whole family reads the site. Direct speech in «…» is not checked. The list may be empty.
- References `[C…]`, `[R…]`, `[X…]`, `[S:…]` must lead to existing records.
- A find names only existing people and no child, and its `Document:` must have a scan on the site.

## Scans and boxes

- `scripts/build_media.py` publishes only cited sources:
  - an image — a reduced JPEG and a lighter copy;
  - a PDF — only the pages of `data/site-evidence.json` (`"pages": [3, 4]`);
  - texts — as they are.
- A box around a record is given in fractions of width and height:

```json
"D-1-1-12": {"boxes": [{"box": [0.04, 0.39, 0.96, 0.49], "page": null, "label": "No. 3, Ioann",
                         "for": ["C019", "R019"], "checked": "2026-01-15: from the image"}]}
```

`python3 scripts/site_evidence.py check` checks this file against `family.json`.

## Map

- In `data/site-places.json` each place has coordinates and their source (`https`), the ids of the facts bound to it and the forms of its name (`forms`).
- `kind`: `village`, `city`, `monastery` or `far` (far away, no point on the map).
- The base map comes from Natural Earth (public domain). The nine `.geojson` files are listed in `FILES` in `scripts/site_map_base.py`; download them from `github.com/nvkelso/natural-earth-vector/tree/master/geojson`. After editing the places, rebuild the base:

```sh
python3 scripts/site_map_base.py <folder with the .geojson files>
```

- The frame of the base is Eastern Europe for now (`BOX` in the same script).

## The video

`scripts/promo/` makes the video: a headless Chrome walks through the site with a drawn pointer and captions, and ffmpeg joins the frames with the music. You need Node with Playwright (`npm i playwright`, or `PLAYWRIGHT_PATH` to a copy) and Chrome, and ffmpeg.

```sh
python3 scripts/serve.py &
sh scripts/promo/make.sh en       # site-media/intro-en.mp4 and intro-en.jpg
sh scripts/promo/make.sh ru
```

The scenes in `scripts/promo/record.cjs` walk through the demo family; for your own, change the people, the line and the search words there. The music is `scripts/promo/music.m4a`; `MUSIC=<file>` puts another under it, and without the file `music.py` writes a quiet tune.

## Where it comes from

The site was made for a private family archive; this is its engine with demo data.
