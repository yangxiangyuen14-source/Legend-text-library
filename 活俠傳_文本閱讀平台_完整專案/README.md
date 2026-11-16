# 活俠傳・傳奇文本閱讀平台

讓使用者選取本機 TXT，在瀏覽器內分章、產生目錄並閱讀的非官方靜態網站。

## 目前狀態

已完成書卷風格首頁、TXT 匯入、UTF-8／Big5 編碼、分章預覽、起點合併及手動新增、目錄搜尋、章節切換與字級調整，另附不需伺服器的單檔 HTML。附 GitHub Pages 工作流程；尚未推送至使用者的 GitHub repository。

34 項核心測試通過。參考 TXT 已由解析模組實測：自動模式為全文 1 章，空行模式為 181 個暫定分段；三種模式串接章節後均與正規化原文完全一致。瀏覽器互動及指定手機尺寸尚待實測；本機預覽工具連線受環境限制。線上發布進度見本次交付說明。

`AGENTS.md` 是後續 AI 的開發入口，涵蓋目的、視覺、頁面、資料與分章規則、命名、修改限制及驗證方式。

## 預期使用流程

1. 選擇一份 TXT，預設使用 UTF-8，亦可選 Big5。
2. 確認願意查看劇透，再預覽分章結果。
3. 有明確章標時依章標分章；無章標時可整篇閱讀，或依空行產生候選段落並手動合併、命名。
4. 確認後產生目錄，透過目錄、上一章及下一章閱讀。

這裡的「上傳」只在本機瀏覽器處理，不傳送至伺服器。初版不保存檔案與分章結果，重新整理後需重新選檔。

## 本次參考檔案

使用者提供 `西武林_小竹_虎鎧甲_好人.txt`，約 520 KB。已檢查檔案文字與常見章標；未找到一般章節標題，因此分章設計必須支援「無標題的長篇敘事」，不能只支援「第一章」。空行候選段落需讓使用者確認，不視為官方章節。

原始檔案保留在使用者電腦，本專案不包含其全文。

## 範本

- `templates/chaptered-text.example.txt`：有明確標題的自製測試文本。
- `templates/unchaptered-text.example.txt`：無標題、含空行的自製測試文本。
- `templates/legend-template.txt`：先前建立的格式說明範本。
- `templates/catalog-entry.example.json`、`data/catalog.json`、`texts/`：先前固定藏書構想的保留空架構；初版匯入流程不使用它們，也不將使用者檔案寫入這些位置。

新增測試文本使用 UTF-8 與 LF，檔名使用小寫英文及連字號。使用者選取的原始 TXT 則可維持中文檔名，不需預先重新命名。

## 開發及啟動

使用 HTML、CSS、原生 JavaScript，無 npm 依賴。最快方式是直接用現代瀏覽器開啟 `活俠傳_傳奇文本閱讀平台.html`，不需安裝任何工具；首頁也有「先讀一卷範例」可體驗自製測試內容。

修改原始碼時，安裝 Node.js 24 後，在此目錄執行：

```sh
node scripts/serve.mjs
```

開啟 `http://localhost:8000`，Ctrl+C 停止。模組化的 `index.html` 需 HTTP；單檔 HTML 可以直接開啟。

```sh
node --test tests/core.test.mjs
node scripts/build.mjs
node scripts/build-standalone.mjs
```

`dist/` 是可部署網站；單檔 HTML 是便於交作業的衍生輸出。修改 `index.html` 或 `assets/` 後需重新產生兩者。

## 上傳 GitHub 與啟用 GitHub Pages

1. 在 GitHub 建立新 repository，例如 `legend-text-library`。請依帳號可用方案選擇支援 Pages 的可見性；不要加入私人遊戲原文。
2. 將本專案的「內容」放在 repository 根目錄，包含 `.github/workflows/pages.yml`，不要再多包一層資料夾，也不要只上傳 ZIP。
3. 在 repository 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
4. 將檔案提交至 `main`。已提交者可到 **Actions → Deploy GitHub Pages → Run workflow** 手動執行。
5. 工作流程會先測試、產生 dist，再部署。成功後從部署環境或 Pages 設定取得實際網址，不要將預測網址當作已發布。

若使用 Git，可在解壓縮後的專案目錄執行下列指令（將 YOUR-NAME 換成實際帳號，repository 先在 GitHub 建立）：

```sh
git init
git add .
git commit -m "Build legend text reader"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/legend-text-library.git
git push -u origin main
```

使用 Git 可以一併提交隱藏的 `.github` 目錄。只有在此資料夾尚未初始化 Git 時才執行 `git init`；既有 repository 應保留其設定。

若不使用 Actions，也可選 **Deploy from a branch → main → /(root)**，直接發布根目錄的 `index.html` 與 assets；兩種發布來源擇一即可。設定說明依 [GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 給下一位 AI 的任務

> 先閱讀 AGENTS.md 與 README.md，檢查已完成網站，補足瀏覽器驗證或依新需求擴充功能。不得改寫原文或上傳使用者全文至外部服務。修改後測試、重建部署與單檔輸出，回報實際結果並更新文件狀態。

## 聲明

本專案為非官方閱讀工具，未宣稱官方授權。上傳文本的權利仍屬相關權利人；示範檔為自製測試文字，不是遊戲原文。
