"use client";

import "@/lib/pdf";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/supabase";
import type { ProjectRecord } from "@/types";

export function PageGrid({ documentId }: { documentId: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProject(documentId).then(setProject).catch(() => setError("Unable to load project."));
  }, [documentId]);

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-ink" href="/">
              <ArrowLeft className="h-4 w-4" />
              Upload another PDF
            </Link>
            <h1 className="text-2xl font-semibold text-ink">Document pages</h1>
          </div>
          <div className="text-sm text-gray-500">{pageCount ? `${pageCount} pages` : ""}</div>
        </header>

        {error ? <p className="text-red-600">{error}</p> : null}
        {!project && !error ? <p className="text-gray-600">Loading document...</p> : null}
        {project ? (
          <Document
            file={project.pdfUrl}
            loading={<p className="text-gray-600">Rendering pages...</p>}
            error={<p className="text-red-600">Unable to render this PDF.</p>}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <Link
                    key={pageNumber}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    href={`/d/${documentId}/p/${pageNumber}`}
                  >
                    <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      <Page pageNumber={pageNumber} width={240} renderTextLayer={false} renderAnnotationLayer={false} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-ink">Page {pageNumber}</div>
                  </Link>
                );
              })}
            </div>
          </Document>
        ) : null}
      </div>
    </main>
  );
}
