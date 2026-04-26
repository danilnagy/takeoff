"use client";

import "@/lib/pdf";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 12;
const VIEWPORT_SYNC_DELAY = 80;
const RENDER_DEBOUNCE_DELAY = 260;
const RENDER_FADE_DURATION = 180;
const FIT_PADDING = 32;
const MAX_RENDER_PIXELS = 52000000;
const RENDER_SCALE_STEPS = [1, 1.5, 2, 3, 4, 5, 6, 8];

type ViewportState = {
  x: number;
  y: number;
  zoom: number;
};

type RenderLayerState = {
  id: number;
  scale: number;
  visible: boolean;
};

function getViewportTransform(viewport: ViewportState) {
  return `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`;
}

function getTargetRenderScale(zoom: number, pageSize: { width: number; height: number }) {
  const maxScale = Math.max(
    1,
    Math.sqrt(MAX_RENDER_PIXELS / (pageSize.width * pageSize.height))
  );
  const desiredScale = Math.min(zoom, maxScale);
  const availableSteps = RENDER_SCALE_STEPS.filter((step) => step <= maxScale);

  if (desiredScale <= 1.15) return 1;

  return (
    availableSteps.find((step) => step >= desiredScale * 0.92) ??
    availableSteps[availableSteps.length - 1] ??
    1
  );
}

