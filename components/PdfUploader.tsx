"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { createProjectFromPdf, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function PdfUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const project = await createProjectFromPdf(file);
      router.push(`/d/${project.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setIsUploading(false);
    }
  }

  return (
    <section
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-8 text-center shadow-sm transition",
        isDragging ? "border-accent bg-blue-50" : "border-gray-300"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleFile(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="application/pdf"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-ink">
        {isUploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileUp className="h-7 w-7" />}
      </div>
      <h2 className="text-xl font-semibold text-ink">Upload a drawing set</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
        Drop a PDF here or choose one from your computer. Multi-page files are supported.
      </p>
      <button
        className="mt-6 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Choose PDF"}
      </button>
      {!isSupabaseConfigured ? (
        <p className="mt-4 text-xs text-gray-500">
          Local preview mode is active until Supabase environment variables are set.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
