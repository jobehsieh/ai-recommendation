<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI 推甄審查模擬器（專案藍圖）

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。

## 專案簡介

上傳自傳、個人資料表、學習／研究計劃書、在學成績單與有利審查資料，依 116 學年度各校資工相關系所簡章的審查方式與網路蒐集的歷年推甄經驗，由 AI 估算各項資料的權重、錄取機率區間，並給出逐項改善建議。涵蓋台大、清大、陽明交大、成大、中央等校資工相關系所。

- 技術棧：Next.js（App Router）＋ TypeScript ＋ Tailwind
- AI 服務：Google Gemini（OpenAI 相容端點），採 BYOK（使用者自備金鑰，存瀏覽器 localStorage）

## 關鍵時程

<!-- 格式：- 事件名稱：日期（說明）；沒有就留白 -->
（暫無）

## 目標與路線圖

<!-- 用 checklist 追蹤，收工技能會更新這裡 -->
- [x] 階段一：BYOK 模式（自備 Gemini 金鑰，伺服器不持有金鑰）
- [x] 階段二：AI 推甄審查模擬器（審查 API、工具頁與 landing page）
- [x] 階段三：AI 服務改為 Google Gemini（OpenAI 相容端點）
- [x] 修正：正式站大檔上傳回 HTTP 413（前端改為瀏覽器端解析、只上傳文字）
- [ ] 階段四：（待規劃）

## 資料夾結構

```
ai-recommendation/
├─ app/                      # Next.js App Router
│  ├─ layout.tsx, page.tsx   # 根 layout 與 landing page
│  ├─ globals.css, icon.svg
│  ├─ api/
│  │  ├─ key/verify/route.ts         # POST /api/key/verify（驗證金鑰）
│  │  └─ recommendation/route.ts     # POST /api/recommendation（審查，支援 NDJSON 串流）
│  └─ simulator/page.tsx     # 模擬器工具頁
├─ components/
│  ├─ Simulator.tsx, ProgramPicker.tsx, ResultView.tsx, UploadCard.tsx
│  ├─ landing/               # landing page 各區塊（Hero/Features/HowItWorks/...）
│  ├─ settings/              # API 金鑰設定（ApiKeyProvider/Dialog/Button）
│  └─ site/                  # Logo、SiteHeader、SiteFooter
├─ lib/                      # gemini.ts, recommend.ts, prompt.ts, schema.ts, parse-files.ts, parse-client.ts, limits.ts, types.ts, api-key*.ts
├─ data/                     # programs.ts（簡章審查方式）、historical-criteria.ts（非官方個案統計）
├─ public/                   # 靜態資源
├─ AGENTS.md, handoff.md     # 藍圖與交接檔
└─ .env.local                # 選用環境變數（非機密，已 gitignore）
```

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地 | `AGENTS.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | jobehsieh/ai-recommendation（**PUBLIC**） | 指定時 |
| L3 | Obsidian | `ai-recommendation/專案工作流程.md` | 有需要時 |

## 工作約定

- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文
- 修改前先確認計畫，優先保留原有資料結構

## 安全與隱私（不可違反）

- **不把 API key、密碼、憑證寫進 repo**，也不要貼進 `AGENTS.md`／`handoff.md`；一律放 `.env.local` 並列入 `.gitignore`
- 本服務採 BYOK，伺服器**不持有也不讀取** AI 金鑰；金鑰只在使用者瀏覽器 localStorage 與單次請求標頭中流動
- 使用者上傳的審查資料只在單次請求中處理，**不落地儲存**
- ⚠️ 本 repo 目前為 **PUBLIC**：push 前務必確認沒有金鑰、`.env.local` 或真實個資
