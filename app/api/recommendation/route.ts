/**
 * POST /api/recommendation —— 推甄審查模擬器的後端入口。
 *
 * 【BYOK】本服務不持有任何 OpenCode Go 金鑰。呼叫端必須以 `Authorization: Bearer <key>` 帶上
 * 「自己的」金鑰；伺服器只在這次請求中轉發給 OpenCode Go，不儲存、不記錄，也不會退回讀取環境變數。
 *
 * 整體流程（由上到下）：
 *   0. 讀取並檢查金鑰（沒帶就 401，連表單都不解析）
 *   1. 讀取 multipart/form-data（校系 id、各類上傳檔案／貼上文字、補充說明）
 *   2. 快速驗證（校系數量、是否至少有一項資料）── 這些檢查很便宜，且要在開始串流「之前」做完，
 *      這樣才能回傳正確的 HTTP 400；一旦開始串流，狀態碼就已經送出（200）無法再改。
 *   3. 解析檔案（PDF／DOCX／TXT／MD）成純文字，並套用長度上限
 *   4. 呼叫 runRecommendation（組提示詞 → 呼叫 OpenCode Go 的 AI → 驗證並後處理結果）
 *   5. 依 ?stream=1 決定回傳方式：
 *        - 有帶：以 NDJSON 串流即時回報進度，最後送出 result（或 error）事件
 *        - 沒帶：等全部完成後一次回傳 JSON（給一般 API 使用者）
 *
 * 表單欄位約定：
 *   programs        校系 id，可重複；或一個 JSON 陣列字串（id 定義見 data/programs.ts）
 *   file:<key>      上傳檔案，可多檔（前端已改為在瀏覽器解析、只送文字，此欄位保留給直接呼叫 API 的使用者）
 *   text:<key>      直接貼上的文字，或前端解析後的文件文字
 *   warnings        前端解析時產生的警告（JSON 字串陣列，選填）
 *   notes           補充說明（選填）
 *   其中 <key> ∈ autobiography | profile | studyPlan | transcript | extras
 */
import { PROGRAMS } from "@/data/programs";
import { MISSING_KEY_MESSAGE, readApiKey } from "@/lib/api-key";
import { AiError } from "@/lib/opencode-go";
import { clip, parseUpload, MAX_CHARS_PER_DOC } from "@/lib/parse-files";
import type { DocInput } from "@/lib/prompt";
import { runRecommendation } from "@/lib/recommend";
import { DOC_KEYS, DOC_LABELS, type DocKey, type ProgressEvent } from "@/lib/types";

// ───────────────────────── 路由設定 ─────────────────────────

// 強制使用 Node.js 執行環境。解析 PDF（unpdf）、DOCX（mammoth，需要 Buffer）以及
// 產生 session id（node:crypto）都依賴 Node API，Edge runtime 沒有這些。
export const runtime = "nodejs";

// 此路由允許執行的最長秒數（單位：秒）。部署平台（如 Vercel）會讀取這個值作為函式逾時上限；
// 下面也用它來建立自己的逾時計時器，讓本機與自架環境行為一致。
// AI 分析通常 30–60 秒，較慢的模型可能到 4 分鐘，所以設 300 秒。
export const maxDuration = 300;

// ───────────────────────── 常數 ─────────────────────────

// 單次請求最多評估幾個校系。校系越多，提示詞越長、AI 輸出也越長，耗時與逾時風險都會上升。
const MAX_PROGRAMS = 8;

// 補充說明的字數上限，避免有人塞入超大文字拖慢請求或灌爆提示詞。
const MAX_NOTES_CHARS = 3000;

// 所有合法校系 id 的集合，用 Set 讓後面的「是否合法」檢查是 O(1)。
// 這也是白名單：任何不在 data/programs.ts 裡的 id 都會被丟棄，不會進到提示詞。
const VALID_IDS = new Set(PROGRAMS.map((p) => p.id));

// ───────────────────────── 小工具 ─────────────────────────

/**
 * 統一的 JSON 回應建構函式。
 * 加上 Cache-Control: no-store，因為內容含使用者的個人備審分析，不應被瀏覽器或中介代理快取。
 */
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * 從表單讀出「合法且不重複」的校系 id 清單。
 *
 * 表單可能用兩種方式傳校系：
 *   (a) 重複欄位：programs=ntu-csie&programs=nthu-csie-a（瀏覽器前端用這種）
 *   (b) 單一 JSON 陣列字串：programs=["ntu-csie","nthu-csie-a"]（方便程式呼叫）
 * 兩種都接受。不合法的 id（打錯字、未知校系）會被靜默丟棄；
 * 如果全部都被丟棄，呼叫端會因為「一個都沒有」而回 400。
 */
