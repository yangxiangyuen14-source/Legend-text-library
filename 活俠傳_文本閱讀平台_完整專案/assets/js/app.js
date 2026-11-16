import { parseChapters, makeChapters, chapterText, addStart } from './chapter-parser.js';
import { readTextFile } from './file-reader.js';

const $ = id => document.getElementById(id);
let documentState = null;
let draft = [];
let chapters = [];
let currentChapter = 0;
let fontSize = 20;
let requestId = 0;
let lastFile = null;
let dirty = false;
let mode = 'auto';

const sampleText = `第一章 書卷初開
【自製功能範例，非《活俠傳》遊戲原文】

這是一卷用來體驗閱讀功能的示範文本。
你可以從左側目錄切換章節，也可以調整字級，找到舒服的閱讀節奏。

若要閱讀自己的傳奇，請選擇一份 TXT。檔案只在你的瀏覽器內處理，不會傳送到伺服器。

第二章 整理篇章
有「第一章」或 Markdown 標題的文本，可以自動建立章節。

沒有標題也不妨礙閱讀。你可以選擇整篇閱讀，或依空行產生暫定分段，再合併、命名。
所有調整都只改變閱讀目錄，不會改寫你的原始文字檔。

尾聲
試著按下「重新分章」，修改這一章的目錄名稱。

重新整理頁面後，本次檔案與調整將清除。請記得保留自己的原始 TXT。`;

function clearError() { $('error').hidden = true; $('error').textContent = ''; }
function showError(error) {
  $('error').textContent = error.message || String(error);
  $('error').hidden = false;
  $('error').scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function status(message) { $('status').textContent = message; }
function selectedChapters() {
  return makeChapters(documentState.parsed.lines, draft.filter(s => s.enabled));
}
function agreeToSpoilers() {
  const dialog = $('spoiler-dialog');
  if (dialog.open) return Promise.resolve(false);
  return new Promise(resolve => {
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'continue'), { once: true });
    dialog.showModal();
  });
}

async function importFile(file) {
  const id = ++requestId;
  if (!await agreeToSpoilers() || id !== requestId) return;
  clearError();
  status('正在讀取文字與辨識章節…');
  lastFile = file;
  $('retry-file').hidden = false;
  try {
    const data = await readTextFile(file, $('encoding').value);
    if (id !== requestId) return;
    const parsed = parseChapters(data.originalText);
    documentState = { ...data, parsed };
    mode = parsed.headingCount ? 'auto' : 'whole';
    $('book-title').value = file.name.replace(/\.txt$/i, '');
    $('file-info').textContent = `${data.name} · ${(data.size / 1024).toFixed(1)} KiB · ${data.encoding.toUpperCase()} · ${parsed.lines.length.toLocaleString()} 行`;
    $('file-info').hidden = false;
    dirty = false;
    resetDraft(false);
    status('文字檔已讀取。請確認編碼與分章結果，再開始閱讀。');
    showPreview();
  } catch (error) {
    if (id === requestId) { status('匯入未完成；原有書卷仍保留。'); showError(error); }
  }
}

function resetDraft(ask = true) {
  if (!documentState) return;
  if (ask && dirty && !confirm('重設將清除目前的章名與分章起點調整，是否繼續？')) return;
  const parsed = parseChapters(documentState.originalText, mode);
  draft = parsed.chapters.map(c => ({ ...c, enabled: true }));
  $('split-mode').value = mode;
  $('split-mode').querySelector('option[value=auto]').disabled = !documentState.parsed.headingCount;
  $('detection-note').textContent = parsed.warnings.join(' ') || `偵測到 ${parsed.headingCount} 個明確標題。請檢查章節與文字編碼是否正確；辨識結果可自行調整。`;
  $('line-preview').hidden = true;
  $('show-lines').textContent = '查看原文行號';
  dirty = false;
  renderEditor();
}

function renderEditor() {
  const fragment = document.createDocumentFragment();
  draft.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = `chapter-row${entry.enabled ? '' : ' merged'}`;
    const check = document.createElement('input');
    check.type = 'checkbox'; check.checked = entry.enabled; check.disabled = index === 0;
    check.setAttribute('aria-label', `將第 ${entry.startLine + 1} 行作為章節起點`);
    check.addEventListener('change', () => { entry.enabled = check.checked; dirty = true; renderEditor(); });
    const content = document.createElement('div');
    const title = document.createElement('input');
    title.type = 'text'; title.maxLength = 100; title.value = entry.title; title.disabled = !entry.enabled;
    title.setAttribute('aria-label', `第 ${entry.startLine + 1} 行的章節名稱`);
    title.addEventListener('input', () => { entry.title = title.value; dirty = true; });
    const snippet = document.createElement('p');
    snippet.className = 'snippet';
    snippet.textContent = documentState.parsed.lines.slice(entry.startLine, entry.endLineExclusive).find(l => l.trim())?.slice(0, 100) || '（此行無文字）';
    content.append(title, snippet);
    const line = document.createElement('small');
    line.textContent = `第 ${entry.startLine + 1} 行${entry.enabled ? '' : ' · 已合併'}`;
    row.append(check, content, line); fragment.append(row);
  });
  $('chapter-editor').replaceChildren(fragment);
  $('preview-count').textContent = `${draft.filter(c => c.enabled).length} 個章節 · ${documentState.parsed.lines.length.toLocaleString()} 行`;
  $('start-line').max = documentState.parsed.lines.length;
}

