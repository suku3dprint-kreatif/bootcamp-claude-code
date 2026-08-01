"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileDropzone({
  label,
  hint,
  accept,
  file,
  onFileSelected,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onFileSelected: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        isDragging
          ? "border-slate-900 bg-slate-50 dark:border-slate-300 dark:bg-slate-900"
          : "border-slate-200 dark:border-slate-800",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onFileSelected(dropped);
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onFileSelected(selected);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        Browse file
      </button>
      {file && (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {file.name} · {formatFileSize(file.size)}
        </p>
      )}
    </div>
  );
}
