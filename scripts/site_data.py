#!/usr/bin/env python3
"""Browser data for the site: the canon, cited sources only, page views and stories.

Called by build.py; run alone it writes app/data.js (or --out). Sources that no
person, claim, relationship or conflict cites are left out; each cited source
carries its published page images (site-media/) and record boxes.
Stories come from data/stories/<person-id>.md: optional front matter, then prose
with references [C123], [R011], [X01] or [S:A88].
Rules (README.md, «Rules the build checks»): a living child under 18 is shown by name and year only; the words of
data/site-words.json stop the build outside quotes; «What's new» names no living person's birth date and
has one entry per heading with its headline first; «Known personally» comes from data/site-personal.json; the
page «Help fill in» takes its questions from data/site-questions.md, the page «Finds» its finds from data/site-finds.md.
The settings of the site (title, branches, contacts) come from data/site.json.
Texts of the data may be {"ru": …, "en": …}; a story, data/changelog.md, data/site-questions.md and data/site-finds.md
are written in the site's "lang", and <name>.<other lang>.md beside them is their translation. The site picks the
reader's language.
"""
import argparse
import copy
import datetime
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from site_evidence import citations, flat, load_canon, load_evidence
from site_places import places_payload

ROOT = Path(__file__).resolve().parents[1]
REF = re.compile(r'\[(C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]')
MONTHS = ('января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря')


def birth_date(person):
    """(year, full date or None) of a birth written as ISO or with a year somewhere in it."""
    text = str(person.get('birth') or '')
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', text)
    if m:
        return int(m[1]), datetime.date(int(m[1]), int(m[2]), int(m[3]))
    m = re.search(r'\b(1[5-9]\d\d|20\d\d)\b', text)
    return (int(m[1]), None) if m else (None, None)


def minors(people, today):
    """Living people under 18 on the build day. With the year alone, the latest possible birthday decides."""
    out = set()
    for p in people:
        y, full = birth_date(p)
        if p.get('death') or y is None:
            continue
        if full:
            adult = datetime.date(full.year + 18, full.month, min(full.day, 28 if full.month == 2 else 31)) <= today
        else:
            adult = datetime.date(y + 18, 12, 31) <= today
        if not adult:
            out.add(p['id'])
    return out


def child_view(data, kids):
    """A child is shown by name and year of birth only — no story, notes, other facts or full dates."""
    for p in data['people']:
        if p['id'] in kids:
            p.update(birth=str(birth_date(p)[0]), note='', media=[])
            p.pop('date_display', None)
    claims = []
    for c in data['claims']:
        if c['person_id'] in kids:
            if c['field'] not in ('name', 'birth'):
                continue
            c.update(note='', locator='')
            c.pop('decided_by', None)  # its note is a text about the child too
            if c['field'] == 'birth':
                c['value'] = str(birth_date({'birth': flat(c['value'])})[0] or '')
        claims.append(c)
    data['claims'] = claims
    for r in data['relationships']:
        if {r['from_id'], r['to_id']} & kids:
            r['note'] = ''
            r.pop('decided_by', None)
    return [f'conflict {x["id"]} concerns a child under 18 — of children the site shows only the name and year'
            for x in data['conflicts'] if set(x['people']) & kids]


QUOTED = re.compile(r'«[^«»]*»|„[^„“]*“|“[^“”]*”|"[^"\n]*"')


def unquoted(text):
    """The text with quoted speech blanked out; positions stay where they were."""
    prev = None
    while prev != text:
        prev, text = text, QUOTED.sub(lambda m: ' ' * len(m[0]), text)
    return text


def word_hits(texts, rules):
    """texts: [(place, text)] → (forbidden words, words to look at, exceptions that match nothing any more).

    A hit is (place, word, a little text around it). Quoted speech is not checked; an exception is a place
    and an exact phrase, and it excuses only the words inside that phrase."""
    words = [re.compile(w, re.I) for w in rules['words']]
    warn = [re.compile(w, re.I) for w in rules.get('warn', [])]
    exceptions = rules.get('exceptions', [])
    used, hits, soft = set(), [], []
    for place, text in texts:
        if not text:
            continue
        plain = unquoted(text)
        excused = []
        for i, e in enumerate(exceptions):
            if e['where'] == place:
                spans = [(m.start(), m.end()) for m in re.finditer(re.escape(e['phrase']), plain)]
                excused += spans
                if spans:
                    used.add(i)
        def found(patterns):
            # One hit per stretch of text: one word matched by two patterns is one hit.
            out = []
            for m in sorted((m for p in patterns for m in p.finditer(plain)), key=lambda m: (m.start(), -m.end())):
                if not any(a <= m.start() and m.end() <= b for a, b in excused) and not (out and m.start() < out[-1].end()):
                    out.append(m)
            return out
        around = lambda m: ' '.join(plain[max(0, m.start() - 40):m.end() + 30].split())
        # The whole word the pattern matched in, for the message.
        word = lambda m: re.search(r'\w*$', plain[:m.start()])[0] + m[0] + re.match(r'\w*', plain[m.end():])[0]
        hits += [(place, word(m), around(m)) for m in found(words)]
        if place == 'changelog' or place.startswith('story:'):
            soft += [(place, word(m), around(m)) for m in found(warn) if not any(m.start() < h.end() and h.start() < m.end() for h in found(words))]
    stale = [e for i, e in enumerate(exceptions) if i not in used]
    return hits, soft, stale


