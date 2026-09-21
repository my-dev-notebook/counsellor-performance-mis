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
            className={`dropzone ${isDraggingOver ? "active" : ""}`}
        >
            <div className="icon">
                {busy ? <span className="spinner" aria-hidden /> : <FiUploadCloud aria-hidden />}
            </div>
            <p className="t">{busy ? "Parsing workbook…" : "Drop a monthly performance .xlsx here"}</p>
            <p className="d">or</p>
            <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="btn btn-primary mt-4"
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
