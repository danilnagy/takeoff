import clsx, { type ClassValue } from "clsx";
import type { Point } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polylineLength(points: Point[]) {
  return points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    return sum + distance(points[index - 1], point);
  }, 0);
}

export function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;

  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.abs(area / 2);
}

export function calculateValue(
  type: "point" | "polyline" | "closed_polyline",
  points: Point[],
  scaleFactor: number | null
) {
  if (type === "point") return 1;
  if (!scaleFactor) return 0;
  if (type === "polyline") return polylineLength(points) / scaleFactor;
  return polygonArea(points) / (scaleFactor * scaleFactor);
}

export function formatValue(
  type: "point" | "polyline" | "closed_polyline",
  value: number,
  unit = "m"
) {
  if (type === "point") return `${value} count`;
  if (type === "polyline") return `${value.toFixed(2)} ${unit}`;
  return `${value.toFixed(2)} ${unit}²`;
}
