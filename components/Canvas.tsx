"use client";

import { Circle, Group, Label, Layer, Line, Stage, Tag, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { ElementType, Point, TakeoffElement, ToolMode } from "@/types";
import { calculateValue, distance, newId } from "@/lib/utils";

const colors: Record<ElementType, string> = {
  point: "#2563eb",
  polyline: "#dc2626",
  closed_polyline: "#059669",
  scale: "#111827"
};

const BASE_STROKE_WIDTH = 3;
const SELECTED_STROKE_WIDTH = 4;
const POINT_RADIUS = 5;
const SELECTED_POINT_RADIUS = 7;
const HANDLE_RADIUS = 5;
const SELECTED_HANDLE_RADIUS = 6;
const LABEL_FONT_SIZE = 13;
const LABEL_PADDING = 8;
const DRAFT_DASH = [8, 6];
const COMPLETION_RADIUS = 12;

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
  onClearSelection,
  onPointDrag,
  onScaleLine,
  onEditScale
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
  onClearSelection: () => void;
  onPointDrag: (id: string, pointIndex: number, point: Point) => void;
  onScaleLine: (points: [Point, Point]) => void;
  onEditScale: (id: string) => void;
}) {
  const renderZoom = Math.max(zoom, 0.01);
  const inverseZoom = 1 / renderZoom;

  function getPointer(event: KonvaEventObject<MouseEvent>): Point | null {
    const stage = event.target.getStage();
    const position = stage?.getPointerPosition();
    if (!position) return null;
    return { x: position.x / renderZoom, y: position.y / renderZoom };
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

  function completeDraft(type: "polyline" | "closed_polyline") {
    createElement(type, draftPoints);
  }

  function handleDraftPointClick(event: KonvaEventObject<MouseEvent>, index: number) {
    event.cancelBubble = true;
    if (tool === "polyline" && index === draftPoints.length - 1 && draftPoints.length >= 2) {
      completeDraft("polyline");
    }
    if (tool === "closed_polyline" && index === 0 && draftPoints.length >= 3) {
      completeDraft("closed_polyline");
    }
  }

  function handleStageClick(event: KonvaEventObject<MouseEvent>) {
    if (event.evt.button !== 0) return;
    if (event.target !== event.target.getStage()) return;
    const point = getPointer(event);
    if (!point) return;

    if (tool === "select") {
      onClearSelection();
      return;
    }
    if (tool === "pan") return;
    if (!scaleFactor && tool !== "scale") return;
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

    if (
      tool === "polyline" &&
      draftPoints.length >= 2 &&
      distance(draftPoints[draftPoints.length - 1], point) < COMPLETION_RADIUS / renderZoom
    ) {
      completeDraft("polyline");
      return;
    }

    if (
      tool === "closed_polyline" &&
      draftPoints.length >= 3 &&
      distance(draftPoints[0], point) < COMPLETION_RADIUS / renderZoom
    ) {
      completeDraft("closed_polyline");
      return;
    }

    onDraftChange([...draftPoints, point]);
  }

  return (
    <Stage
      className="absolute left-0 top-0 z-20"
      width={width * renderZoom}
      height={height * renderZoom}
      style={{
        transform: `scale(${inverseZoom})`,
        transformOrigin: "top left"
      }}
      onClick={handleStageClick}
    >
      <Layer>
        <Group scaleX={renderZoom} scaleY={renderZoom}>
          {elements.map((element) => {
            const color = colors[element.type];
            const selected = selectedIds.includes(element.id);
            if (element.type === "scale") {
              const [start, end] = element.points;
              if (!start || !end) return null;

              const mid = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2
              };
              const label = `${element.value.toFixed(2)} m`;
              const labelWidth = label.length * 7 + LABEL_PADDING * 2;

              return (
                <Group key={element.id}>
                  <Line
                    points={[start.x, start.y, end.x, end.y]}
                    stroke={color}
                    strokeWidth={selected ? SELECTED_STROKE_WIDTH : BASE_STROKE_WIDTH}
                    strokeScaleEnabled={false}
                    lineCap="round"
                    onClick={(event) => {
                      event.cancelBubble = true;
                      onSelect(element.id, event.evt.ctrlKey);
                    }}
                  />
                  {[start, end].map((point, index) => (
                    <Circle
                      key={`${element.id}.${index}`}
                      x={point.x}
                      y={point.y}
                      radius={(selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS) * inverseZoom}
                      fill="white"
                      stroke={color}
                      strokeWidth={2}
                      strokeScaleEnabled={false}
                      draggable={selected}
                      onClick={(event) => {
                        event.cancelBubble = true;
                        onSelect(element.id, event.evt.ctrlKey);
                      }}
                      onDragMove={(event) =>
                        onPointDrag(element.id, index, {
                          x: event.target.x(),
                          y: event.target.y()
                        })
                      }
                    />
                  ))}
                  <Label
                    x={mid.x}
                    y={mid.y}
                    offsetX={labelWidth / 2}
                    offsetY={16}
                    scaleX={inverseZoom}
                    scaleY={inverseZoom}
                    onClick={(event) => {
                      event.cancelBubble = true;
                      onEditScale(element.id);
                    }}
                  >
                    <Tag
                      fill="white"
                      stroke={selected ? "#2563eb" : "#111827"}
                      strokeWidth={1.5}
                      strokeScaleEnabled={false}
                      cornerRadius={4}
                      shadowColor="black"
                      shadowBlur={5}
                      shadowOpacity={0.18}
                    />
                    <Text
                      text={label}
                      padding={LABEL_PADDING}
                      fontSize={LABEL_FONT_SIZE}
                      fontStyle="bold"
                      fill="#111827"
                    />
                  </Label>
                </Group>
              );
            }

            if (element.type === "point") {
              return (
                <Circle
                  key={element.id}
                  x={element.points[0].x}
                  y={element.points[0].y}
                  radius={(selected ? SELECTED_POINT_RADIUS : POINT_RADIUS) * inverseZoom}
                  fill={color}
                  stroke={selected ? "#111827" : "white"}
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  draggable={selected}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelect(element.id, event.evt.ctrlKey);
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
                  strokeWidth={selected ? SELECTED_STROKE_WIDTH : BASE_STROKE_WIDTH}
                  strokeScaleEnabled={false}
                  lineCap="round"
                  lineJoin="round"
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelect(element.id, event.evt.ctrlKey);
                  }}
                />
                {selected
                  ? element.points.map((point, index) => (
                      <Circle
                        key={`${element.id}.${index}`}
                        x={point.x}
                        y={point.y}
                        radius={HANDLE_RADIUS * inverseZoom}
                        fill="white"
                        stroke="#111827"
                        strokeWidth={2}
                        strokeScaleEnabled={false}
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
                strokeWidth={BASE_STROKE_WIDTH}
                strokeScaleEnabled={false}
                dash={DRAFT_DASH.map((value) => value * inverseZoom)}
              />
              {draftPoints.map((point, index) => (
                <Circle
                  key={index}
                  x={point.x}
                  y={point.y}
                  radius={4 * inverseZoom}
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth={1.5}
                  strokeScaleEnabled={false}
                  onClick={(event) => handleDraftPointClick(event, index)}
                />
              ))}
            </>
          ) : null}
        </Group>
      </Layer>
    </Stage>
  );
}
