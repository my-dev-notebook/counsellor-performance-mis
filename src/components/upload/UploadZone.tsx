"use client";

import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";

export function UploadZone({ onFileSelected, busy }: { onFileSelected: (file: File) => void; busy: boolean }) {
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
            data-component="UploadZone"
            onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
            }}
            onDragLeave={() => {
                setIsDraggingOver(false);
            }}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                isDraggingOver ? "border-ring bg-accent" : "border-input bg-card"
            }`}
        >
            <FiUploadCloud className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
                {busy ? "Parsing workbook…" : "Drop a monthly performance .xlsx here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">or</p>
            <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
