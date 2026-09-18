# AI 推甄審查模擬器

上傳自傳、個人資料表、學習／研究計劃書、在學成績單與有利審查資料，依 116 學年度各校資工相關系所簡章的審查方式與網路蒐集的歷年推甄經驗，由 AI 估算各項資料的權重、錄取機率區間，並給出逐項改善建議。

涵蓋校系：台大（資工、資工 AI）、清大（資工甲／乙／丙組）、陽明交大（資訊聯招甲／網工／多工、資工所丙／丁／戊組）、成大（資工甲／乙組、AI 學程）、中央（資工、軟工、AI）。

## 開發

```bash
npm install
npm run dev        # http://localhost:3000
```

## 自備金鑰（BYOK）

本服務**不持有、也不需要**任何 OpenCode 金鑰，不再讀取 `OpenCode_GO_KEY` 環境變數。

- 使用者在網站右上角「API 金鑰」貼上自己的 OpenCode Go 金鑰，存在**瀏覽器的 localStorage**。
- 每次呼叫 API 時以 `Authorization: Bearer <key>` 帶上；伺服器只在該次請求中轉發給 OpenCode Go，不儲存、不記錄。
- 沒帶金鑰的請求一律回 `401`（`code: "missing_api_key"`）；OpenCode 拒絕金鑰時回 `401`（`code: "invalid_api_key"`）。

選用的環境變數（`.env.local`，皆非機密）：

| 變數 | 說明 |
| --- | --- |
| `OPENCODE_GO_MODEL` | 預設 `deepseek-v4.1-flash`（約 30–60 秒）。`kimi-k3` 品質相近但約 4 分鐘 |
| `OPENCODE_GO_BASE_URL` | 預設 `https://opencode.ai/zen/go/v1` |

## API：`POST /api/recommendation`

標頭：`Authorization: Bearer <你的 OpenCode 金鑰>`（必填）

`multipart/form-data`：

- `programs`：校系 id，可重複（見 `data/programs.ts`），1–8 個
- `file:<key>`：上傳檔案（PDF／DOCX／TXT／MD，單檔 ≤12MB），可多檔
- `text:<key>`：直接貼上的文字
- `notes`：補充說明（選填）
- `<key>` ∈ `autobiography | profile | studyPlan | transcript | extras`

回傳 JSON（型別見 `lib/types.ts` 的 `RecommendationResult`）。加上 `?stream=1` 則回傳 NDJSON 串流，事件為 `progress`／`result`／`error`，前端用此顯示進度。

另有 `POST /api/key/verify`：以同樣的標頭驗證金鑰是否有效（會送出一則極短的測試訊息，花費可忽略）。

## 資料來源與限制

- `data/programs.ts`：各校簡章審查方式，人工核對後萃取（清大分則 PDF 文字層損毀，改由頁面影像判讀）。實際規定以官方簡章為準。
- `data/historical-criteria.ts`：網路個案心得與少量公開數字，**非官方統計**，樣本小且有倖存者偏差。
- 錄取機率是 AI 的估計區間，未經統計校準；當年報名人數與競爭者強度未知。
- 不支援 OCR：掃描檔／圖片請改傳含文字層的 PDF，或直接貼上文字。
- 上傳資料只在單次請求中處理，不落地儲存。