def canon_texts(data, cited):
    """The texts of family.json the site shows: notes and values of people, facts, links, conflicts, source titles."""
    texts = [('person:' + p['id'], flat(p['note'])) for p in data['people']]
    texts += [('claim:' + c['id'], ' '.join(flat(v) for v in [c['value'], c['note'], c['locator'], c.get('decided_by', {}).get('note', '')])) for c in data['claims']]
    texts += [('relationship:' + r['id'], ' '.join(flat(v) for v in [r['note'], r.get('decided_by', {}).get('note', '')])) for r in data['relationships']]
    texts += [('conflict:' + x['id'], ' '.join(flat(v) for v in [x['title'], x['detail'], x.get('resolution') or ''])) for x in data['conflicts']]
    texts += [('source:' + s['id'], flat(s['title'])) for s in data['sources'] if s['id'] in cited]
    return texts


def living_dates_in_news(people, personal, text):
    """«What's new» says nothing personal about the living, so no birth date of a living person.
    Living: no date of death, and born in 1930 or later or known personally."""
    problems = []
    for p in people:
        y, full = birth_date(p)
        if p.get('death') or not full or (y < 1930 and p['id'] not in personal):
            continue
        forms = {full.isoformat(), full.strftime('%d.%m.%Y'), f'{full.day}.{full.month:02d}.{full.year}',
                 f'{full.day} {MONTHS[full.month - 1]} {full.year}'}
        problems += [f'data/changelog.md: birth date {form} — {p["name"]} is living; «What\'s new» says nothing personal about the living'
                     for form in sorted(forms) if re.search(r'(?<![\d.])' + re.escape(form) + r'(?![\d])', text)]
    return problems


MONTHS_EN = ('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')


def child_dates_in_texts(people, kids, texts):
    """Of a living child the site says the name and the year, so the full date of birth stands in no text of
    the site — not in the story of a parent either. texts: [(place, text)]; people carry the full dates."""
    problems = []
    for p in people:
        full = birth_date(p)[1]
        if p['id'] not in kids or not full:
            continue
        forms = {full.isoformat(), full.strftime('%d.%m.%Y'), f'{full.day}.{full.month:02d}.{full.year}',
                 f'{full.day} {MONTHS[full.month - 1]} {full.year}', f'{full.day} {MONTHS_EN[full.month - 1]} {full.year}',
                 f'{MONTHS_EN[full.month - 1]} {full.day}, {full.year}'}
        for place, text in texts:
            if text and any(re.search(r'(?<![\d.])' + re.escape(form) + r'(?![\d])', text) for form in forms):
                problems.append(f'{place}: the full birth date of a child under 18 ({p["name"]}) — of children the site shows only the name and year')
    return problems


def read_story(path):
    text = path.read_text()
    meta = {}
    if text.startswith('---\n'):
        head, text = text[4:].split('\n---\n', 1)
        for line in head.splitlines():
            key, _, value = line.partition(':')
            meta[key.strip()] = value.strip()
    return meta, text.strip()


def story_problems(data, stories):
    ids = {c['id'] for c in data['claims']} | {r['id'] for r in data['relationships']} | {x['id'] for x in data['conflicts']}
    sources = {s['id'] for s in data['sources']}
    problems = []
    for pid, story in stories.items():
        for ref in REF.findall(flat(story['text'])):
            if (ref[2:] not in sources) if ref.startswith('S:') else (ref not in ids):
                problems.append(f'data/stories/{pid}.md: no such reference [{ref}]')
    return problems


def read_changelog(path=ROOT / 'data/changelog.md'):
    """data/changelog.md → [{date, lead, groups: [{title, items}]}]: '## heading', the headline line, '**group**', '- item'.

    One entry per release: the heading (a date, «22.10.2026, evening» for a second release that day) is the
    entry's id on the site, so it is never repeated."""
    entries = []
    if not path.exists():
        return entries
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.rstrip()
        if line.startswith('## '):
            entries.append(dict(date=line[3:].strip(), lead='', groups=[]))
        elif not entries:
            continue
        elif line.startswith('**') and line.endswith('**'):
            entries[-1]['groups'].append(dict(title=line.strip('*').strip(), items=[]))
        elif line.startswith('- '):
            if not entries[-1]['groups']:
                entries[-1]['groups'].append(dict(title='', items=[]))
            entries[-1]['groups'][-1]['items'].append(line[2:].strip())
        elif line and not entries[-1]['groups']:
            entries[-1]['lead'] = (entries[-1]['lead'] + ' ' + line.strip()).strip()
        elif line and entries[-1]['groups'] and entries[-1]['groups'][-1]['items']:
            entries[-1]['groups'][-1]['items'][-1] += ' ' + line.strip()
    return entries


# A name in «What's new» may link to the person's card: [Ivan Petrovich](#p=ivan).
PERSON_LINK = re.compile(r'\[([^\]]+)\]\(#p=([^)\s]*)\)')


