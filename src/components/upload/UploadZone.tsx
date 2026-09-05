"use client";

import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";

export function UploadZone({
  onFileSelected,
  busy,
}: {
  onFileSelected: (file: File) => void;
  busy: boolean;
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => {
        setIsDraggingOver(false);
      }}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        isDraggingOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-zinc-900">
        {busy ? "Parsing workbook…" : "Drop a monthly performance .xlsx here"}
      </p>
      <p className="mt-1 text-sm text-zinc-500">or</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
        }}
      />
    </div>
  );
}
