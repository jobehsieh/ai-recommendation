"use client";

import { useId, useRef, useState } from "react";

const ACCEPT = ".pdf,.docx,.txt,.md";

export default function UploadCard({
  label,
  hint,
  files,
  text,
  onFiles,
  onText,
  disabled,
}: {
  label: string;
  hint: string;
  files: File[];
  text: string;
  onFiles: (files: File[]) => void;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showText, setShowText] = useState(false);
  const has = files.length > 0 || text.trim().length > 0;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    onFiles(next);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            has
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          {has ? "已提供" : "未提供"}
        </span>
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center text-sm transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/60"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className="text-muted">拖曳檔案到這裡，或點擊選擇</span>
        <span className="mt-0.5 text-xs text-muted">PDF／Word(.docx)／TXT／MD，單檔 12MB 內；在你的瀏覽器解析後只上傳文字</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f) => (
            <li
              key={`${f.name}-${f.size}`}
              className="flex items-center justify-between gap-2 rounded-md bg-background px-2.5 py-1.5 text-xs"
            >
              <span className="truncate">
                {f.name} <span className="text-muted">（{(f.size / 1024).toFixed(0)} KB）</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFiles(files.filter((x) => x !== f))}
                className="shrink-0 text-muted hover:text-red-500 disabled:opacity-50"
                aria-label={`移除 ${f.name}`}
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowText((v) => !v)}
        className="mt-3 text-xs text-accent hover:underline"
      >
        {showText ? "收合文字輸入" : "或直接貼上文字"}
      </button>
      {(showText || text) && (
        <textarea
          value={text}
          disabled={disabled}
          onChange={(e) => onText(e.target.value)}
          rows={5}
          placeholder="貼上內容…（與上傳檔案會一併評估）"
          className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
        />
      )}
    </div>
  );
}