def changelog_problems(entries, people=None):
    problems, seen = [], set()
    for e in entries:
        for text in [e['lead'], *(i for g in e['groups'] for i in g['items'])]:
            for name, pid in PERSON_LINK.findall(text):
                if people is not None and pid not in people:
                    problems.append(f'data/changelog.md: entry «{e["date"]}» links [{name}](#p={pid}) — there is no such person')
    for e in entries:
        if e['date'] in seen:
            problems.append(f'data/changelog.md: heading «## {e["date"]}» repeats — one entry per release; a second release that day carries its time, say «{e["date"].split(",")[0]}, 14:05»')
        seen.add(e['date'])
        if not e['lead']:
            problems.append(f'data/changelog.md: entry «{e["date"]}» has no first line — the headline in one line before the groups')
    return problems


QUESTION = re.compile(r'## ([a-z0-9-]+): (.+)')
# The keys may be written in Russian or in English.
QUESTION_KEYS = {'О ком': 'people', 'Статус': 'status_ref', 'Знаем': 'known', 'Не хватает': 'missing', 'Чем помочь': 'help',
                 'About': 'people', 'Status': 'status_ref', 'Known': 'known', 'Missing': 'missing', 'How to help': 'help'}
CONFLICTS_HEADINGS = ('## Расхождения', '## Disagreements')
REQUESTS_HEADINGS = ('## Запросы', '## Requests')
REQUEST_LINE = re.compile(r'- (\S+?)(?: \[([^\]]*)\])?: (.+)')
# What the site says of a request by its status in requests/<id>/request.md; other statuses are not shown.
REQUEST_SHOWN = {'sent': 'sent', 'draft': 'prepared', 'ready': 'prepared', 'answered': 'answered'}


def read_questions(path=ROOT / 'data/site-questions.md'):
    """data/site-questions.md → {main: [{id, title, people, status_ref, known, missing, help}], conflicts: [{id, ask}],
    requests: [{id, people, text}]}.

    The page «Help fill in»: main questions written by hand, «## <id>: <question>» with lines «Key: text»;
    under «## Disagreements» (or «## Расхождения») the conflicts the family can clear up, «- X…: what to ask». Text before the first
    «## » is for editors only. Under «## Requests» (or «## Запросы») the letters to archives still waiting for an
    answer, «- <request id> [people]: what was asked», shown as «Waiting for the archives»."""
    out = dict(main=[], conflicts=[], requests=[])
    if not path.exists():
        return out
    section, key = None, None
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.rstrip()
        if line.startswith('## '):
            m = QUESTION.fullmatch(line)
            if line in REQUESTS_HEADINGS:
                section = 'requests'
            elif line in CONFLICTS_HEADINGS:
                section = 'conflicts'
            elif m:
                section = 'main'
                out['main'].append(dict(id=m[1], title=m[2].strip(), people=[], status_ref='', known='', missing='', help=''))
            else:
                section = 'bad'
                out.setdefault('bad', []).append(line)
            key = None
        elif section == 'conflicts' and line.startswith('- '):
            xid, _, ask = line[2:].partition(':')
            out['conflicts'].append(dict(id=xid.strip(), ask=ask.strip()))
        elif section == 'requests' and line.startswith('- '):
            m = REQUEST_LINE.fullmatch(line)
            out['requests'].append(dict(id=m[1], people=[i.strip() for i in (m[2] or '').split(',') if i.strip()], text=m[3].strip())
                                   if m else dict(id=line[2:].split(':')[0].strip(), people=[], text=''))
        elif section == 'main' and line:
            name, sep, value = line.partition(':')
            if sep and name in QUESTION_KEYS:
                key = QUESTION_KEYS[name]
                q = out['main'][-1]
                q[key] = [i.strip() for i in value.split(',') if i.strip()] if key == 'people' else value.strip()
            elif key and key not in ('people', 'status_ref'):
                out['main'][-1][key] += ' ' + line.strip()
    return out


def request_states(requests_dir=None):
    """{request id: (what the site says — sent, prepared, answered or '' when not shown, date of that status)}
    from the journals in requests/<id>/request.md: the last line «- YYYY-MM-DD · <status> · …» under «## Журнал»
    (or «## Journal»). Without the folder there are no requests."""
    out = {}
    for path in sorted((requests_dir or ROOT / 'requests').glob('*/request.md')):
        text = path.read_text(encoding='utf-8')
        journal = re.findall(r'^- (\d{4}-\d{2}-\d{2}) · (\S+) · ', re.split(r'\n## (?:Журнал|Journal)\n', text, maxsplit=1)[-1], re.M)
        if journal:
            out[path.parent.name] = (REQUEST_SHOWN.get(journal[-1][1], ''), journal[-1][0])
    return out


def request_problems(data, questions, kids, states):
    """«Waiting for the archives»: only requests that exist and are under way, about people of the tree, not children."""
    where = 'data/site-questions.md: «Requests»'
    people = {p['id'] for p in data['people']}
    problems, seen = [], set()
    for item in questions['requests']:
        name = f'{where} — {item["id"]}'
        if item['id'] in seen:
            problems.append(f'{name} repeats')
        seen.add(item['id'])
        if item['id'] not in states:
            problems.append(f'{name}: there is no such request in requests/')
        elif not states[item['id']][0]:
            problems.append(f'{name}: the request is closed, refused or not prepared yet — remove the line')
        if not item['text']:
            problems.append(f'{name}: write «- <id> [people]: text for the family»')
        problems += [f'{name}: no person {i}' for i in item['people'] if i not in people]
        problems += [f'{name}: {i} is a child under 18' for i in item['people'] if i in kids]
    return problems


