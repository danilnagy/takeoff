"use client";

import { create } from "zustand";
import type { Point, ScaleState, TakeoffElement, ToolMode } from "@/types";
import { calculateValue } from "@/lib/utils";

type StoreState = {
  elements: TakeoffElement[];
  selectedIds: string[];
  tool: ToolMode;
  scale: ScaleState;
  draftPoints: Point[];
  setElements: (elements: TakeoffElement[]) => void;
  setTool: (tool: ToolMode) => void;
  setScale: (scale: ScaleState) => void;
  setDraftPoints: (points: Point[]) => void;
  selectElement: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  addElement: (element: TakeoffElement) => void;
  deleteSelected: () => void;
  deleteElement: (id: string) => void;
  updateElementPoint: (id: string, pointIndex: number, point: Point) => void;
  reorderElements: (activeId: string, overId: string) => void;
};

export const useStore = create<StoreState>((set, get) => ({
  elements: [],
  selectedIds: [],
  tool: "select",
  scale: { factor: null, unit: "meters" },
  draftPoints: [],
  setElements: (elements) => set({ elements }),
  setTool: (tool) => set({ tool, draftPoints: [] }),
  setScale: (scale) =>
    set((state) => ({
      scale,
      elements: state.elements.map((element) => ({
        ...element,
        value: calculateValue(element.type, element.points, scale.factor)
      }))
    })),
  setDraftPoints: (draftPoints) => set({ draftPoints }),
  selectElement: (id, additive) =>
    set((state) => ({
      selectedIds: additive
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedIds, id]
        : [id]
    })),
  clearSelection: () => set({ selectedIds: [] }),
  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      selectedIds: [element.id],
      draftPoints: [],
      tool: element.type === "point" ? state.tool : "select"
    })),
  deleteSelected: () =>
    set((state) => ({
      elements: state.elements.filter((element) => !state.selectedIds.includes(element.id)),
      selectedIds: []
    })),
  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((element) => element.id !== id),
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id)
    })),
  updateElementPoint: (id, pointIndex, point) =>
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id !== id) return element;
        const points = element.points.map((existing, index) =>
          index === pointIndex ? point : existing
        );
        return {
          ...element,
          points,
          value: calculateValue(element.type, points, state.scale.factor)
        };
      })
    })),
  reorderElements: (activeId, overId) =>
    set((state) => {
      const active = state.elements.find((element) => element.id === activeId);
      const over = state.elements.find((element) => element.id === overId);
      if (!active || !over || active.type !== over.type) return state;

      const group = state.elements
        .filter((element) => element.type === active.type)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const oldIndex = group.findIndex((element) => element.id === activeId);
      const newIndex = group.findIndex((element) => element.id === overId);
      const [moved] = group.splice(oldIndex, 1);
      group.splice(newIndex, 0, moved);

      const reorderedGroup = group.map((element, index) => ({
        ...element,
        displayOrder: index
      }));

      return {
        elements: state.elements.map(
          (element) => reorderedGroup.find((item) => item.id === element.id) ?? element
        )
      };
    })
}));