function readProgramIds(form: FormData): string[] {
  // 用 Set 自動去重：同一個 id 出現多次只算一次（也避免拿重複 id 灌高 MAX_PROGRAMS 的計數）
  const ids = new Set<string>();

  for (const v of form.getAll("programs")) {
    // FormData 的值可能是字串或 File；校系欄位只該是字串，其他型別直接略過
    if (typeof v !== "string") continue;

    // 先假設這個值本身就是一個 id（情況 a），包成單元素陣列，讓下面的迴圈統一處理
    // 同時接受重複欄位（programs=a&programs=b）與 JSON 陣列字串
    let list: unknown[] = [v];

    // 如果字串長得像 JSON 陣列（以 [ 開頭），就嘗試解析成陣列（情況 b）
    if (v.trim().startsWith("[")) {
      try {
        list = JSON.parse(v);
      } catch {
        /* 忽略，走原字串 */
        // 解析失敗就維持 list = [v]；整串字串當作 id 去比對白名單，比對不到就會被丟棄
      }
    }

    // 只保留「是字串」且「在白名單內」的 id。
    // JSON.parse 的結果型別是未知的（可能是數字、物件…），所以這裡要再檢查一次 typeof。
    for (const id of list) if (typeof id === "string" && VALID_IDS.has(id)) ids.add(id);
  }

  // Set 轉回陣列，保留插入順序（即使用者選擇的順序）
  return [...ids];
}

/**
 * 讀出前端在瀏覽器解析檔案時產生的警告（JSON 字串陣列）。
 * 前端已改為「先解析成文字再上傳」，解析失敗／掃描檔／內容過長的警告由前端產生並帶上來；
 * 伺服器只做基本清理（只收字串、限制數量），避免被塞入大量內容。
 */