def read_history(branches, path=ROOT / 'data/site-history.json'):
    """The background of the times for the life line and the page «Time»: [{year, end?, text, major?, branches?}],
    by year; text may be {"ru": …, "en": …}; branches are ids of data/site.json."""
    if not path.exists():
        return [], []
    events = json.loads(path.read_text(encoding='utf-8'))['events']
    problems = []
    for i, e in enumerate(events):
        name = f'data/site-history.json: event {i + 1}'
        texts = e.get('text') if isinstance(e.get('text'), dict) else {'': e.get('text')}
        if not isinstance(e.get('year'), int) or not 1500 < e['year'] < 2100 or not all(str(t or '').strip() for t in texts.values()):
            problems.append(f'{name}: year (a number) and text are needed')
            continue
        if 'end' in e and (not isinstance(e['end'], int) or e['end'] <= e['year']):
            problems.append(f'{name} ({e["year"]}): end must be a year after year')
        extra = set(e) - {'year', 'end', 'text', 'major', 'branches'}
        if extra or set(e.get('branches', [])) - set(branches):
            problems.append(f'{name} ({e["year"]}): extra fields or an unknown branch')
    return sorted((e for e in events if isinstance(e.get('year'), int)), key=lambda e: (e['year'], e.get('end', e['year']))), problems


def question_problems(data, questions, kids):
    """The page «Help fill in» refers only to what exists, asks nothing about children, and lists open conflicts."""
    where = 'data/site-questions.md'
    people = {p['id'] for p in data['people']}
    records = {x['id']: x for key in ('claims', 'relationships', 'conflicts') for x in data[key]}
    sources = {s['id'] for s in data['sources']}
    problems = [f'{where}: unclear heading «{line}» — «## <id>: <question>» or «## Disagreements» is needed' for line in questions.get('bad', [])]
    seen = set()
    for q in questions['main']:
        name = f'{where}: question {q["id"]}'
        if q['id'] in seen:
            problems.append(f'{name} repeats')
        seen.add(q['id'])
        problems += [f'{name}: no line «{label}:»' for label, key in list(QUESTION_KEYS.items())[5:] if key != 'people' and not q[key]]
        problems += [f'{name}: no person {i}' for i in q['people'] if i not in people]
        problems += [f'{name}: {i} is a child under 18 — of children the site shows only the name and year' for i in q['people'] if i in kids]
        if q['status_ref'] and (q['status_ref'] not in records or 'status' not in records[q['status_ref']]):
            problems.append(f'{name}: «Status:» needs a C… or R… of the database, not {q["status_ref"]}')
        for ref in REF.findall(' '.join([q['known'], q['missing'], q['help']])):
            if (ref[2:] not in sources) if ref.startswith('S:') else (ref not in records):
                problems.append(f'{name}: no such reference [{ref}]')
    xs = {x['id']: x for x in data['conflicts']}
    for item in questions['conflicts']:
        x = xs.get(item['id'])
        if not x:
            problems.append(f'{where}: «Disagreements» — no conflict {item["id"]}')
        elif (x.get('state') or 'open') != 'open':
            problems.append(f'{where}: «Disagreements» — {item["id"]} is settled already ({x["state"]}); remove it')
        elif set(x['people']) & kids:
            problems.append(f'{where}: «Disagreements» — {item["id"]} concerns a child under 18')
        if not item['ask']:
            problems.append(f'{where}: «Disagreements» — {item["id"]} has no question to the family after the colon')
    return problems


FIND = re.compile(r'## ([a-z0-9-]+): (.+)')
# The keys may be written in Russian or in English.
FIND_KEYS = {'Годы': 'years', 'Где': 'where', 'Люди': 'people', 'Документ': 'doc', 'Коротко': 'lead', 'Держится': 'weak',
             'Years': 'years', 'Where': 'where', 'People': 'people', 'Document': 'doc', 'In short': 'lead', 'Rests on': 'weak'}


def read_finds(path=ROOT / 'data/site-finds.md'):
    """data/site-finds.md → [{id, title, years, where, people, doc, lead, weak, text}].

    The page «Finds»: the most surprising finds, written by hand for the whole family. «## <id>: <title>», then lines
    «Key: text», then after an empty line the paragraphs of the story. Text before the first «## » is for editors only."""
    finds = []
    for line in (path.read_text(encoding='utf-8').splitlines() if path.exists() else []):
        line = line.rstrip()
        if line.startswith('## '):
            m = FIND.fullmatch(line)
            finds.append(dict(id=m[1], title=m[2].strip(), years='', where='', people=[], doc='', lead='', weak='', text='')
                         if m else dict(bad=line))
            continue
        if not finds or 'bad' in finds[-1]:
            continue
        f = finds[-1]
        name, sep, value = line.partition(':')
        if not f['text'] and sep and name in FIND_KEYS:
            key = FIND_KEYS[name]
            f[key] = [i.strip() for i in value.split(',') if i.strip()] if key == 'people' else value.strip()
        else:
            f['text'] += line + '\n'
    for f in finds:
        if 'text' in f:
            f['text'] = f['text'].strip()
    return finds


