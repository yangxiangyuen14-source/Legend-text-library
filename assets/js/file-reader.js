export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(file) {
  if (!/\.txt$/i.test(file.name)) throw new Error('請選擇 .txt 純文字檔案。');
  if (file.size === 0) throw new Error('這是一個空檔案，請選擇含有文字的 TXT。');
  if (file.size > MAX_FILE_SIZE) throw new Error('檔案超過 5 MiB，請選擇較小的 TXT。');
}

export function decodeText(bytes, encoding = 'utf-8') {
  if (!['utf-8', 'big5'].includes(encoding)) throw new Error('請選擇 UTF-8 或 Big5。');
  let text;
  try { text = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw new Error(`無法以 ${encoding.toUpperCase()} 正確解碼。請改選另一種編碼，再按「以目前編碼重試」。`); }
  if (!text.trim()) throw new Error('檔案只有空白，沒有可閱讀的文字。');
  const controls = text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || [];
  if (text.includes('\u0000') || controls.length > Math.max(3, text.length * .01)) throw new Error('檔案含有異常控制字元，可能不是純文字或編碼不符。');
  return text;
}

export async function readTextFile(file, encoding) {
  validateFile(file);
  const bytes = await file.arrayBuffer();
  return { bytes, originalText: decodeText(bytes, encoding), name: file.name, size: file.size, encoding };
}
