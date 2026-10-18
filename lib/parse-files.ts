import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { MAX_FILE_BYTES, MAX_CHARS_PER_DOC } from "./limits";

export { MAX_FILE_BYTES, MAX_CHARS_PER_DOC };

export interface ParsedFile {
  name: string;
  text: string;
  warning?: string;
}

const TEXT_EXT = [".txt", ".md", ".markdown", ".csv", ".json"];

/** 從上傳檔擷取純文字；失敗或不支援時以 warning 說明，不丟例外。 */
export async function parseUpload(file: File): Promise<ParsedFile> {
  const name = file.name || "未命名檔案";
  const lower = name.toLowerCase();

  if (file.size > MAX_FILE_BYTES) {
    return { name, text: "", warning: `「${name}」超過 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限，已略過。` };
  }

  try {
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
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
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
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

export function clip(text: string, max = MAX_CHARS_PER_DOC): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}