def find_problems(data, finds, kids, media, where='data/site-finds.md'):
    """«Finds» refer only to what exists, say nothing about children, and show a scan the site has."""
    people = {p['id'] for p in data['people']}
    claims = {c['id']: c for c in data['claims']}
    records = set(claims) | {x['id'] for key in ('relationships', 'conflicts') for x in data[key]}
    sources = {s['id']: s for s in data['sources']}
    problems, seen = [], set()
    for f in finds:
        if 'bad' in f:
            problems.append(f'{where}: unclear heading «{f["bad"]}» — «## <id>: <title>» is needed')
            continue
        name = f'{where}: find {f["id"]}'
        if f['id'] in seen:
            problems.append(f'{name} repeats')
        seen.add(f['id'])
        problems += [f'{name}: no line «{label}:»' for label, key in list(FIND_KEYS.items())[6:] if key not in ('weak', 'doc') and not f[key]]
        if not f['text']:
            problems.append(f'{name}: no story after the lines «Key: text»')
        problems += [f'{name}: no person {i}' for i in f['people'] if i not in people]
        problems += [f'{name}: {i} is a child under 18 — of children the site shows only the name and year' for i in f['people'] if i in kids]
        # The scan beside a find: a cited source of that claim with published page images (site-media/).
        if f['doc'] and not any(media.get(s, {}).get('views') for s in claims.get(f['doc'], {}).get('source_ids', [])):
            problems.append(f'{name}: «Document:» needs a C… of the database whose source has an image, not {f["doc"]}')
        for ref in REF.findall(' '.join([f['lead'], f['weak'], f['text']])):
            if (ref[2:] not in sources) if ref.startswith('S:') else (ref not in records):
                problems.append(f'{name}: no such reference [{ref}]')
    return problems


def find_translation_problems(base, other, where):
    """A translation of «Finds» holds the same finds as the main file, with the same people, years and document."""
    key = lambda fs: {f['id']: (f['people'], f['doc'], re.findall(r'\d{4}', f['years'])) for f in fs if 'bad' not in f}
    a, b = key(base), key(other)
    problems = [f'{where}: find {i} is missing' for i in a if i not in b]
    problems += [f'{where}: find {i} is not in the main file' for i in b if i not in a]
    problems += [f'{where}: find {i} — «People:», «Document:» or «Years:» differ from the main file' for i in a if i in b and a[i] != b[i]]
    return problems


def dump_js(site, name='window.FAMILY_DATA'):
    """The browser file: one record per line, so a Git diff of app/data.js shows the records that changed."""
    one = lambda v: json.dumps(v, ensure_ascii=False)
    parts = []
    for key, value in site.items():
        if isinstance(value, list) and value:
            body = '[\n' + ',\n'.join(one(v) for v in value) + '\n]'
        elif isinstance(value, dict) and len(value) > 8:
            body = '{\n' + ',\n'.join(f'{one(k)}: {one(v)}' for k, v in value.items()) + '\n}'
        else:
            body = one(value)
        parts.append(f'{one(key)}: {body}')
    return name + ' = {\n' + ',\n'.join(parts).replace('</', '<\\/') + '\n};\n'


def text_hash(text):
    """The same short hash of a text as textHash in the app (djb2 with xor over UTF-16 units, in base 36): the
    build can say «this story, this find is the one you have read» without the browser hashing every text."""
    h = 5381
    for ch in text:
        unit = ord(ch)
        if unit > 0xFFFF:  # the app takes the first UTF-16 unit of a character outside the basic plane
            unit = 0xD800 + ((unit - 0x10000) >> 10)
        h = ((h * 33) & 0xFFFFFFFF) ^ unit
    digits, out = '0123456789abcdefghijklmnopqrstuvwxyz', ''
    while h:
        h, r = divmod(h, 36)
        out = digits[r] + out
    return out or '0'


def load_js(text):
    """The object a file written by dump_js assigns."""
    return json.loads(text.split('=', 1)[1].rstrip().rstrip(';'))


# Sections the first screen does not need, by the part that carries them: each part is its own file,
# app/data-<part>.js, which the app loads when a page asks for it (and ahead of time, once the tree is drawn).
# The core, app/data.js, names the parts and the hash of each, so a part is cached like any other script.
# A section may be listed here only once the app asks for its part before reading it.
PARTS = {'map': ['map_base'], 'finds': ['finds']}
# What the core keeps of a section that moved into a part — enough for the first screen to mark what is new:
#   map_base         -> map_projection: the numbers the map and the place lists are computed with;
#   finds            -> find_hashes {id: hash of the text}: the dot «есть непрочитанные находки»;
#   changelog_older  -> the entries of «Что нового» past the newest NEWS_IN_CORE (the app shows them under
#                       «Раньше»); the core keeps the newest ones and news_dates, the headings of all.
NEWS_IN_CORE = 5
DIGESTS = ('map_projection', 'find_hashes', 'news_dates')


def find_hash(find):
    """findHash of the app: the reader's mark «this find is read» is this hash of its text."""
    return text_hash(find['title'] + find['lead'] + find['text'] + (find.get('weak') or ''))