function showPreview() {
  $('landing').hidden = true;
  $('preview').hidden = false;
  $('reader').hidden = true;
  $('preview-title').focus({ preventScroll: true });
  $('preview').scrollIntoView({ block: 'start' });
}

function beginReading() {
  try {
    chapters = selectedChapters(); currentChapter = 0;
    $('reader-book-title').textContent = $('book-title').value.trim() || documentState.name.replace(/\.txt$/i, '');
    $('toc-search').value = '';
    $('preview').hidden = true; $('reader').hidden = false;
    $('toc-details').open = !matchMedia('(max-width: 600px)').matches;
    clearError(); renderChapter();
    status('書卷已開啟。可透過目錄切換章節；重新整理後需重新選檔。');
  } catch (error) { showError(error); }
}

function renderToc() {
  const query = $('toc-search').value.trim().toLocaleLowerCase();
  const fragment = document.createDocumentFragment();
  let matches = 0;
  chapters.forEach((chapter, index) => {
    if (!chapter.title.toLocaleLowerCase().includes(query)) return;
    matches++;
    const button = document.createElement('button');
    button.textContent = `${String(index + 1).padStart(2, '0')}　${chapter.title}`;
    if (index === currentChapter) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => {
      currentChapter = index;
      if (matchMedia('(max-width: 600px)').matches) $('toc-details').open = false;
      renderChapter();
    });
    fragment.append(button);
  });
  if (!matches) {
    const empty = document.createElement('p'); empty.className = 'toc-empty'; empty.textContent = '沒有符合的章節，請調整或清除搜尋。'; fragment.append(empty);
  }
  $('toc').replaceChildren(fragment);
  $('toc-count').textContent = `${chapters.length} 章`;
}

function renderChapter() {
  const chapter = chapters[currentChapter];
  $('chapter-title').textContent = chapter.title;
  $('chapter-text').textContent = chapterText(documentState.parsed.lines, chapter);
  $('reading-position').textContent = `卷中篇章 / ${String(currentChapter + 1).padStart(2, '0')}`;
  $('chapter-counter').textContent = `${currentChapter + 1} / ${chapters.length}`;
  $('previous').disabled = currentChapter === 0;
  $('next').disabled = currentChapter === chapters.length - 1;
  renderToc();
  $('chapter-title').focus({ preventScroll: true });
  $('chapter-title').scrollIntoView({ block: 'start' });
}

function chooseFile() { $('file-input').click(); }
$('choose-file').addEventListener('click', chooseFile);
$('hero-upload').addEventListener('click', chooseFile);
$('file-input').addEventListener('change', event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (file) importFile(file);
});
$('retry-file').addEventListener('click', () => { if (lastFile) importFile(lastFile); });
$('sample-open').addEventListener('click', () => {
  $('encoding').value = 'utf-8';
  importFile(new File([sampleText], '書卷體驗_自製範例.txt', { type: 'text/plain' }));
});
$('home-link').addEventListener('click', event => {
  event.preventDefault();
  if (documentState && !confirm('返回首頁會隱藏目前書卷；檔案仍留在此分頁，可按下方「返回目前書卷」。是否繼續？')) return;
  $('landing').hidden = false; $('preview').hidden = true; $('reader').hidden = true;
  if (documentState) {
    let back = $('back-to-book');
    if (!back) {
      back = document.createElement('button'); back.id = 'back-to-book'; back.textContent = '返回目前書卷';
      back.addEventListener('click', () => { back.remove(); showPreview(); });
      $('file-info').after(back);
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('split-mode').addEventListener('change', event => {
  const oldMode = mode;
  if (dirty && !confirm('切換方式將清除目前的分章調整，是否繼續？')) { event.target.value = oldMode; return; }
  mode = event.target.value; resetDraft(false);
});
$('reset-split').addEventListener('click', () => resetDraft());
$('show-lines').addEventListener('click', () => {
  const panel = $('line-preview'); panel.hidden = !panel.hidden;
  $('show-lines').textContent = panel.hidden ? '查看原文行號' : '收起原文行號';
  if (!panel.hidden) panel.textContent = documentState.parsed.lines.map((line, i) => `${String(i + 1).padStart(4, ' ')} │ ${line}`).join('\n');
});
$('add-start').addEventListener('click', () => {
  try {
    const updated = addStart(documentState.parsed.lines, draft, Number($('start-line').value), $('manual-title').value);
    const previous = new Map(draft.map(c => [c.startLine, c]));
    draft = updated.map(c => ({ ...c, enabled: previous.get(c.startLine)?.enabled ?? true }));
    dirty = true; clearError(); renderEditor();
    $('start-line').value = ''; $('manual-title').value = '';
  } catch (error) { showError(error); }
});
$('start-reading').addEventListener('click', beginReading);
$('re-edit').addEventListener('click', showPreview);
$('toc-search').addEventListener('input', renderToc);
$('previous').addEventListener('click', () => { if (currentChapter > 0) { currentChapter--; renderChapter(); } });
$('next').addEventListener('click', () => { if (currentChapter < chapters.length - 1) { currentChapter++; renderChapter(); } });
function changeFont(delta) {
  fontSize = Math.max(16, Math.min(28, fontSize + delta));
  document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
  $('font-size').textContent = `${fontSize}px`;
  $('font-smaller').disabled = fontSize === 16; $('font-larger').disabled = fontSize === 28;
}
$('font-smaller').addEventListener('click', () => changeFont(-2));
$('font-larger').addEventListener('click', () => changeFont(2));
