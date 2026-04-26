"use client";

import "@/lib/pdf";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Canvas } from "@/components/Canvas";
import { DrawingTools } from "@/components/DrawingTools";
import { ElementsTable } from "@/components/ElementsTable";
import { ScaleTool } from "@/components/ScaleTool";
import {
  getPageKey,
  getProject,
  loadElements,
  loadScale,
  saveElements,
  saveScale
} from "@/lib/supabase";
import { distance } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { Point, ProjectRecord } from "@/types";

const BASE_WIDTH = 1100;

export function PdfViewer({
  documentId,
  pageNumber
}: {
  documentId: string;
  pageNumber: number;
}) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: BASE_WIDTH, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [scaleLine, setScaleLine] = useState<[Point, Point] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);
  const panRef = useRef({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  const {
    elements,
    selectedIds,
    tool,
    scale,
    draftPoints,
    setElements,
    setTool,
    setScale,
    setDraftPoints,
    selectElement,
    clearSelection,
    addElement,
    deleteSelected,
    deleteElement,
    updateElementPoint,
    reorderElements
  } = useStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoaded(false);
      const [projectRecord, resolvedPageKey] = await Promise.all([
        getProject(documentId),
        getPageKey(documentId, pageNumber)
      ]);

      if (cancelled) return;
      setProject(projectRecord);
      setPageKey(resolvedPageKey);

      const [savedElements, savedScale] = await Promise.all([
        loadElements(resolvedPageKey),
        loadScale(resolvedPageKey)
      ]);

      if (cancelled) return;
      setElements(savedElements);
      setScale(savedScale);
      clearSelection();
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clearSelection, documentId, pageNumber, setElements, setScale]);

  useEffect(() => {
    if (!pageKey || !loaded) return;
    const timeout = window.setTimeout(() => {
      void saveElements(pageKey, elements);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [elements, loaded, pageKey]);

  useEffect(() => {
    if (!pageKey || !loaded) return;
    void saveScale(pageKey, scale);
  }, [loaded, pageKey, scale]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Delete" && selectedIds.length) {
        deleteSelected();
      }
      if (event.key === "Escape") {
        setDraftPoints([]);
        clearSelection();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection, deleteSelected, selectedIds.length, setDraftPoints]);

  useEffect(() => {
    function handleMouseUp(event: MouseEvent) {
      if (event.button !== 2) return;
      setIsPanning(false);
      setTool("select");
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [setTool]);

  const scaleLabel = useMemo(() => {
    if (!scale.factor) return "Scale not set";
    return `${scale.factor.toFixed(1)} px / m`;
  }, [scale.factor]);

  function updateZoom(nextZoom: number, anchor?: { x: number; y: number }) {
    const container = scrollRef.current;
    const clamped = Math.min(3, Math.max(0.35, nextZoom));

    if (!container || !anchor) {
      setZoom(clamped);
      return;
    }

    const rect = container.getBoundingClientRect();
    const offsetX = anchor.x - rect.left;
    const offsetY = anchor.y - rect.top;
    const drawingX = (container.scrollLeft + offsetX) / zoom;
    const drawingY = (container.scrollTop + offsetY) / zoom;

    setZoom(clamped);
    window.requestAnimationFrame(() => {
      container.scrollLeft = drawingX * clamped - offsetX;
      container.scrollTop = drawingY * clamped - offsetY;
    });
  }

  function startPan(clientX: number, clientY: number) {
    if (!scrollRef.current) return;

    setIsPanning(true);
    panRef.current = {
      startX: clientX,
      startY: clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop
    };
  }

  return (
    <main className="flex h-screen flex-col bg-[#eef1f5]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-ink"
            href={`/d/${documentId}`}
            title="Back to pages"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">Page {pageNumber}</h1>
            <p className="text-xs text-gray-500">{scaleLabel}</p>
          </div>
        </div>

        <DrawingTools tool={tool} onToolChange={setTool} />

        <div className="flex items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Zoom out"
            onClick={() => updateZoom(zoom - 0.15)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="w-16 text-center text-sm font-medium text-gray-700">{Math.round(zoom * 100)}%</div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Zoom in"
            onClick={() => updateZoom(zoom + 0.15)}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            title="Delete selected"
            disabled={!selectedIds.length}
            onClick={deleteSelected}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section
          ref={scrollRef}
          className="min-w-0 flex-1 overflow-hidden p-6"
          style={{ cursor: tool === "pan" ? (isPanning ? "grabbing" : "grab") : undefined }}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onMouseDown={(event) => {
            if (event.button === 2) {
              event.preventDefault();
              setTool("pan");
              startPan(event.clientX, event.clientY);
              return;
            }

            if (tool !== "pan" || event.button !== 0 || !scrollRef.current) return;
            event.preventDefault();
            startPan(event.clientX, event.clientY);
          }}
          onMouseMove={(event) => {
            if (!isPanning || !scrollRef.current) return;
            const pan = panRef.current;
            scrollRef.current.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
            scrollRef.current.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
          }}
          onMouseUp={(event) => {
            setIsPanning(false);
            if (event.button === 2) {
              event.preventDefault();
              setTool("select");
            }
          }}
          onMouseLeave={() => setIsPanning(false)}
          onWheel={(event) => {
            event.preventDefault();
            const direction = event.deltaY > 0 ? -1 : 1;
            updateZoom(zoom + direction * 0.12, { x: event.clientX, y: event.clientY });
          }}
        >
          {!project ? (
            <p className="text-gray-600">Loading drawing...</p>
          ) : (
            <Document file={project.pdfUrl} loading={<p>Loading PDF...</p>} error={<p className="text-red-600">Unable to load PDF.</p>}>
              <div
                className="relative mx-auto bg-white shadow-xl"
                style={{
                  width: pageSize.width * zoom,
                  height: pageSize.height * zoom,
                  pointerEvents: tool === "pan" ? "none" : "auto"
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageSize.width * zoom}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={(page) => {
                    const viewport = page.getViewport({ scale: 1 });
                    setPageSize({
                      width: BASE_WIDTH,
                      height: (BASE_WIDTH / viewport.width) * viewport.height
                    });
                  }}
                />
                <Canvas
                  width={pageSize.width}
                  height={pageSize.height}
                  zoom={zoom}
                  elements={elements}
                  selectedIds={selectedIds}
                  tool={tool}
                  draftPoints={draftPoints}
                  scaleFactor={scale.factor}
                  onDraftChange={setDraftPoints}
                  onAddElement={addElement}
                  onSelect={selectElement}
                  onPointDrag={updateElementPoint}
                  onScaleLine={setScaleLine}
                />
              </div>
            </Document>
          )}
        </section>
        <ElementsTable
          elements={elements}
          selectedIds={selectedIds}
          onSelect={selectElement}
          onDelete={deleteElement}
          onReorder={reorderElements}
        />
      </div>

      <ScaleTool
        points={scaleLine}
        onCancel={() => setScaleLine(null)}
        onApply={(meters) => {
          if (!scaleLine) return;
          setScale({ factor: distance(scaleLine[0], scaleLine[1]) / meters, unit: "meters" });
          setScaleLine(null);
          setTool("select");
        }}
      />
    </main>
  );
}
