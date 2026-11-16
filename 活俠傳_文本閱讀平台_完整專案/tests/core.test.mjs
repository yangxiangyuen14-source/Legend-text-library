import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChapters, normalizeText, chapterText, makeChapters, addStart, headingTitle } from '../assets/js/chapter-parser.js';
import { decodeText, validateFile, MAX_FILE_SIZE } from '../assets/js/file-reader.js';

const samples = [
  '第一章 起點\n原文\n\n第二章：終點\n原文尾',
  '前言文字\n\n# 首章\n內容\n## 次章\n結尾\n',
  '\n\n第一章\n文字\n',
  '一般敘事\n\n下一段\n\n\n最後一段',
  '\uFEFF第一章 開始\r\n甲\r\n\r\n第二章 結尾\r\n乙',
  '只有一行', '序章\n序文\n終章\n結尾',
  '第一章\n甲\n第一章\n乙', '\n\n內文\n\n'
];
for (const [index, text] of samples.entries()) {
  for (const mode of ['auto', 'blank-line', 'whole']) {
    test(`完整還原樣本 ${index + 1} / ${mode}`, () => {
      const result = parseChapters(text, mode);
      assert.equal(result.chapters.map(c => chapterText(result.lines, c)).join(''), normalizeText(text));
      assert.equal(new Set(result.chapters.map(c => c.id)).size, result.chapters.length);
    });
  }
}
test('章標辨識與敘事排除', () => {
  for (const line of ['第一章 初入', '第十二回：風起', '第1章', '第２節 山中', '# 序章', '尾聲']) assert.ok(headingTitle(line), line);
  for (const line of ['這一日你下山', '第一章故事在此發生。', '你來了', '一日', '#無空白']) assert.equal(headingTitle(line), null, line);
});
test('無標題預設全文，空行只產生非空候選', () => {
  assert.equal(parseChapters('甲\n\n乙').chapters[0].title, '全文');
  const result = parseChapters('\n甲\n\n\n乙\n\n', 'blank-line');
  assert.equal(result.chapters.length, 2);
  for (const c of result.chapters) assert.ok(chapterText(result.lines, c).trim());
});
test('前言與重複章名保留', () => {
  const result = parseChapters('前言\n第一章\n甲\n第一章\n乙');
  assert.equal(result.chapters.length, 3);
  assert.equal(result.chapters[0].title, '前言（自動分段）');
  assert.notEqual(result.chapters[1].id, result.chapters[2].id);
});
test('手動新增、合併與行號驗證', () => {
  const result = parseChapters('甲\n乙\n\n丙');
  const changed = addStart(result.lines, result.chapters, 2, '自訂');
  assert.equal(changed[1].title, '自訂');
  assert.equal(changed.map(c => chapterText(result.lines, c)).join(''), result.normalized);
  assert.throws(() => addStart(result.lines, changed, 2, ''), /已有/);
  for (const n of [0, 1, 1.5, 5, NaN]) assert.throws(() => addStart(result.lines, changed, n, ''));
  assert.throws(() => addStart(result.lines, changed, 3, ''), /有文字/);
  assert.equal(makeChapters(result.lines, [changed[0]]).length, 1);
  assert.throws(() => makeChapters(result.lines, [{ startLine: 2 }]), /第 1 行/);
});
test('TXT 檔案驗證', () => {
  validateFile({ name: '中文_名字.TXT', size: 100 });
  validateFile({ name: 'x.txt', size: MAX_FILE_SIZE });
  for (const f of [{ name: 'x.pdf', size: 1 }, { name: 'x.txt', size: 0 }, { name: 'x.txt', size: MAX_FILE_SIZE + 1 }]) assert.throws(() => validateFile(f));
});
test('編碼、BOM 與錯誤處理', () => {
  assert.equal(decodeText(new TextEncoder().encode('\uFEFF中文')), '中文');
  assert.equal(decodeText(Uint8Array.from([0xa4, 0xa4, 0xa4, 0xe5]), 'big5'), '中文');
  assert.throws(() => decodeText(Uint8Array.from([0xff]), 'utf-8'), /解碼/);
  assert.throws(() => decodeText(new TextEncoder().encode('  \n')), /空白/);
  assert.throws(() => decodeText(new TextEncoder().encode('a\0b')), /控制字元/);
  assert.throws(() => decodeText(new Uint8Array(), 'utf-16'), /選擇/);
});
test('特殊文字與不連續章號不被改寫', () => {
  const text = '第1章\n<script>alert(1)</script>\n第9章\n&amp;';
  const result = parseChapters(text);
  assert.equal(result.chapters[1].title, '第9章');
  assert.equal(result.chapters.map(c => chapterText(result.lines, c)).join(''), text);
});