def site_files(site, parts=None):
    """{file name: text} of the browser data: the core data.js and one data-<part>.js per part."""
    parts = PARTS if parts is None else parts
    moved = {key for keys in parts.values() for key in keys}
    site = dict(site)
    if 'changelog_older' in moved:
        news = site.get('changelog', [])
        site['news_dates'] = [entry['date'] for entry in news]
        site['changelog'], site['changelog_older'] = news[:NEWS_IN_CORE], news[NEWS_IN_CORE:]
    if 'map_base' in moved:
        site['map_projection'] = (site.get('map_base') or {}).get('projection')
    if 'finds' in moved:
        # Finds in several languages ({lang: [...]}) are marked by the texts in the site's own language.
        finds = site.get('finds', [])
        if isinstance(finds, dict):
            finds = finds.get((site.get('site') or {}).get('lang') or 'en') or next(iter(finds.values()), [])
        site['find_hashes'] = {find['id']: find_hash(find) for find in finds}
    files, index = {}, {}
    for name, keys in parts.items():
        text = dump_js({k: site[k] for k in keys}, 'window.FAMILY_DATA_' + name)
        files[f'data-{name}.js'] = text
        index[name] = dict(file=f'data-{name}.js', v=hashlib.sha256(text.encode()).hexdigest()[:12], keys=list(keys))
    core = {k: v for k, v in site.items() if k not in moved}
    if index:
        core['parts'] = index
    return {'data.js': dump_js(core), **files}


def write_site(site, folder=ROOT / 'app'):
    """Write the browser data into app/ and remove the part files that are parts no more; returns the file names."""
    files = site_files(site)
    for name, text in files.items():
        (folder / name).write_text(text, encoding='utf-8')
    for stale in folder.glob('data-*.js'):
        if stale.name not in files:
            stale.unlink()
    return sorted(files)


def read_site(folder=ROOT / 'app'):
    """The whole site data back from a folder, as payload() gave it: the core with every part merged in and
    the core's digests of the parts dropped; and {file name: text}."""
    texts = {'data.js': (folder / 'data.js').read_text(encoding='utf-8')}
    site = load_js(texts['data.js'])
    for part in site.pop('parts', {}).values():
        texts[part['file']] = (folder / part['file']).read_text(encoding='utf-8')
        site.update(load_js(texts[part['file']]))
    if 'changelog_older' in site:
        site['changelog'] = site['changelog'] + site.pop('changelog_older')
    for key in DIGESTS:
        site.pop(key, None)
    return site, texts


