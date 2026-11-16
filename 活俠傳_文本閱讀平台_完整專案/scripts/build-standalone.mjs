import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Script } from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root, file), 'utf8');
let html = await read('index.html');
const css = await read('assets/css/styles.css');
const modules = await Promise.all(['chapter-parser', 'file-reader', 'app'].map(name => read(`assets/js/${name}.js`)));
const js = modules.map(source => source.replace(/^import[^\n]*\n/gm, '').replace(/^export /gm, '')).join('\n\n');
new Script(js); // 檢查串接後是否有名稱衝突或語法錯誤。
html = html.replace('  <link rel="stylesheet" href="./assets/css/styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('  <script type="module" src="./assets/js/app.js"></script>', '');
html = html.replace('</body>', () => `<script>\n(() => {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();\n</script>\n</body>`);
const output = path.join(root, '活俠傳_傳奇文本閱讀平台.html');
await writeFile(output, html, 'utf8');
console.log(`Standalone HTML: ${output}`);
