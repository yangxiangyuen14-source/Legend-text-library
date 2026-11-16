export function normalizeText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function headingTitle(line) {
  const text = line.trim();
  if (/^#{1,6}\s+\S/.test(text)) return text.replace(/^#{1,6}\s+/, '');
  if (/^第[〇零一二三四五六七八九十百千萬兩0-9０-９]+[章回卷節幕部](?:$|[\s：:、]\s*\S.*$)/.test(text)) return text;
  if (/^(序章|楔子|終章|尾聲|後記)$/.test(text)) return text;
  return null;
}

export function makeChapters(lines, starts) {
  if (!lines.length || !starts.length) throw new Error('至少需要一個章節起點。');
  const sorted = starts.map(s => ({ ...s })).sort((a, b) => a.startLine - b.startLine);
  if (sorted[0].startLine !== 0) throw new Error('第一個章節必須從第 1 行開始。');
  sorted.forEach((s, i) => {
    if (!Number.isInteger(s.startLine) || s.startLine < 0 || s.startLine >= lines.length) throw new Error('起始行超出原文範圍。');
    if (i && s.startLine === sorted[i - 1].startLine) throw new Error('這一行已有章節起點。');
  });
  return sorted.map((s, i) => ({
    id: `chapter-${String(i + 1).padStart(4, '0')}`,
    title: s.title?.trim() || `分段 ${String(i + 1).padStart(3, '0')}`,
    startLine: s.startLine,
    endLineExclusive: sorted[i + 1]?.startLine ?? lines.length,
    origin: s.origin || 'manual'
  }));
}

export function parseChapters(text, mode = 'auto') {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  if (!normalized.trim()) throw new Error('檔案沒有可閱讀的文字。');
  if (!['auto', 'whole', 'blank-line'].includes(mode)) throw new Error('不支援的分章方式。');
  const headings = [];
  lines.forEach((line, startLine) => {
    const title = headingTitle(line);
    if (title) headings.push({ startLine, title, origin: 'heading' });
  });
  let starts;
  const warnings = [];
  if (mode === 'blank-line') {
    starts = [{ startLine: 0, title: '分段 001', origin: 'blank-line' }];
    let seenText = false;
    lines.forEach((line, index) => {
      if (line.trim()) {
        if (seenText && index > 0 && !lines[index - 1].trim()) {
          starts.push({ startLine: index, title: `分段 ${String(starts.length + 1).padStart(3, '0')}`, origin: 'blank-line' });
        }
        seenText = true;
      }
    });
    warnings.push('依空行產生的是暫定閱讀分段，並非原作正式章節。可合併段落或自行命名。');
  } else if (mode === 'auto' && headings.length) {
    starts = headings;
    if (headings[0].startLine > 0) {
      if (lines.slice(0, headings[0].startLine).some(l => l.trim())) {
        starts.unshift({ startLine: 0, title: '前言（自動分段）', origin: 'heading' });
      } else starts[0].startLine = 0;
    }
  } else {
    starts = [{ startLine: 0, title: '全文', origin: 'whole' }];
    if (!headings.length) warnings.push('未偵測到明確章節標題。可整篇閱讀，或改用「依空行分段」再手動調整。');
  }
  return { normalized, lines, chapters: makeChapters(lines, starts), mode, headingCount: headings.length, warnings };
}

// 非末章保留其邊界前的換行，讓所有切片串接恰好還原正規化原文。
export function chapterText(lines, chapter) {
  return lines.slice(chapter.startLine, chapter.endLineExclusive).join('\n') +
    (chapter.endLineExclusive < lines.length ? '\n' : '');
}

export function addStart(lines, starts, lineNumber, title) {
  if (!Number.isInteger(lineNumber) || lineNumber < 2 || lineNumber > lines.length) throw new Error(`請輸入第 2 至 ${lines.length} 行之間的整數。`);
  const startLine = lineNumber - 1;
  if (starts.some(s => s.startLine === startLine)) throw new Error('這一行已有章節起點。');
  if (!lines[startLine].trim()) throw new Error('請選擇有文字的行作為章節起點。');
  return makeChapters(lines, [...starts, { startLine, title: title?.trim() || `第 ${lineNumber} 行（手動分段）`, origin: 'manual' }]);
}
