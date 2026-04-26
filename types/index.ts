export type Point = {
  x: number;
  y: number;
};

export type ElementType = "point" | "polyline" | "closed_polyline";

export type TakeoffElement = {
  id: string;
  type: ElementType;
  points: Point[];
  value: number;
  displayOrder: number;
};

export type ScaleState = {
  factor: number | null;
  unit: "meters";
};

export type ProjectRecord = {
  id: string;
  pdfUrl: string;
  createdAt: string;
};

export type ToolMode = "select" | "pan" | "point" | "polyline" | "closed_polyline" | "scale";
