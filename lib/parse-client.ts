// 瀏覽器端檔案解析：在使用者的瀏覽器把 PDF／DOCX／TXT／MD 抽成純文字。
//
// 為什麼要在前端做？部署平台（如 Vercel）對 Serverless Function 的請求 body 有大小上限
// （約 4.5MB），一旦上傳的原檔超過就會在我們的程式碼執行前被平台回 413。改成前端先解析、
// 只把「文字」送上伺服器，就能徹底避開這個限制，而且原檔不離開瀏覽器，更保護隱私。
//
// 解析邏輯與伺服器端（lib/parse-files.ts）刻意保持一致；PDF 用 unpdf、DOCX 用 mammoth，
// 兩者都只在真的選到該格式時才以動態 import 載入（避免拖慢初始頁面）。

import { MAX_FILE_BYTES, MAX_CHARS_PER_DOC } from "./limits";

export interface ParsedFile {
  name: string;
  text: string;
  warning?: string;
}

const TEXT_EXT = [".txt", ".md", ".markdown", ".csv", ".json"];

/** 把單一類別的合併文字套用長度上限。 */
export function clipDoc(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CHARS_PER_DOC) return { text, truncated: false };
  return { text: text.slice(0, MAX_CHARS_PER_DOC), truncated: true };
}

/** 從瀏覽器端選取的檔案擷取純文字；失敗或不支援時以 warning 說明，不丟例外。 */
export async function parseFileInBrowser(file: File): Promise<ParsedFile> {
  const name = file.name || "未命名檔案";
  const lower = name.toLowerCase();

  if (file.size > MAX_FILE_BYTES) {
    return { name, text: "", warning: `「${name}」超過 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限，已略過。` };
  }

  try {
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      // NFKC 把 PDF 常見的康熙部首相容字（⼤、⼯…）還原成一般漢字
      const clean = text.normalize("NFKC").trim();
      if (clean.length < 40 * Math.max(1, totalPages)) {
        return {
          name,
          text: clean,
          warning: `「${name}」幾乎抽不到文字，可能是掃描檔（圖片）。請改傳含文字層的 PDF，或改用「貼上文字」。`,
        };
      }
      return { name, text: clean };
    }

    if (lower.endsWith(".docx")) {
      const mod = await import("mammoth");
      const mammoth = mod.default ?? mod;
      // 瀏覽器版 mammoth 需要 arrayBuffer（Node 版才是 buffer）
      const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { name, text: value.trim() };
    }

    if (TEXT_EXT.some((e) => lower.endsWith(e)) || file.type.startsWith("text/")) {
      return { name, text: (await file.text()).trim() };
    }

    if (file.type.startsWith("image/")) {
      return { name, text: "", warning: `「${name}」是圖片，目前不支援 OCR。請改傳 PDF／Word／文字檔，或貼上文字。` };
    }

    return { name, text: "", warning: `「${name}」格式不支援（支援 PDF、DOCX、TXT、MD）。` };
  } catch (e) {
    return { name, text: "", warning: `「${name}」解析失敗：${e instanceof Error ? e.message : "未知錯誤"}` };
  }
}
