# 交接檔（handoff.md）

> 任何 Agent、任何電腦接手前**必讀**；收工時**必更新**。本檔只放交接必需的精簡資訊，詳細脈絡放 Obsidian（L3：`ai-recommendation/專案工作流程.md`）。

## ⏯️ 目前做到哪
專案初始化完成（L1＋L2＋L3）。階段一～三（BYOK、推甄審查模擬器、改用 Google Gemini）已完成。
另修正：正式站（Vercel）上傳大檔會回 HTTP 413 —— 改為在**瀏覽器端**先把檔案解析成文字、只上傳文字，避開平台請求 body 上限（Vercel 約 4.5MB）。

## 🚦 目前狀態
- 可運行：`npm run dev`
- 正式站：https://ai-recommendation-pi.vercel.app（Vercel，push 到 main 後自動部署）
- landing page、模擬器工具頁、審查 API、金鑰驗證 API 均已就位
- 工作區乾淨，本地與遠端已同步

## ➡️ 下一步
1. 部署完成後，於正式站實測大檔上傳確認不再 413
2. 規劃「階段四」要做什麼（尚未定義）
3. （可選）依官方簡章補齊／校正 `data/programs.ts` 校系資料

## ⚠️ 注意事項
- 本 repo 為 **PUBLIC**：push 前確認沒有金鑰、`.env.local`、真實個資
- BYOK：伺服器不持有金鑰，金鑰只在瀏覽器 localStorage 與單次請求標頭流動
- 網頁介面已改為「瀏覽器端解析檔案、只上傳文字」（`lib/parse-client.ts`）；`file:<key>` 欄位保留給直接呼叫 API 者，該路徑仍受平台 body 上限影響
- `AGENTS.md` 開頭的 Next.js 區塊由 `next dev` 自動產生，勿隨意刪除
- 清大分則 PDF 文字層損毀，`data/programs.ts` 該部分由頁面影像判讀，實際規定以官方簡章為準

## 🕐 最後更新
- 時間：2026-10-18 14:27
- 更新者：opencode @ DESKTOP-9CRMHFD
- Git push：✅ 已推（本次一併推送）
