// The page in the reader's language: the fixed texts of index.html translated in place, and where messages from the
// site go. Loaded right after core.js (LANG, EN, L, loc, SITE); the page only, not the tests in Node.
'use strict';
// Without data.js core.js stopped before it knew the language: the word about it (#load-fail) follows the reader's
// last choice, else the browser's language, and nothing below runs.
if (!globalThis.FAMILY_DATA) {
  let lang = '';
  try { lang = localStorage.getItem('familyLang') || ''; } catch (_) {}
  if ((lang || navigator.language || '').slice(0, 2) !== 'ru') {
    const box = document.getElementById('load-fail');
    if (box) {
      box.querySelector('p').textContent = 'The data of the site did not load. Check the connection and reload the page.';
      document.getElementById('load-retry').textContent = 'Reload';
    }
  }
  throw Error('data.js did not load');
}
// The fixed texts of index.html, translated in place: text, aria-label, title, placeholder, alt and data-tip.
const STATIC_EN = {
  'Семейное древо': 'Family tree', 'Семейное древо: к началу': 'Family tree: back to the start', 'К началу': 'Back to the start',
  'Ветки семьи': 'Branches of the family', 'Найти человека…': 'Find a person…', 'Найти человека': 'Find a person', 'Режим': 'Mode',
  'Древо': 'Tree', 'Карта': 'Map', 'Документы': 'Documents', 'Находки': 'Finds', 'Время': 'Time',
  'Помочь дополнить': 'Help fill in', 'Помочь': 'Help', 'Что нового': "What's new", 'Новое': 'New',
  'Что здесь есть и как читать линии': "What's here and how to read the lines",
  'Скрыть видео': 'Hide the video', 'Как пользоваться сайтом': 'How to use the site',
  'Видео на три минуты. Потом его всегда можно найти под «?» вверху справа.': 'A three-minute video. You can always find it again under «?» at the top right.',
  'Скрыть': 'Hide', 'Нет': 'No', 'Да': 'Yes',
  'Семейное древо. Перетаскивайте для перемещения, колесо или щипок — масштаб. Нажмите на человека или линию.': 'Family tree. Drag to move, wheel or pinch to zoom. Click a person or a line.',
  'Масштаб': 'Zoom', 'Приблизить': 'Zoom in', 'Отдалить': 'Zoom out', 'Вписать всё древо в экран': 'Fit the whole tree on the screen',
  'Вписать древо в экран': 'Fit the tree on the screen',
  'Древо в году: кто тогда жил и сколько им было лет': 'The tree in a year: who lived then and how old they were', 'Древо в году': 'The tree in a year',
  'Ещё: печать и файл древа': 'More: print and the tree file', 'Ещё: печать и файл': 'More: print and file',
  'Напечатать схему (A3)': 'Print the tree (A3)', 'Веер моих предков': 'My ancestor fan', 'Скачать древо файлом (GEDCOM)': 'Download the tree as a file (GEDCOM)',
  'Закрыть': 'Close', 'Видео: как пользоваться сайтом': 'Video: how to use the site', 'Насколько надёжна связь': 'How reliable a link is',
  'Год': 'Year', 'Выключить: всё древо без года': 'Turn off: the whole tree, no year',
  'Фокус:': 'Focus:', 'и его предки': 'and their ancestors', 'Всё древо': 'Whole tree',
  'Карта мест': 'Map of places', '← Вся карта': '← Whole map', 'Закрыть карту, вернуться к древу': 'Close the map, back to the tree', 'К древу ×': 'To the tree ×',
  'Карта мест семьи. Перетаскивайте, колесо или щипок — масштаб.': "Map of the family's places. Drag, wheel or pinch to zoom.",
  'Приблизить карту': 'Zoom the map in', 'Отдалить карту': 'Zoom the map out',
  'Как листать': 'How to browse', 'По месту': 'By place', 'По годам': 'By year', 'Фото': 'Photos',
  'Закрыть документы, вернуться к древу': 'Close the documents, back to the tree', 'Разделы': 'Sections',
  'Книжка историй': 'Book of stories', 'Чья книжка': 'Whose book', 'Напечатать книжку': 'Print the book', 'Закрыть книжку, вернуться к древу': 'Close the book, back to the tree',
  'В этот день': 'On this day', 'Закрыть, вернуться к древу': 'Close, back to the tree',
  'Ветка семьи': 'Branch of the family', 'Закрыть находки, вернуться к древу': 'Close the finds, back to the tree',
  'Закрыть время, вернуться к древу': 'Close «Time», back to the tree', 'Все события': 'All events',
  'Показать на древе в этом году': 'Show on the tree in this year', 'Показать на древе': 'Show on the tree', 'На древе': 'On the tree',
  'Веер предков': 'Ancestor fan', 'Напечатать веер (A4)': 'Print the fan (A4)', 'Закрыть веер, вернуться к древу': 'Close the fan, back to the tree',
  'Приблизить веер': 'Zoom the fan in', 'Отдалить веер': 'Zoom the fan out', 'Вписать веер в экран': 'Fit the fan on the screen', 'Вписать веер': 'Fit the fan',
  'Нажмите на человека — откроется его история, двойной клик — только его предки. Нажмите на линию — документы, на которых держится связь.': 'Click a person to open their story, double-click for their ancestors only. Click a line for the documents the link rests on.',
  'Ширина карточки: потяните; двойной клик — обычная ширина': 'Width of the card: drag; double-click for the usual width',
  'Потяните, чтобы сделать карточку шире или уже. Двойной клик — обычная ширина': 'Drag to make the card wider or narrower. Double-click for the usual width',
  'Карточка': 'Card', 'Развернуть или свернуть карточку': 'Expand or collapse the card', '← Назад': '← Back',
  'Развернуть карточку на весь экран': 'Expand the card to the full screen', '⤢ Развернуть': '⤢ Expand', 'Напечатать карточку': 'Print the card',
  'Закрыть карточку': 'Close the card',
  'Не удалось загрузить данные сайта. Проверьте связь и обновите страницу.': 'The data of the site did not load. Check the connection and reload the page.', 'Обновить': 'Reload',
  'Документ': 'Document', 'Предыдущая страница': 'Previous page', 'Следующая страница': 'Next page', 'Закрыть документ': 'Close the document',
  'Предыдущий документ': 'Previous document', 'Следующий документ': 'Next document',
};
if (EN) {
  const tr = t => { const k = t.trim(); return STATIC_EN[k] ? t.replace(k, STATIC_EN[k]) : t; };
  for (const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); walk.nextNode();) walk.currentNode.nodeValue = tr(walk.currentNode.nodeValue);
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'data-tip'];
  document.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')).forEach(el => ATTRS.forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, tr(el.getAttribute(a))); }));
}
document.title = SITE_NAME;
// Where messages from the site go (data/site.json inbox_url, recipient); see the form in panel.js. Without inbox_url
// the site has no form: «Help fill in» and the cards show the contact text of data/site.json instead.
const INBOX = SITE.inbox_url ? new URL(SITE.inbox_url, location.href).href : '';
const RECIPIENT = loc(SITE.recipient) || L('составитель древа', 'the keeper of the tree');