function readClientWarnings(form: FormData): string[] {
  const raw = form.get("warnings");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * 解析所有上傳檔案與貼上文字，依「資料類別」彙整成 docs，並收集沿途的警告訊息。
 *
 * @param form    請求的表單資料
 * @param onStep  每開始解析一個檔案就呼叫一次，讓串流模式可以即時回報「正在解析哪個檔案」
 * @returns docs      每個類別（自傳、成績單…）各一筆：是否有提供、合併後的文字、檔名、是否被截斷
 *          warnings  給使用者看的警告（前端帶上來的解析警告、掃描檔、超過大小、格式不支援、內容過長被截斷…）
 */
async function collectDocs(form: FormData, onStep: (msg: string) => void) {
  // 先放入前端帶上來的警告（前端解析失敗、掃描檔、內容過長…）
  const warnings: string[] = readClientWarnings(form);
  // 先宣告成空物件再逐一填入；迴圈會走遍所有 DOC_KEYS，所以最後五個類別都一定存在，
  // 下游（提示詞、後處理）可以放心地用 docs[k] 取值而不必檢查 undefined。
  const docs = {} as Record<DocKey, DocInput>;

  // 逐一處理五種資料類別：自傳、個人資料表、學習／研究計劃書、成績單、有利審查資料
  for (const key of DOC_KEYS) {
    // 取出此類別所有上傳的檔案。
    // 兩個過濾條件：
    //   - f instanceof File：欄位值也可能是字串，這裡只要檔案（同時讓 TypeScript 縮窄型別）
    //   - f.size > 0：瀏覽器在使用者沒選檔時，有時會送出一個 0 位元組的空 File，要排除
    const files = form.getAll(`file:${key}`).filter((f): f is File => f instanceof File && f.size > 0);
    // 使用者在「或直接貼上文字」欄位貼的內容（只會有一筆，所以用 get）
    const pasted = form.get(`text:${key}`);
    // parts：這個類別最後要串在一起的文字片段（各檔案的內文 + 貼上的文字）
    const parts: string[] = [];
    // fileNames：成功讀到文字的檔名，之後會放進提示詞讓 AI 知道資料來源
    const fileNames: string[] = [];

    // 依序（不平行）解析每個檔案。刻意用序列 await：
    //   1. 進度訊息可以照順序即時回報；2. PDF/DOCX 解析吃記憶體，序列處理可避免同時吃滿
    for (const file of files) {
      onStep(`解析「${DOC_LABELS[key]}」：${file.name}`);
      // parseUpload 不會丟例外：失敗或不支援時，會回傳空文字 + warning 說明原因
      const parsed = await parseUpload(file);
      if (parsed.warning) warnings.push(parsed.warning);
      // 只有真的讀到文字才算「有內容」；讀不到（掃描檔、圖片…）不會進入 parts 與 fileNames
      if (parsed.text) {
        fileNames.push(parsed.name);
        // 同一類別上傳多個檔案時，在每段前面加上檔名分隔線，讓 AI 分得出內容來自哪一份；
        // 只有單一檔案就直接放內文，避免多餘的雜訊
        parts.push(files.length > 1 ? `--- 檔案：${parsed.name} ---\n${parsed.text}` : parsed.text);
      }
    }
    // 貼上的文字放在檔案內容之後；typeof 檢查是因為 get 也可能回傳 File 或 null
    if (typeof pasted === "string" && pasted.trim()) parts.push(pasted.trim());

    // 用空行把所有片段接成一份文字，再套用每類別的字數上限（MAX_CHARS_PER_DOC，避免提示詞爆量）
    const joined = parts.join("\n\n");
    const { text, truncated } = clip(joined);
    if (truncated) {
      // 被截斷要明確告知使用者：後段內容不會被評估，可能影響評分
      warnings.push(`「${DOC_LABELS[key]}」內容過長，僅取前 ${MAX_CHARS_PER_DOC} 字進行評估。`);
    }
    // provided 以「最後是否有文字」為準，而不是「有沒有上傳檔案」：
    // 上傳了掃描檔但抽不出文字時，這個類別仍會被視為「未提供」，AI 會照缺件處理。
    docs[key] = { provided: text.length > 0, text, fileNames, truncated };
  }
  return { docs, warnings };
}

// ───────────────────────── 路由處理函式 ─────────────────────────

export async function POST(request: Request) {
  // 1) 決定回傳模式：網址帶 ?stream=1 → 串流（前端用），否則 → 一次回傳完整 JSON
  const stream = new URL(request.url).searchParams.get("stream") === "1";

  // 0) BYOK：金鑰由使用者自備，從 Authorization 標頭讀取；沒帶或格式不合就直接回 401。
  //    這一步放在最前面：未授權的請求不必花力氣解析（可能很大的）上傳內容。
  //    刻意「不」退回讀環境變數：本服務不持有任何金鑰，因此也不會替匿名訪客花費任何人的額度。
  //    code 讓前端知道要引導使用者去設定金鑰，而不是顯示一般錯誤。
  const apiKey = readApiKey(request);
  if (!apiKey) return json({ error: MISSING_KEY_MESSAGE, code: "missing_api_key" }, 401);

  // OpenCode Go 需要穩定的 session id（前端以 x-opencode-session 帶上；缺少時上游會退回隨機值）
  const sessionId = request.headers.get("x-opencode-session") ?? undefined;

  // 2) 解析 multipart/form-data。若 Content-Type 不對或內容毀損，formData() 會丟例外，
  //    這是「呼叫方式錯誤」，回 400 而不是 500。
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "請以 multipart/form-data 上傳資料。" }, 400);
  }

  // 3) 快速驗證。這些都在開始串流之前完成，才能回傳真正的 HTTP 錯誤狀態碼。
  //    3-1 校系：至少一個、最多 MAX_PROGRAMS 個
  const programIds = readProgramIds(form);
  if (programIds.length === 0) return json({ error: "請至少選擇一個校系。" }, 400);
  if (programIds.length > MAX_PROGRAMS) {
    return json({ error: `一次最多評估 ${MAX_PROGRAMS} 個校系，請減少選擇。` }, 400);
  }
  //    3-2 資料：五個類別中，至少要有一個有上傳檔案或貼上文字。
  //        這裡只做「有沒有」的粗略檢查，還沒真正解析檔案（解析較耗時，放到串流開始後再做並回報進度）。
  const hasInput = DOC_KEYS.some((k) => {
    const t = form.get(`text:${k}`);
    const files = form.getAll(`file:${k}`).filter((f): f is File => f instanceof File && f.size > 0);
    return files.length > 0 || (typeof t === "string" && t.trim().length > 0);
  });
  if (!hasInput) return json({ error: "請至少上傳或貼上一項資料。" }, 400);

  // 4) 補充說明：轉成字串（沒有則空字串）並截斷到上限。
  //    String(... ?? "") 是為了處理欄位不存在（null）或被送成 File 的情況，確保後面一定拿到字串。
  const notes = String(form.get("notes") ?? "").slice(0, MAX_NOTES_CHARS);

  // 5) 取消／逾時訊號：兩個條件「任一成立」就中止整個流程：
  //      - request.signal：使用者關掉頁面、按取消、網路中斷（用戶端斷線）
  //      - AbortSignal.timeout：跑滿 maxDuration 秒仍未完成
  //    這個 signal 會一路傳給呼叫 AI 的 fetch，斷線時能真的停掉上游請求，不會白白繼續燒額度。
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(maxDuration * 1000)]);

  // 6) 核心工作。把「解析檔案 → 呼叫 AI」包成一個函式，並透過 emit 回報進度，
  //    這樣串流與非串流兩種模式可以共用同一份邏輯（非串流模式傳入空的 emit 即可）。
  const work = async (emit: (e: ProgressEvent) => void) => {
    // 6-1 解析上傳檔案；解析每個檔案時透過 onStep 即時回報
    emit({ type: "progress", stage: "parsing", message: "正在解析上傳的檔案…" });
    const { docs, warnings } = await collectDocs(form, (message) =>
      emit({ type: "progress", stage: "parsing", message }),
    );
    // 6-2 二次確認：3-2 只檢查「有上傳」，這裡檢查「真的讀到文字」。
    //     若使用者只傳了掃描檔／圖片，全部解析不出內容，就把警告原因當作錯誤訊息回報，
    //     而不是把空資料丟給 AI 浪費一次呼叫。
    if (!DOC_KEYS.some((k) => docs[k].provided)) {
      throw new Error(warnings.join("\n") || "沒有讀到任何可用的文字內容。");
    }
    // 6-3 呼叫 AI。這一步最久（數十秒到數分鐘）；
    //     onProgress 會定時（約每秒）回報「AI 推理中／撰寫中」與已輸出字數，前端據此顯示進度。
    //     warnings 一併傳入，最後會附在結果裡顯示給使用者。
    emit({ type: "progress", stage: "analyzing", message: "已送出審查請求，等待 AI 回應…" });
    return runRecommendation(
      { programIds, docs, notes, warnings },
      {
        apiKey,
        sessionId,
        signal,
        onProgress: (message, chars) => emit({ type: "progress", stage: "analyzing", message, chars }),
      },
    );
  };

  // 7) 把任意被丟出的東西轉成給使用者看的訊息字串。
  //    只有 Error 才取 message；其他型別（字串、物件…）一律顯示「未知錯誤」，避免洩漏內部細節。
  const errMessage = (e: unknown) => (e instanceof Error ? e.message : "未知錯誤");

  // 上游（OpenCode Go）拒絕金鑰時，錯誤會帶 code = "invalid_api_key"，前端據此重新開啟金鑰設定
  const errCode = (e: unknown) => (e instanceof AiError ? e.code : undefined);

  // 8) 非串流模式：等 work 全部完成，一次回傳 JSON。
  //    金鑰被上游拒絕 → 401（並帶 code）；work 內其他失敗（檔案全部無法解析、AI 呼叫失敗、
  //    逾時、格式無法解析…）目前一律以 502 回應，代表「後端處理／上游服務出問題」，這是刻意的簡化處理。
  if (!stream) {
    try {
      return json(await work(() => {}));
    } catch (e) {
      const code = errCode(e);
      return json({ error: errMessage(e), code }, code ? 401 : 502);
    }
  }

  // 9) 串流模式：回傳 NDJSON（每行一個 JSON 事件，以換行分隔）。
  //    事件種類（型別見 lib/types.ts 的 ProgressEvent）：
  //      {"type":"progress", ...}  進度訊息，可能出現很多次
  //      {"type":"result",   ...}  最終結果，成功時出現一次
  //      {"type":"error",    ...}  失敗訊息，失敗時出現一次
  //    為何錯誤要放進串流事件而不是 HTTP 狀態碼？因為一旦開始串流，200 狀態碼已經送出，
  //    之後發生的錯誤只能透過串流內容告知前端。
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    // start 在建立串流時立刻被呼叫；這裡直接把整個工作在其中執行，
    // 邊做邊用 enqueue 推送事件，Response 則會先被回傳，前端即可開始收到資料。
    async start(controller) {
      // 把一個事件序列化成「一行 JSON + 換行」並推入串流。
      // 用戶端中途斷線後，串流會被關閉，此時再 enqueue 會丟例外；這裡吞掉即可，
      // 因為斷線後已無人接收，且 signal 也會讓上游 AI 呼叫一併中止。
      const emit = (e: ProgressEvent) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* 用戶端已斷線 */
        }
      };
      try {
        // 成功：把最終結果作為 result 事件送出
        emit({ type: "result", data: await work(emit) });
      } catch (e) {
        // 失敗：以 error 事件告知前端（前端讀到後會顯示錯誤訊息）
        emit({ type: "error", message: errMessage(e), code: errCode(e) });
      } finally {
        // 不論成功或失敗都要關閉串流，前端才知道「已經結束」。
        // 若串流已被關閉（用戶端斷線），close() 會丟例外，同樣吞掉。
        try {
          controller.close();
        } catch {
          /* 已關閉 */
        }
      }
    },
  });

  // application/x-ndjson：換行分隔的 JSON 串流格式。
  // no-store：避免任何快取或代理把串流緩衝到結束才送出，導致前端看不到即時進度。
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