function PdfRenderLayer({
  layerId,
  pageNumber,
  pageSize,
  renderScale,
  visible,
  onPageLoad,
  onRenderReady
}: {
  layerId: number;
  pageNumber: number;
  pageSize: { width: number; height: number };
  renderScale: number;
  visible: boolean;
  onPageLoad?: Parameters<typeof Page>[0]["onLoadSuccess"];
  onRenderReady?: (layerId: number) => void;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        width: pageSize.width,
        height: pageSize.height,
        opacity: visible ? 1 : 0,
        zIndex: layerId + 1,
        transition: `opacity ${RENDER_FADE_DURATION}ms ease-out`
      }}
    >
      <div
        style={{
          width: pageSize.width * renderScale,
          height: pageSize.height * renderScale,
          transform: `scale(${1 / renderScale})`,
          transformOrigin: "top left"
        }}
      >
        <Page
          key={`${pageNumber}.${layerId}.${renderScale}`}
          pageNumber={pageNumber}
          width={pageSize.width * renderScale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          onLoadSuccess={onPageLoad}
          onRenderSuccess={() => onRenderReady?.(layerId)}
        />
      </div>
    </div>
  );
}

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
  const [viewport, setViewport] = useState({ x: 24, y: 24, zoom: 1 });
  const [renderLayers, setRenderLayers] = useState<RenderLayerState[]>([
    { id: 0, scale: 1, visible: true }
  ]);
  const [pageReady, setPageReady] = useState(false);
  const [scaleLine, setScaleLine] = useState<[Point, Point] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLElement | null>(null);
  const drawingRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef(viewport);
  const activeRenderRef = useRef<RenderLayerState>({ id: 0, scale: 1, visible: true });
  const stagedRenderRef = useRef<RenderLayerState | null>(null);
  const nextRenderLayerIdRef = useRef(1);
  const hasFitToViewRef = useRef(false);
  const viewportSyncTimeoutRef = useRef<number | null>(null);
  const renderDebounceTimeoutRef = useRef<number | null>(null);
  const renderFadeTimeoutRef = useRef<number | null>(null);
  const panRef = useRef({
    startX: 0,
    startY: 0,
    viewportX: 0,
    viewportY: 0
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
      setPageReady(false);
      hasFitToViewRef.current = false;
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

  useEffect(() => {
    return () => {
      if (viewportSyncTimeoutRef.current !== null) {
        window.clearTimeout(viewportSyncTimeoutRef.current);
      }
      if (renderDebounceTimeoutRef.current !== null) {
        window.clearTimeout(renderDebounceTimeoutRef.current);
      }
      if (renderFadeTimeoutRef.current !== null) {
        window.clearTimeout(renderFadeTimeoutRef.current);
      }
    };
  }, []);

  const scaleLabel = useMemo(() => {
    if (!scale.factor) return "Scale not set";
    return `${scale.factor.toFixed(1)} px / m`;
  }, [scale.factor]);

  const applyViewport = useCallback((nextViewport: ViewportState) => {
    transformRef.current = nextViewport;

    if (drawingRef.current) {
      drawingRef.current.style.transform = getViewportTransform(nextViewport);
    }

    if (viewportSyncTimeoutRef.current !== null) {
      window.clearTimeout(viewportSyncTimeoutRef.current);
    }

    viewportSyncTimeoutRef.current = window.setTimeout(() => {
      setViewport(transformRef.current);
      viewportSyncTimeoutRef.current = null;
    }, VIEWPORT_SYNC_DELAY);
  }, []);

  const scheduleRenderForZoom = useCallback((zoom: number) => {
    if (renderDebounceTimeoutRef.current !== null) {
      window.clearTimeout(renderDebounceTimeoutRef.current);
    }

    renderDebounceTimeoutRef.current = window.setTimeout(() => {
      const targetRenderScale = getTargetRenderScale(zoom, pageSize);

      if (
        Math.abs(targetRenderScale - activeRenderRef.current.scale) < 0.01 ||
        Math.abs(targetRenderScale - (stagedRenderRef.current?.scale ?? 0)) < 0.01
      ) {
        return;
      }

      const nextLayer = {
        id: nextRenderLayerIdRef.current,
        scale: targetRenderScale,
        visible: false
      };

      nextRenderLayerIdRef.current += 1;
      stagedRenderRef.current = nextLayer;
      setRenderLayers((layers) => [
        layers.find((layer) => layer.id === activeRenderRef.current.id) ??
          activeRenderRef.current,
        nextLayer
      ]);
    }, RENDER_DEBOUNCE_DELAY);
  }, [pageSize]);

  function promoteRenderLayer(layerId: number) {
    const stagedLayer = stagedRenderRef.current;
    if (!stagedLayer || stagedLayer.id !== layerId) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const promotedLayer = { ...stagedLayer, visible: true };
        activeRenderRef.current = promotedLayer;
        stagedRenderRef.current = null;

        if (renderFadeTimeoutRef.current !== null) {
          window.clearTimeout(renderFadeTimeoutRef.current);
        }

        setRenderLayers((layers) =>
          layers.map((layer) =>
            layer.id === layerId ? promotedLayer : { ...layer, visible: true }
          )
        );

        renderFadeTimeoutRef.current = window.setTimeout(() => {
          setRenderLayers([promotedLayer]);
          renderFadeTimeoutRef.current = null;
        }, RENDER_FADE_DURATION);
      });
    });
  }

  function updateZoom(nextZoom: number, anchor?: { x: number; y: number }) {
    const container = viewportRef.current;
    const currentViewport = transformRef.current;
    const nextViewport = {
      ...currentViewport,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    };

    if (!container || !anchor) {
      applyViewport(nextViewport);
      scheduleRenderForZoom(nextViewport.zoom);
      return;
    }

    const rect = container.getBoundingClientRect();
    const anchorX = anchor.x - rect.left;
    const anchorY = anchor.y - rect.top;
    const drawingX = (anchorX - currentViewport.x) / currentViewport.zoom;
    const drawingY = (anchorY - currentViewport.y) / currentViewport.zoom;

    applyViewport({
      x: anchorX - drawingX * nextViewport.zoom,
      y: anchorY - drawingY * nextViewport.zoom,
      zoom: nextViewport.zoom
    });
    scheduleRenderForZoom(nextViewport.zoom);
  }

  function startPan(clientX: number, clientY: number) {
    setIsPanning(true);
    panRef.current = {
      startX: clientX,
      startY: clientY,
      viewportX: transformRef.current.x,
      viewportY: transformRef.current.y
    };
  }

  const fitPageToViewport = useCallback(() => {
    const container = viewportRef.current;
    if (!container) return false;

    const availableWidth = Math.max(container.clientWidth - FIT_PADDING * 2, 1);
    const availableHeight = Math.max(container.clientHeight - FIT_PADDING * 2, 1);
    const fitZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height)
      )
    );

    applyViewport({
      x: (container.clientWidth - pageSize.width * fitZoom) / 2,
      y: (container.clientHeight - pageSize.height * fitZoom) / 2,
      zoom: fitZoom
    });
    scheduleRenderForZoom(fitZoom);
    return true;
  }, [applyViewport, pageSize, scheduleRenderForZoom]);

  useEffect(() => {
    if (!pageReady || hasFitToViewRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      if (fitPageToViewport()) {
        hasFitToViewRef.current = true;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fitPageToViewport, pageReady]);

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
            onClick={() => {
              const rect = viewportRef.current?.getBoundingClientRect();
              updateZoom(
                transformRef.current.zoom / 1.2,
                rect
                  ? {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    }
                  : undefined
              );
            }}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="w-16 text-center text-sm font-medium text-gray-700">{Math.round(viewport.zoom * 100)}%</div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Zoom in"
            onClick={() => {
              const rect = viewportRef.current?.getBoundingClientRect();
              updateZoom(
                transformRef.current.zoom * 1.2,
                rect
                  ? {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    }
                  : undefined
              );
            }}
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
          ref={viewportRef}
          className="relative min-w-0 flex-1 overflow-hidden bg-[#eef1f5]"
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

            if (tool !== "pan" || event.button !== 0) return;
            event.preventDefault();
            startPan(event.clientX, event.clientY);
          }}
          onMouseMove={(event) => {
            if (!isPanning) return;
            const pan = panRef.current;
            applyViewport({
              ...transformRef.current,
              x: pan.viewportX + event.clientX - pan.startX,
              y: pan.viewportY + event.clientY - pan.startY
            });
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
            const wheelScale = Math.exp(-event.deltaY * 0.001);
            updateZoom(transformRef.current.zoom * wheelScale, {
              x: event.clientX,
              y: event.clientY
            });
          }}
        >
          {!project ? (
            <p className="p-6 text-gray-600">Loading drawing...</p>
          ) : (
            <div
              ref={drawingRef}
              className="absolute left-0 top-0 bg-white shadow-xl"
              style={{
                width: pageSize.width,
                height: pageSize.height,
                pointerEvents: tool === "pan" ? "none" : "auto",
                transform: getViewportTransform(transformRef.current),
                transformOrigin: "top left",
                willChange: "transform"
              }}
            >
              <Document
                file={project.pdfUrl}
                loading={<p className="p-4 text-sm text-gray-600">Loading PDF...</p>}
                error={<p className="p-4 text-sm text-red-600">Unable to load PDF.</p>}
              >
                <div className="absolute inset-0 pointer-events-none">
                  {renderLayers.map((layer) => (
                    <PdfRenderLayer
                      key={layer.id}
                      layerId={layer.id}
                      pageNumber={pageNumber}
                      pageSize={pageSize}
                      renderScale={layer.scale}
                      visible={layer.visible}
                      onPageLoad={(page) => {
                        const pageViewport = page.getViewport({ scale: 1 });
                        setPageSize({
                          width: BASE_WIDTH,
                          height: (BASE_WIDTH / pageViewport.width) * pageViewport.height
                        });
                        setPageReady(true);
                      }}
                      onRenderReady={promoteRenderLayer}
                    />
                  ))}
                </div>
              </Document>
              <Canvas
                width={pageSize.width}
                height={pageSize.height}
                zoom={1}
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
