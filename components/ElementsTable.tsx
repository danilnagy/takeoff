"use client";

import { useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2, Ruler, Trash2 } from "lucide-react";
import type { ElementType, TakeoffElement } from "@/types";
import { cn, formatValue } from "@/lib/utils";

const labels: Record<ElementType, string> = {
  scale: "Scale",
  point: "Point",
  polyline: "Polyline",
  closed_polyline: "Closed Polyline"
};

const categoryLabels: Record<ElementType, string> = {
  scale: "Scale",
  point: "Count",
  polyline: "Length",
  closed_polyline: "Area"
};

function SortableRow({
  element,
  selected,
  onSelect,
  onDelete
}: {
  element: TakeoffElement;
  selected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: element.id
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm",
        selected && "bg-blue-50"
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={(event) => onSelect(element.id, event.ctrlKey)}
    >
      <button
        className="flex h-7 w-7 cursor-grab items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        title="Reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">
          {labels[element.type]} {element.displayOrder + 1}
        </div>
        <div className="text-xs text-gray-500">{formatValue(element.type, element.value)}</div>
      </div>
      <button
        className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="Delete"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(element.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ScaleRow({
  element,
  selected,
  onSelect,
  onEditScale
}: {
  element: TakeoffElement;
  selected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onEditScale: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm",
        selected && "bg-blue-50"
      )}
      onClick={(event) => onSelect(element.id, event.ctrlKey)}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-700">
        <Ruler className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-ink">Drawing scale</div>
        <div className="text-xs text-gray-500">Reference length</div>
      </div>
      <button
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-right text-base font-semibold leading-none text-ink shadow-sm hover:border-accent hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
        title="Set reference length"
        onClick={(event) => {
          event.stopPropagation();
          onEditScale(element.id);
        }}
      >
        {formatValue(element.type, element.value)}
      </button>
    </div>
  );
}

export function ElementsTable({
  elements,
  selectedIds,
  onSelect,
  onDelete,
  onReorder,
  onEditScale
}: {
  elements: TakeoffElement[];
  selectedIds: string[];
  onSelect: (id: string, additive?: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onEditScale: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onReorder(String(event.active.id), String(event.over.id));
  }

  const scaleElement = elements.find((element) => element.type === "scale");
  const groups = (["point", "polyline", "closed_polyline"] as ElementType[]).map((type) => ({
    type,
    items: elements
      .filter((element) => element.type === type)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }));

  return (
    <aside
      className={cn(
        "border-l border-gray-200 bg-white shadow-sm",
        expanded
          ? "fixed inset-4 z-40 rounded-lg border"
          : "h-full w-[360px] shrink-0"
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="font-semibold text-ink">Elements</h2>
          <p className="text-xs text-gray-500">{elements.length} total</p>
        </div>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-ink"
          title={expanded ? "Dock panel" : "Expand panel"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="h-[calc(100%-65px)] overflow-auto">
          {scaleElement ? (
            <ScaleRow
              element={scaleElement}
              selected={selectedIds.includes(scaleElement.id)}
              onSelect={onSelect}
              onEditScale={onEditScale}
            />
          ) : null}
          {groups.map((group) => (
            <section key={group.type}>
              <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {categoryLabels[group.type]}
              </div>
              {group.items.length ? (
                <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {group.items.map((element) => (
                    <SortableRow
                      key={element.id}
                      element={element}
                      selected={selectedIds.includes(element.id)}
                      onSelect={onSelect}
                      onDelete={onDelete}
                    />
                  ))}
                </SortableContext>
              ) : (
                <div className="px-4 py-4 text-sm text-gray-400">No elements</div>
              )}
            </section>
          ))}
        </div>
      </DndContext>
    </aside>
  );
}
