// Records the scenes of the site video: a headless Chrome walks through the site the way a reader would,
// with a drawn mouse pointer and a caption at the bottom, and every painted frame is saved with its time.
//   python3 scripts/serve.py &        (the site at http://127.0.0.1:8765/app/)
//   LANG_SITE=en node scripts/promo/record.cjs [out-dir] [scene ...]      (default tmp/promo/frames-<lang>, all scenes)
// make.sh turns the frames into the video, one per language. The scenes below walk through the demo family; for your
// own family change the people, the line and the search word in them. Playwright: PLAYWRIGHT_PATH or a `playwright` package.
const fs = require('fs'), os = require('os'), path = require('path');

function loadPlaywright() {
  for (const name of [process.env.PLAYWRIGHT_PATH, 'playwright'].filter(Boolean)) { try { return require(name); } catch (_) {} }
  console.error('Playwright not found: set PLAYWRIGHT_PATH to a node_modules/playwright folder.'); process.exit(1);
}
const pw = loadPlaywright();
const BASE = process.env.SITE || 'http://127.0.0.1:8765/app/';
const LANG = process.env.LANG_SITE === 'ru' ? 'ru' : 'en';
// A caption in the video's language.
const T = (en, ru) => LANG === 'ru' ? ru : en;
const OUT = path.resolve(process.argv[2] || path.join(__dirname, `../../tmp/promo/frames-${LANG}`));
const ONLY = process.argv.slice(3);
const W = 1280, H = 720;
// Pauses are stretched by PACE so each step can be read before the next.
const PACE = +process.env.PACE || 1.45;

// Pointer, click ring, caption and title card, drawn over the site in the page itself (the site's fonts and colours).
const OVERLAY = `
// The site's own first-visit video dialog stays closed while its video is being made; the site speaks the video's language.
try { localStorage.setItem('familyIntroSeen', '1'); localStorage.setItem('familyLang', '%LANG%'); } catch (_) {}
addEventListener('DOMContentLoaded', () => {
  const css = document.createElement('style');
  css.textContent = \`
    #promo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
    .promo-ring{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #b5772a;z-index:99998;pointer-events:none;animation:promo-ring .6s ease-out forwards}
    @keyframes promo-ring{from{transform:scale(.3);opacity:.9}to{transform:scale(1.4);opacity:0}}
    #promo-cap{position:fixed;left:50%;bottom:26px;transform:translate(-50%,12px);z-index:99997;pointer-events:none;max-width:78%;text-align:center;
      background:rgba(33,58,47,.94);color:#fbf8ef;font:400 27px/1.3 var(--serif, Georgia, serif);padding:13px 28px 15px;border-radius:16px;
      box-shadow:0 10px 30px rgba(20,35,28,.25);opacity:0;transition:opacity .45s ease, transform .45s ease}
    #promo-cap.on{opacity:1;transform:translate(-50%,0)}
    #promo-cap.top{bottom:auto;top:96px}
    #promo-cap small{display:block;font:400 17px/1.35 system-ui, -apple-system, sans-serif;opacity:.85;margin-top:5px}
    body:has(#promo-card) #promo-cursor{opacity:0}
    body.promo-private #panel-body :is(.life,.story,.places-line,.kin){filter:blur(6px)}
    #promo-card{position:fixed;inset:0;z-index:99996;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
      background:var(--bg, #f5f2e9);text-align:center;transition:opacity .8s ease}
    #promo-card img{width:92px;height:92px}
    #promo-card h1{font:400 58px/1.1 var(--serif, Georgia, serif);color:#21392f;margin:0}
    #promo-card p{font:400 22px/1.4 system-ui, -apple-system, sans-serif;color:#5d6b63;margin:0}
    #promo-card .dots{display:flex;gap:26px;font:400 21px/1 system-ui, -apple-system, sans-serif;color:#21392f}
    #promo-card .dots i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:9px;vertical-align:1px}
    #promo-card .addr{font:400 30px/1.2 var(--serif, Georgia, serif);color:#21392f}\`;
  document.head.append(css);
  const cur = document.createElement('div'); cur.id = 'promo-cursor';
  cur.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26"><path d="M3 2l17 10.5-7.3 1.4 4.3 8.2-3.2 1.6-4.2-8.3L3.8 20z" fill="#fff" stroke="#1d2b24" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const cap = document.createElement('div'); cap.id = 'promo-cap';
  document.body.append(cur, cap);
  addEventListener('mousemove', e => { cur.style.transform = \`translate(\${e.clientX - 3}px,\${e.clientY - 2}px)\`; }, true);
  addEventListener('mousedown', e => {
    const r = document.createElement('div'); r.className = 'promo-ring'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.body.append(r); setTimeout(() => r.remove(), 700);
  }, true);
});`;

