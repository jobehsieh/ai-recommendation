// 上傳檔案與文字長度的共用上限。
// 放在獨立模組，讓「伺服器端解析」（parse-files.ts）與「瀏覽器端解析」（parse-client.ts）
// 共用同一組數字，且瀏覽器端不會因此把 unpdf／mammoth 一起打包進來。

/** 單一檔案大小上限（bytes）。超過就不解析，避免瀏覽器記憶體被吃滿。 */
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** 每一類資料合併後的文字上限（字元）。避免提示詞爆量、也讓送出的內容維持精簡。 */
export const MAX_CHARS_PER_DOC = 16000;
