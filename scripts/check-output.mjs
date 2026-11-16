import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const html = await readFile(new URL('../活俠傳_傳奇文本閱讀平台.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html), 'Standalone file must embed its assets');
const js = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(js, 'Inline application is present');
new Script(js);
for (const [, id] of js.matchAll(/\$\('([^']+)'\)/g)) {
  if (id !== 'back-to-book') assert.ok(ids.includes(id), `Missing HTML control: ${id}`);
}
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB/.test(js), 'Application must keep imported text in memory');
console.log('Standalone HTML verified: unique controls, inline assets, valid JavaScript, and no upload/persistence APIs.');