// One scene: a fresh browser context (clean local storage), its frames in OUT/<name>/ with times in frames.txt.
async function scene(browser, name, run) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  const ctx = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: 1.5, locale: T('en-GB', 'ru-RU')});
  await ctx.addInitScript(OVERLAY.replace('%LANG%', LANG));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let recording = false;
  cdp.on('Page.screencastFrame', ({data, metadata, sessionId}) => {
    cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
    if (!recording) return;
    const file = `f${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFile(path.join(dir, file), Buffer.from(data, 'base64'), () => {});
    frames.push([file, metadata.timestamp]);
  });
  const cursor = {x: W * 0.62, y: H * 0.55};
  const s = {
    page,
    // Where the drawn pointer is now.
    at: () => ({...cursor}),
    wait: ms => page.waitForTimeout(ms * PACE),
    // Caption on (text, small second line) or off (no text).
    cap: (text, small) => page.evaluate(([t, sm]) => {
      const c = document.getElementById('promo-cap');
      if (!t) { c.classList.remove('on'); return; }
      c.innerHTML = ''; c.append(t); if (sm) { const e = document.createElement('small'); e.textContent = sm; c.append(e); }
      c.classList.add('on');
    }, [text || '', small || '']),
    // Glide the drawn pointer to a point or to the middle of an element. The glide runs in the page on animation
    // frames (smooth at 60 a second however slow the remote control is); the real mouse then lands at its end.
    move: async (target, ms = 700) => {
      let to = target;
      if (typeof target === 'string') {
        const box = await page.locator(target).first().boundingBox();
        if (!box) throw Error(`${name}: no element ${target}`);
        to = {x: box.x + box.width / 2, y: box.y + box.height / 2};
      }
      await page.evaluate(([x0, y0, x1, y1, ms]) => new Promise(done => {
        const c = document.getElementById('promo-cursor'), t0 = performance.now();
        const step = t => {
          const u = Math.min(1, (t - t0) / ms), e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          c.style.transform = `translate(${x0 + (x1 - x0) * e - 3}px,${y0 + (y1 - y0) * e - 2}px)`;
          if (u < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      }), [cursor.x, cursor.y, to.x, to.y, ms]);
      cursor.x = to.x; cursor.y = to.y;
      await page.mouse.move(cursor.x, cursor.y);
    },
    // A drag with the mouse button down: real moves all the way, so the tree follows the hand.
    drag: async (to, ms = 700) => {
      const from = {...cursor}, t0 = Date.now();
      for (let u = 0; u < 1;) {
        u = Math.min(1, (Date.now() - t0) / ms);
        const e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        cursor.x = from.x + (to.x - from.x) * e; cursor.y = from.y + (to.y - from.y) * e;
        await page.mouse.move(cursor.x, cursor.y);
      }
    },
    click: async (target, ms) => { await s.move(target, ms); await page.waitForTimeout(160); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); },
    // A line of the tree is clicked on a point of its own path (its box's middle may lie on a crossing line).
    clickLine: async (sel, at = .35, ms) => {
      const pt = await page.evaluate(([sel, at]) => {
        const el = document.querySelector(sel), path = el.matches('path') ? el : el.querySelector('path');
        const m = path.getScreenCTM(), pts = [];
        for (let u = .04; u < 1; u += .04) {
          const q = path.getPointAtLength(path.getTotalLength() * u), x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
          // Only a point where this line itself is on top: another line may cross it (a child's stem from a couple).
          if (document.elementFromPoint(x, y)?.closest('[data-line]') === el) pts.push({x, y, d: Math.abs(u - at)});
        }
        return pts.sort((a, b) => a.d - b.d)[0];
      }, [sel, at]);
      await s.click(pt, ms);
    },
    // Scroll an element of a scrolling box smoothly into the middle of the screen.
    reveal: async (sel, ms = 700) => {
      await page.evaluate(sel => document.querySelector(sel).scrollIntoView({block: 'center', behavior: 'smooth'}), sel);
      await page.waitForTimeout(ms);
    },
    type: async text => { for (const ch of text) { await page.keyboard.type(ch); await page.waitForTimeout(70); } },
    // Scroll what is under the pointer smoothly, on animation frames: headless Chrome scrolls a wheel step at once.
    wheel: (dy, ms = 600) => page.evaluate(([x, y, dy, ms]) => new Promise(done => {
      let el = document.elementFromPoint(x, y);
      while (el && !(el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      el = el || document.scrollingElement;
      const from = el.scrollTop, t0 = performance.now();
      const step = t => {
        const u = Math.min(1, (t - t0) / ms), e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        el.scrollTop = from + dy * e;
        if (u < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    }), [cursor.x, cursor.y, dy, ms]),
    // Move the tree's camera smoothly: to a person (k = zoom) or to the whole tree (id null).
    camera: (id, k, ms = 1800) => page.evaluate(([id, k, ms]) => new Promise(done => {
      const from = {...view};
      if (id) centerOn(id, k); else fit();
      const to = {...view}; Object.assign(view, from); apply();
      const t0 = performance.now();
      const step = t => {
        const u = Math.min(1, (t - t0) / ms), e = u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
        view.x = from.x + (to.x - from.x) * e; view.y = from.y + (to.y - from.y) * e; view.k = from.k + (to.k - from.k) * e;
        apply(); if (u < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    }), [id, k, ms]),
  };
  await page.goto(BASE + '#', {waitUntil: 'load'});
  await page.waitForTimeout(900);
  // Every scene opens on the old part of the tree, not on the living family the site starts with.
  await page.evaluate(() => centerOn('matvey', 0.8));
  if (PREP[name]) await PREP[name](s);
  await page.mouse.move(cursor.x, cursor.y);
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 92, maxWidth: W * 1.5, maxHeight: H * 1.5});
  await page.waitForTimeout(300);
  recording = true;
  const started = Date.now() / 1000;
  await run(s);
  await page.waitForTimeout(200);
  // Frame times are wall-clock seconds; a still screen sends no frames, so the last one lasts until now.
  const stopped = Date.now() / 1000;
  recording = false;
  await cdp.send('Page.stopScreencast');
  // Frames may arrive out of order; a frame with the same time as the one before it is dropped.
  frames.sort((a, b) => a[1] - b[1]);
  for (let i = frames.length - 1; i > 0; i--) if (frames[i][1] - frames[i - 1][1] < 0.001) frames.splice(i - 1, 1);
  // Chrome sends a frame only when the screen changes, so the first one stands for the still screen since the start.
  if (frames.length) frames[0][1] = Math.min(frames[0][1], started);
  const end = frames.length ? Math.max(stopped, frames[frames.length - 1][1] + 0.04) : 0;
  fs.writeFileSync(path.join(dir, 'frames.txt'), frames.map(([f, t], i) => `${f} ${((frames[i + 1]?.[1] ?? end) - t).toFixed(4)}`).join('\n') + '\n');
  console.log(`${name}: ${frames.length} frames, ${(end - (frames[0]?.[1] ?? end)).toFixed(1)} s`);
  await ctx.close();
}

// What a scene needs on screen before its recording starts.
const BRANCHES = [['#3d5b78', T('Sokolovs', 'Соколовы')], ['#8e4c45', T('Belovs', 'Беловы')], ['#5b4f8c', T('Vershinins', 'Вершинины')]];
const PREP = {
  title: s => s.page.evaluate(([title, dots, sub]) => {
    fit();
    const c = document.createElement('div'); c.id = 'promo-card';
    c.innerHTML = `<img src="icons/mark.svg" alt=""><h1>${title}</h1><div class="dots">${dots.map(([col, t]) => `<span><i style="background:${col}"></i>${t}</span>`).join('')}</div><p>${sub}</p>`;
    document.body.append(c);
  }, [T('Family tree', 'Семейное древо'), BRANCHES, T('How to use the site — in three minutes', 'Как пользоваться сайтом — за три минуты')]),
  line: s => s.page.evaluate(() => centerOn('ivan', 0.95)),
  docs: async s => {
    await s.page.evaluate(() => go({page: 'docs'}));
    await s.wait(500);
    await s.page.evaluate(async () => {
      const el = document.getElementById('docs-body');
      await Promise.all([...el.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    });
    await s.page.evaluate(() => go({}));
    await s.page.evaluate(() => centerOn('matvey', 0.8));
    await s.wait(500);
  },
  branches: s => s.page.evaluate(() => fit()),
  tools: s => s.page.evaluate(() => centerOn('ivan', 0.75)),
  fan: async s => {
    await s.page.evaluate(() => { centerOn('nikolay', 0.8); go({p: 'nikolay'}); });
    await s.wait(900);
  },
  // «Time» lays out every life on first open; opening it once beforehand keeps the recorded jump smooth.
  time: async s => {
    await s.page.evaluate(() => go({page: 'time'}));
    await s.wait(900);
    await s.page.evaluate(() => go({}));
    await s.page.evaluate(() => centerOn('matvey', 0.8));
    await s.wait(500);
  },
  // The finds page draws its cards and scans on first open; opening it once beforehand keeps the recorded jump smooth.
  finds: async s => {
    await s.page.evaluate(() => go({page: 'finds'}));
    await s.wait(600);
    // Lazy images off screen never decode, so the wait is capped.
    await s.page.evaluate(() => Promise.race([new Promise(r => setTimeout(r, 2500)),
      Promise.all([...document.querySelectorAll('#finds-body img')].map(i => i.decode().catch(() => {})))]));
    await s.page.evaluate(() => go({}));
    await s.page.evaluate(() => centerOn('matvey', 0.8));
    await s.wait(500);
  },
  book: async s => {
    await s.page.evaluate(() => go({p: 'ivan'}));
    await s.wait(900);
    await s.page.evaluate(() => document.querySelector('#panel-body [data-book]').scrollIntoView({block: 'center'}));
  },
  // A living person's card: dates, story and family are blurred, only the name and «This is me» stay readable.
  me: s => s.page.evaluate(() => { centerOn('andrey', 0.85); document.body.classList.add('promo-private'); }),
};

// The scenes in order, through the demo family.
const SCENES = {
  async title(s) {
    await s.wait(2000);
    await s.page.evaluate(() => { const c = document.getElementById('promo-card'); c.style.opacity = '0'; setTimeout(() => c.remove(), 800); });
    await s.wait(700);
    await s.cap(T('The whole family on one tree', 'Всё древо семьи — на одной схеме'), T('Drag with the mouse or a finger; the wheel or a pinch zooms', 'Тяните мышью или пальцем, колесо или щипок — масштаб'));
    await s.wait(700);
    await s.camera('matvey', 0.75, 2200);
    await s.move({x: 700, y: 330}, 400);
    await s.page.mouse.down();
    await s.drag({x: 580, y: 370}, 700);
    await s.page.mouse.up();
    await s.wait(500);
  },
  async card(s) {
    await s.cap(T('Find a person by name, place or year', 'Найдите человека по имени, селу или году'));
    await s.click('#search', 700);
    await s.type(T('Ivan Matveevich', 'Иван Матвеевич'));
    await s.wait(400);
    await s.click('#results [data-hit="0"]', 600);
    await s.wait(500);
    await s.cap(T('The card: life story, timeline, family and documents', 'Карточка: история жизни, лента событий, семья и документы'));
    await s.wait(1100);
    await s.move('#panel-body', 500);
    await s.wheel(700, 1100);
    await s.wait(1000);
  },
  async line(s) {
    await s.cap(T('Click a line to see the documents the link rests on', 'Нажмите на линию — увидите документы, на которых держится связь'));
    await s.wait(300);
    await s.clickLine('#edges [data-line="c:ivan"]', .5, 800);
    await s.wait(1000);
    await s.reveal('#panel-body [data-doc]');
    await s.click('#panel-body [data-doc]', 700);
    await s.wait(400);
    await s.cap(T('The scan of the document, with a box around the record', 'Скан документа — рамкой отмечена нужная запись'));
    await s.wait(2200);
    await s.page.evaluate(() => closeViewer());
    await s.page.evaluate(() => go({p: 'nikolay'}));
    await s.wait(700);
    await s.reveal('#panel-body [data-doc]');
    await s.click('#panel-body [data-doc]', 700);
    await s.wait(500);
    await s.cap(T('The arrows at the sides page through all documents of the card', 'Стрелки по бокам листают все документы карточки'), T('and so do the ← → keys', 'и клавиши ← → на клавиатуре'));
    await s.click('#viewer-doc-next', 800);
    await s.wait(1600);
    await s.click('#viewer-doc-next', 400);
    await s.wait(1800);
    await s.click('#viewer-close', 700);
    await s.wait(300);
  },
  // The ancestors of Nikolay Ivanovich as rings of a fan, from the button of his card.
  async fan(s) {
    await s.cap(T('«Ancestor fan» — all of a person’s ancestors in rings', '«Веер предков» — все предки человека кольцами'), T('the father’s side on the left, the mother’s on the right; a ring for each generation', 'отец слева, мать справа; у каждого колена своё кольцо'));
    await s.reveal('#panel-body [data-fan-open]', 500);
    await s.click('#panel-body [data-fan-open]', 800);
    await s.wait(2400);
    await s.cap(T('The colour is what the link rests on; an empty place is someone not found yet', 'Цвет — на чём держится связь, пустое место — кого ещё не нашли'), T('beside it: how many are found and who is missing nearest', 'сбоку: сколько предков найдено и кого не хватает ближе всего'));
    await s.move('#fan-world [data-fan-slot="2:0"]', 900);
    await s.wait(1200);
    await s.move('#fan-side', 900);
    await s.wait(2400);
  },
  async branches(s) {
    await s.cap(T(`Branches: ${BRANCHES.map(b => b[1]).join(', ')}`, `Ветки: ${BRANCHES.map(b => b[1]).join(', ')}`), T('Click one to keep only that side of the family', 'Нажмите — останется только эта сторона семьи'));
    await s.click('#groups [data-group="vershininy"]', 800);
    await s.wait(1200);
    await s.click('#groups [data-group="belovy"]', 600);
    await s.wait(1200);
    await s.click('#groups [data-group=""]', 600);
    await s.wait(700);
  },
  // The buttons under the zoom: the folded tree, the tree in a year, the menu «⋯» with print and the GEDCOM file.
  async tools(s) {
    await s.cap(T('A big tree opens folded: the direct line, the ancestors’ brothers and sisters', 'Древо открывается свёрнутым: прямая линия, братья и сёстры предков'), T('the rest under «+N»; the button below shows everyone at once', 'остальные — по «+N»; кнопка внизу раскрывает всех сразу'));
    await s.wait(1200);
    await s.click('#side-toggle', 900);
    await s.wait(2400);
    await s.click('#side-toggle', 600);
    await s.wait(1400);
    await s.cap(T('«The tree in a year»: who lived then and how old they were', '«Древо в году»: кто жил тогда и сколько им было лет'));
    await s.click('#year-toggle', 800);
    await s.wait(500);
    await s.page.evaluate(() => setSlice(1930));
    await s.camera('ivan', 0.8, 1400);
    await s.wait(2000);
    await s.click('#year-close', 700);
    await s.wait(400);
    // The caption stands at the top here: the menu opens above its button, where the caption would cover it.
    await s.page.evaluate(() => document.getElementById('promo-cap').classList.add('top'));
    await s.cap(T('The «⋯» menu: the tree on an A3 sheet, and the whole tree as a GEDCOM file', 'Меню «⋯»: схема на лист A3 и всё древо файлом GEDCOM'), T('for MyHeritage, Gramps and other programs', 'для MyHeritage, Gramps и других программ'));
    await s.click('#tree-menu', 800);
    await s.wait(700);
    await s.move('#export-toggle', 600);
    await s.wait(2400);
    await s.page.evaluate(() => treeMenu(false));
    await s.wait(300);
  },
  // «Time»: the lives on one scale of years, the epoch above them; the cursor of the year is dragged.
  async time(s) {
    await s.cap(T('«Time» — every life on one scale of years', '«Время» — жизни всех на одной шкале лет'), T('and the events of the epoch above them', 'и события эпохи над ними'));
    await s.click('#modes [data-mode="time"]', 800);
    await s.wait(1600);
    await s.cap(T('Move the year — see who lived then and how old they were', 'Двигайте год — видно, кто тогда жил и сколько им было лет'));
    await s.move('#time-body .tl-knob', 700);
    await s.page.mouse.down();
    await s.drag({x: s.at().x - 220, y: s.at().y}, 1600);
    await s.wait(600);
    await s.drag({x: s.at().x + 120, y: s.at().y}, 1200);
    await s.page.mouse.up();
    await s.wait(2000);
    await s.click('#time-tree', 800);
    await s.wait(500);
    await s.cap(T('«Show on the tree» — the same tree in that year', '«Показать на древе» — то же древо в этом году'), T('those not born yet or gone already are paler', 'кого ещё не было или уже нет — бледнее'));
    await s.wait(2600);
    await s.page.evaluate(() => setSlice(null));
    await s.wait(300);
  },
  async map(s) {
    await s.cap(T('The map of places: where they lived, served and studied', 'Карта мест: где жили, служили и учились'));
    await s.click('#modes [data-mode="map"]', 800);
    await s.wait(1000);
    await s.click('#map-list button, #map-list [data-place]', 800);
    await s.wait(1800);
  },
  async docs(s) {
    await s.cap(T('All documents — by place and by year', 'Все документы — по месту и по годам'));
    await s.click('#modes [data-mode="docs"]', 800);
    await s.wait(800);
    await s.move('#docs-body', 400);
    await s.wheel(500, 900);
    await s.click('[data-docs-by="year"]', 700);
    await s.wait(1300);
    await s.cap(T('«Photos» — the family album', '«Фото» — семейный альбом'), T('know who is in a photo or when it was taken — write', 'знаете, кто на снимке или когда он сделан, — напишите'));
    await s.click('[data-docs-by="photo"]', 700);
    await s.wait(2600);
  },
  // «Finds»: the page, a bar on the time ribbon opens one find, then a few lines of it.
  async finds(s) {
    await s.cap(T('«Finds» — the most surprising things from the archives', '«Находки» — самое неожиданное из архивов'), T('The ribbon shows when it happened; click, and the find opens', 'На шкале — когда это было; нажмите, и находка раскроется'));
    await s.click('#modes [data-mode="finds"]', 800);
    await s.wait(1300);
    await s.click('[data-find-go="volkhov"]', 900);
    await s.wait(1200);
    await s.cap(T('Every find rests on documents', 'Каждая находка — по документам'), T('numbers in the text lead to the facts, names to the people’s cards', 'цифры в тексте ведут к фактам, имена — к карточкам людей'));
    await s.move('#finds-body', 400);
    await s.wheel(220, 1000);
    await s.wait(1600);
  },
  async book(s) {
    await s.cap(T('A book of stories — to read and to print', 'Книжка историй — можно прочитать и распечатать'));
    await s.click('#panel-body [data-book]', 800);
    await s.wait(900);
    await s.move('#book-body', 400);
    await s.wheel(600, 900);
    await s.wait(900);
  },
  async days(s) {
    await s.cap(T('«On this day» — what happened to the ancestors today and this month', '«В этот день» — что было с предками сегодня и в этом месяце'));
    await s.click('#today-line', 800);
    await s.wait(1000);
    await s.move('#days-body', 400);
    await s.wheel(400, 800);
    await s.wait(1000);
  },
  async help(s) {
    await s.cap(T('«Help fill in»: what we do not know yet', '«Помочь»: чего мы не знаем'), T('Questions to the family, and people with no dates or names', 'Вопросы к семье и люди без дат и имён'));
    await s.click('#help-toggle', 800);
    await s.wait(1100);
    await s.move('#panel-body', 400);
    await s.wheel(380, 800);
    await s.wait(1300);
    // The sections further down, in their order on the page: people still without a photo, then the letters to archives.
    const heads = await s.page.evaluate(() => [...document.querySelectorAll('#panel-body h3')].map(h => h.textContent));
    const photoAt = heads.findIndex(h => /photo yet|ни одной фото/i.test(h)), askAt = heads.findIndex(h => /archives|ответа из архива/i.test(h));
    if (photoAt >= 0) {
      await s.cap(T('«No photo yet» — perhaps there is one in your album', '«Нет ни одной фотографии» — может быть, снимок есть в вашем альбоме'));
      await s.page.evaluate(i => document.querySelectorAll('#panel-body h3')[i].scrollIntoView({block: 'start', behavior: 'smooth'}), photoAt);
      await s.wait(2600);
    }
    if (askAt >= 0) {
      await s.cap(T('«Waiting for the archives» — what has been asked already', '«Ждём ответа из архива» — о чём уже спросили'));
      await s.page.evaluate(i => document.querySelectorAll('#panel-body h3')[i].scrollIntoView({block: 'start', behavior: 'smooth'}), askAt);
      await s.wait(2600);
    }
  },
  // «This is me» on the keeper's own card, then a great-great-grandfather's card says who he is to them.
  async me(s) {
    await s.cap(T('Find yourself and press «This is me»', 'Найдите себя и нажмите «Это я»'));
    await s.wait(300);
    await s.click('#nodes [data-person="andrey"]', 800);
    await s.wait(600);
    await s.click('#panel-body [data-me-set]', 800);
    await s.wait(900);
    await s.cap(T('Now the site knows who you are', 'Теперь сайт знает, кто вы'), T('and every card says how that person is related to you', 'и в каждой карточке пишет, кем вам приходится этот человек'));
    await s.page.evaluate(() => { closePanel(); document.body.classList.remove('promo-private'); });
    await s.wait(300);
    await s.camera('grigory', 0.85, 2000);
    await s.click('#nodes [data-person="grigory"]', 800);
    await s.wait(600);
    await s.move('#panel-body .you button', 800);
    await s.wait(1200);
    await s.click('#panel-body .you button', 300);
    await s.wait(500);
    await s.cap(T('The whole chain to the great-great-grandfather', 'Вся цепочка до прапрадеда'), T('and for every step you see what it rests on', 'и у каждого шага видно, на чём он держится'));
    await s.wait(1200);
    await s.move('#panel-body', 500);
    await s.wheel(420, 1100);
    await s.wait(1500);
  },
  async end(s) {
    await s.cap(T('Forgot where things are? The «?» button at the top right', 'Забыли, что где? Кнопка «?» вверху справа'));
    await s.click('#legend-toggle', 900);
    await s.wait(2000);
    await s.cap('');
    await s.page.evaluate(([title, sub]) => {
      const c = document.createElement('div'); c.id = 'promo-card'; c.style.opacity = '0';
      c.innerHTML = `<img src="icons/mark.svg" alt=""><h1>${title}</h1><div class="addr">github.com/egnevushev/family-tree-site</div><p>${sub}</p>`;
      document.body.append(c); requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = '1'; }));
    }, [T('Family tree', 'Семейное древо'), T('A site for your own family archive', 'Сайт для своего семейного архива')]);
    await s.wait(3000);
  },
};

(async () => {
  // Headless screencast frames come in CSS pixels unless the scale is forced: 1280×720 × 1.5 = 1920×1080.
  const browser = await pw.chromium.launch({channel: process.env.UI_BROWSER === 'chromium' ? undefined : 'chrome', args: ['--force-device-scale-factor=1.5']});
  try {
    for (const [name, run] of Object.entries(SCENES)) if (!ONLY.length || ONLY.includes(name)) await scene(browser, name, run);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
