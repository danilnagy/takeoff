"use client";

import { Circle, Group, Layer, Line, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { ElementType, Point, TakeoffElement, ToolMode } from "@/types";
import { calculateValue, distance, newId } from "@/lib/utils";

const colors: Record<ElementType, string> = {
  point: "#2563eb",
  polyline: "#dc2626",
  closed_polyline: "#059669"
};

export function Canvas({
  width,
  height,
  zoom,
  elements,
  selectedIds,
  tool,
  draftPoints,
  scaleFactor,
  onDraftChange,
  onAddElement,
  onSelect,
  onPointDrag,
  onScaleLine
}: {
  width: number;
  height: number;
  zoom: number;
  elements: TakeoffElement[];
  selectedIds: string[];
  tool: ToolMode;
  draftPoints: Point[];
  scaleFactor: number | null;
  onDraftChange: (points: Point[]) => void;
  onAddElement: (element: TakeoffElement) => void;
  onSelect: (id: string, additive?: boolean) => void;
  onPointDrag: (id: string, pointIndex: number, point: Point) => void;
  onScaleLine: (points: [Point, Point]) => void;
}) {
  function getPointer(event: KonvaEventObject<MouseEvent>): Point | null {
    const stage = event.target.getStage();
    const position = stage?.getPointerPosition();
    if (!position) return null;
    return { x: position.x / zoom, y: position.y / zoom };
  }

  function createElement(type: ElementType, points: Point[]) {
    onAddElement({
      id: newId(),
      type,
      points,
      value: calculateValue(type, points, scaleFactor),
      displayOrder: elements.filter((element) => element.type === type).length
    });
  }

  function handleStageClick(event: KonvaEventObject<MouseEvent>) {
    if (event.evt.button !== 0) return;
    if (event.target !== event.target.getStage()) return;
    const point = getPointer(event);
    if (!point) return;

    if (tool === "select" || tool === "pan") return;
    if (tool === "point") {
      createElement("point", [point]);
      return;
    }

    if (tool === "scale") {
      const next = [...draftPoints, point];
      if (next.length === 2) {
        onScaleLine([next[0], next[1]]);
        onDraftChange([]);
      } else {
        onDraftChange(next);
      }
      return;
    }

    if (tool === "closed_polyline" && draftPoints.length >= 3 && distance(draftPoints[0], point) < 12 / zoom) {
      createElement("closed_polyline", draftPoints);
      return;
    }

    onDraftChange([...draftPoints, point]);
  }

  function handleDoubleClick() {
    if (tool === "polyline" && draftPoints.length >= 2) {
      createElement("polyline", draftPoints);
    }
  }

  return (
    <Stage
      className="absolute left-0 top-0"
      width={width * zoom}
      height={height * zoom}
      onClick={handleStageClick}
      onDblClick={handleDoubleClick}
    >
      <Layer>
        <Group scaleX={zoom} scaleY={zoom}>
          {elements.map((element) => {
            const color = colors[element.type];
            const selected = selectedIds.includes(element.id);
            if (element.type === "point") {
              return (
                <Circle
                  key={element.id}
                  x={element.points[0].x}
                  y={element.points[0].y}
                  radius={selected ? 7 : 5}
                  fill={color}
                  stroke={selected ? "#111827" : "white"}
                  strokeWidth={2}
                  draggable={selected}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelect(element.id, event.evt.shiftKey);
                  }}
                  onDragMove={(event) =>
                    onPointDrag(element.id, 0, { x: event.target.x(), y: event.target.y() })
                  }
                />
              );
            }

            return (
              <Group key={element.id}>
                <Line
                  points={element.points.flatMap((point) => [point.x, point.y])}
                  closed={element.type === "closed_polyline"}
                  fill={element.type === "closed_polyline" ? `${color}33` : undefined}
                  stroke={color}
                  strokeWidth={selected ? 4 : 3}
                  lineCap="round"
                  lineJoin="round"
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelect(element.id, event.evt.shiftKey);
                  }}
                />
                {selected
                  ? element.points.map((point, index) => (
                      <Circle
                        key={`${element.id}.${index}`}
                        x={point.x}
                        y={point.y}
                        radius={5}
                        fill="white"
                        stroke="#111827"
                        strokeWidth={2}
                        draggable
                        onDragMove={(event) =>
                          onPointDrag(element.id, index, {
                            x: event.target.x(),
                            y: event.target.y()
                          })
                        }
                      />
                    ))
                  : null}
              </Group>
            );
          })}
          {draftPoints.length > 0 ? (
            <>
              <Line
                points={draftPoints.flatMap((point) => [point.x, point.y])}
                stroke={tool === "scale" ? "#111827" : "#f59e0b"}
                strokeWidth={3}
                dash={[8, 6]}
              />
              {draftPoints.map((point, index) => (
                <Circle key={index} x={point.x} y={point.y} radius={4} fill="#f59e0b" />
              ))}
            </>
          ) : null}
        </Group>
      </Layer>
    </Stage>
  );
}