def payload(data=None, today=None):
    # The site's view of the canon; the canon itself (build.py's copy) stays untouched.
    data = copy.deepcopy(data or load_canon())
    today = today or datetime.date.today()
    records = {x['id']: x for key in ('claims', 'conflicts') for x in data[key]}
    for person in data['people']:
        for kind, date in person.get('date_display', {}).items():
            # An empty short form keeps the tree card clean; the card text still explains the date.
            assert kind in ('birth', 'death') and date['text'] and isinstance(date['short'], (str, dict)), person['id']
            assert date['refs'], person['id']
            for ref in date['refs']:
                record = records[ref]
                assert record.get('person_id') == person['id'] or person['id'] in record.get('people', []), (person['id'], ref)
            expected = {sid for ref in date['refs'] for sid in records[ref]['source_ids']}
            assert set(date['source_ids']) == expected, (person['id'], kind)
    evidence = load_evidence()
    index_path = ROOT / 'site-media/index.json'
    media = json.loads(index_path.read_text()) if index_path.exists() else {}
    people = {p['id'] for p in data['people']}
    hypothesis_path = ROOT / 'data/site-hypotheses.json'
    hypotheses = json.loads(hypothesis_path.read_text())['hypotheses'] if hypothesis_path.exists() else []
    claims = {c['id']: c for c in data['claims']}
    relationships = {r['id']: r for r in data['relationships']}
    records = {x['id']: x for key in ('claims', 'relationships', 'conflicts') for x in data[key]}
    assert len({h['id'] for h in hypotheses}) == len(hypotheses), 'Duplicate hypothesis IDs'
    for h in hypotheses:
        assert all(h.get(k) for k in ('label', 'caption', 'eyebrow', 'how', 'note')), h['id']
        assert all(ref in records for ref in h['refs']), h['id']
        if h['kind'] == 'possible_kin':
            # A probable kinship of unknown degree: two people and an inference claim on one of them.
            assert h['from_id'] in people and h['to_id'] in people and h['from_id'] != h['to_id'], h['id']
            claim = claims[h['claim_id']]
            assert claim['status'] == 'inference' and claim['person_id'] in (h['from_id'], h['to_id']), h['id']
            assert h['claim_id'] in h['refs'], h['id']
            assert not any(r['kind'] == 'parent' and {r['from_id'], r['to_id']} == {h['from_id'], h['to_id']}
                           for r in relationships.values()), h['id']
            h['source_ids'] = sorted({sid for ref in h['refs'] for sid in records[ref]['source_ids']})
            continue
        assert h['kind'] == 'possible_parent'
        assert all(h[k] in people for k in ('from_id', 'via_id', 'to_id')), h['id']
        assert len({h[k] for k in ('from_id', 'via_id', 'to_id')}) == 3, h['id']
        claim, rel = claims[h['identity_claim_id']], relationships[h['relationship_id']]
        assert claim['person_id'] == h['via_id'] and claim['field'] == 'identification' and claim['status'] == 'inference', h['id']
        assert rel['from_id'] == h['via_id'] and rel['to_id'] == h['to_id'] and rel['kind'] == 'parent', h['id']
        assert h['identity_claim_id'] in h['refs'] and h['relationship_id'] in h['refs'], h['id']
        h['source_ids'] = sorted({sid for ref in h['refs'] for sid in records[ref]['source_ids']})
    # Visual merges: one card on the tree for several records of one person; the records stay apart.
    merge_path = ROOT / 'data/site-merges.json'
    merges = json.loads(merge_path.read_text())['merges'] if merge_path.exists() else []
    seen = set()
    for m in merges:
        ids = [m['main'], *m['members']]
        assert m['members'] and all(i in people for i in ids), m['id']
        assert not seen & set(ids) and len(set(ids)) == len(ids), m['id']
        seen |= set(ids)
        assert m.get('name') and m.get('note') and all(ref in records for ref in m['refs']), m['id']
        m['source_ids'] = sorted({sid for ref in m['refs'] for sid in records[ref]['source_ids']})
    # «Known personally»: people the family knows itself; only the ids go to the site.
    personal_path = ROOT / 'data/site-personal.json'
    personal = [i for g in json.loads(personal_path.read_text())['groups'] for i in g['people']] if personal_path.exists() else []
    problems = [f'data/site-personal.json: no person {i}' for i in personal if i not in people]
    problems += [f'data/site-personal.json: {i} is listed twice' for i in sorted({i for i in personal if personal.count(i) > 1})]
    # Living people without a birth year who still get «This is me»; they are not «Known personally» and draw no green line.
    living_extra = [x['id'] for x in json.loads(personal_path.read_text()).get('living', [])] if personal_path.exists() else []
    problems += [f'data/site-personal.json: no person {i}' for i in living_extra if i not in people]
    kids = minors(data['people'], today)
    everyone = copy.deepcopy(data['people'])  # with full dates, for the check of «What's new» below
    canon_claims = {c['id'] for c in data['claims']}
    problems += child_view(data, kids)
    # The map of places: data/site-places.json, after the children's facts are gone.
    places, map_base, place_problems, place_hints = places_payload(data, canon_claims)
    problems += place_problems
    problems += [f'{name}: {x["id"]} concerns a child under 18' for name, items, keys in
                 (('data/site-hypotheses.json', hypotheses, ('from_id', 'via_id', 'to_id')), ('data/site-merges.json', merges, ('main',)))
                 for x in items if {x.get(k) for k in keys} & kids or set(x.get('members', [])) & kids]
    site_path = ROOT / 'data/site.json'
    site = json.loads(site_path.read_text()) if site_path.exists() else {}
    base = site.get('lang') or 'en'
    others = [lang for lang in ('ru', 'en') if lang != base]
    # A file of the site's language and its translations: one value, or {lang: value} when there are translations.
    def languages(path, read):
        found = {base: read(path)} if path.exists() else {}
        found.update({lang: read(path.with_name(f'{path.stem}.{lang}{path.suffix}')) for lang in others
                      if path.with_name(f'{path.stem}.{lang}{path.suffix}').exists()})
        return found
    stories = {}
    for path in sorted((ROOT / 'data/stories').glob('*.md')):
        if path.stem in people and path.stem not in kids:
            texts = languages(path, read_story)
            meta = texts[base][0]
            # The date a story was written and the records it was checked up to.
            text = texts[base][1] if len(texts) == 1 else {lang: t[1] for lang, t in texts.items()}
            stories[path.stem] = dict(text=text, written=meta.get('written', ''), checked=meta.get('checked', ''))
    by_lang = languages(ROOT / 'data/site-questions.md', read_questions) or {base: read_questions()}
    states = request_states()
    for lang, qs in by_lang.items():
        problems += [p if lang == base else f'[{lang}] {p}' for p in question_problems(data, qs, kids) + request_problems(data, qs, kids, states)]
        qs.pop('bad', None)
        qs['requests'] = [dict(r, state=states[r['id']][0], date=states[r['id']][1]) for r in qs['requests'] if states.get(r['id'], ('',))[0]]
    questions = by_lang[base] if len(by_lang) == 1 else by_lang
    history, history_problems = read_history([b['id'] for b in site.get('branches', [])])
    problems += history_problems
    finds_by_lang = languages(ROOT / 'data/site-finds.md', read_finds) or {base: []}
    for lang, fs in finds_by_lang.items():
        where = 'data/site-finds.md' if lang == base else f'data/site-finds.{lang}.md'
        problems += [p if lang == base else f'[{lang}] {p}' for p in find_problems(data, fs, kids, media, where)]
        if lang != base:
            problems += find_translation_problems(finds_by_lang[base], fs, where)
        fs[:] = [f for f in fs if 'bad' not in f]
    finds = finds_by_lang[base] if len(finds_by_lang) == 1 else finds_by_lang
    news_by_lang = languages(ROOT / 'data/changelog.md', read_changelog) or {base: []}
    changelog = news_by_lang[base] if len(news_by_lang) == 1 else news_by_lang
    news_text = '\n'.join(t for entries in news_by_lang.values() for e in entries
                          for t in [e['date'], e['lead'], *(i for g in e['groups'] for i in [g['title'], *g['items']])])
    problems += story_problems(data, stories)
    problems += [p.replace('data/stories/changelog.md', 'data/changelog.md') for p in story_problems(data, {'changelog': dict(text=news_text)})]
    problems += [p for entries in news_by_lang.values() for p in changelog_problems(entries, set(people))]
    problems += living_dates_in_news(everyone, set(personal), news_text)
    cited = citations(data)
    # The fixed words outside quotes stop the build in the site's own texts; in family.json they stop it
    # once data/site-words.json says "family_json": "stop". Without the file nothing is checked.
    words_path = ROOT / 'data/site-words.json'
    rules = json.loads(words_path.read_text()) if words_path.exists() else {'words': []}
    own = [('story:' + pid, flat(s['text'])) for pid, s in stories.items()] + [('changelog', news_text)]
    # A text may be a string or {"ru": …, "en": …}: every language is checked.
    texts = lambda v: [v] if isinstance(v, str) else [t for t in v.values() if isinstance(t, str)] if isinstance(v, dict) else []
    own += [('hypothesis:' + h['id'], ' '.join(t for k, v in h.items() if k not in ('refs', 'source_ids', 'ref_labels') for t in texts(v))
             + ' ' + ' '.join(t for v in h.get('ref_labels', {}).values() for t in texts(v))) for h in hypotheses]
    own += [('merge:' + m['id'], ' '.join(str(m.get(k, '')) for k in ('name', 'note', 'years'))) for m in merges]
    own += [('question:' + q['id'], ' '.join([q['title'], q['known'], q['missing'], q['help']])) for qs in by_lang.values() for q in qs['main']]
    own += [('question:' + x['id'], x['ask']) for qs in by_lang.values() for x in qs['conflicts']]
    own += [('request:' + r['id'], r['text']) for qs in by_lang.values() for r in qs['requests']]
    own += [(f'history:{e["year"]}', t) for e in history for t in texts(e['text'])]
    own += [('find:' + f['id'], ' '.join([f['title'], f['where'], f['lead'], f['weak'], f['text']])) for fs in finds_by_lang.values() for f in fs]
    canon = canon_texts(data, cited)
    hits, soft, stale = word_hits(own + canon, rules)
    problems += child_dates_in_texts(everyone, kids, own + canon)
    in_canon = lambda place: place.split(':')[0] in ('person', 'claim', 'relationship', 'conflict', 'source')
    stop_canon = rules.get('family_json') == 'stop'
    problems += [f'{place}: «{word}» — {around} (a full name instead of this word; direct speech goes in quotes; exceptions — data/site-words.json)'
                 for place, word, around in hits if stop_canon or not in_canon(place)]
    problems += [f'data/site-words.json: exception «{e["phrase"]}» ({e["where"]}) matches nothing any more — remove it' for e in stale]
    if problems:
        sys.exit('\n'.join(problems))
    later = [f'{place} «{word}»' for place, word, _ in hits if in_canon(place)]
    if later:
        print(f'Warning: words of data/site-words.json in the texts of family.json — {len(later)}: {", ".join(later[:6])}{"…" if len(later) > 6 else ""}; '
              'rewrite them, then set "family_json": "stop" in data/site-words.json')
    for hint in place_hints:
        print('Warning: ' + hint)
    for place, word, around in soft:
        print(f'Warning: {place}: «{word}» — {around}; if this is kinship counted from the author, write the full name')
    sources = []
    for s in data['sources']:
        if s['id'] not in cited:
            continue
        entry = evidence['sources'].get(s['id'], {})
        # The note is research bookkeeping the site never shows.
        item = {k: s[k] for k in ('id', 'title', 'kind', 'url', 'download_status') if s.get(k)}
        found = media.get(s['id'], {})
        if found.get('views'):
            item['views'] = [dict(v, src='../site-media/' + v['file'], mid='../site-media/' + v['mid']) for v in found['views']]
        if found.get('text'):
            item['text'] = '../site-media/' + found['text']
        # Who looked at a box and when (`checked`) is bookkeeping, not for the site.
        if entry.get('boxes'):
            item['boxes'] = [{k: v for k, v in box.items() if k != 'checked'} for box in entry['boxes']]
        if entry.get('cite'):
            item['cite'] = entry['cite']
        sources.append(item)
    # Who decided stays in the database; the site says «The family's decision» with the date and the note.
    for key in ('claims', 'relationships', 'conflicts'):
        for x in data[key]:
            if x.get('decided_by'):
                x['decided_by'] = {k: x['decided_by'][k] for k in ('date', 'note') if x['decided_by'].get(k)}
    keep = ('schema_version', 'updated', 'title', 'root_person_id', 'status_labels', 'people', 'claims',
            'relationships', 'conflicts')
    out = {k: data[k] for k in keep}
    out['personal'] = personal
    out['living_extra'] = living_extra
    out['sources'] = sources
    out['stories'] = stories
    out['hypotheses'] = hypotheses
    out['merges'] = merges
    out['changelog'] = changelog
    out['questions'] = questions
    out['finds'] = finds
    out['places'] = places
    out['history'] = history
    out['map_base'] = map_base
    out['site'] = site
    out['news_version'] = hashlib.sha256(json.dumps(changelog, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    return out


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='app/data.js')
    args = parser.parse_args()
    out = payload()
    target = ROOT / args.out
    names = write_site(out, target.parent)
    print(f'{target.parent.name}/{", ".join(names)}: {len(out["people"])} people, {len(out["sources"])} sources, '
          f'{len(out["stories"])} stories, {sum((target.parent / n).stat().st_size for n in names) / 1e3:.0f} KB')
