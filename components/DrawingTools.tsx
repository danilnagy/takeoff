"use client";

import { AreaChart, CircleDot, Hand, MousePointer2, Ruler, Route } from "lucide-react";
import type { ToolMode } from "@/types";
import { cn } from "@/lib/utils";

const tools: Array<{ id: ToolMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan", icon: Hand },
  { id: "scale", label: "Set Scale", icon: Ruler },
  { id: "point", label: "Count", icon: CircleDot },
  { id: "polyline", label: "Length", icon: Route },
  { id: "closed_polyline", label: "Area", icon: AreaChart }
];

export function DrawingTools({
  tool,
  scaleSet,
  onToolChange
}: {
  tool: ToolMode;
  scaleSet: boolean;
  onToolChange: (tool: ToolMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      {tools.map((item) => {
        const Icon = item.icon;
        const disabled =
          !scaleSet && ["point", "polyline", "closed_polyline"].includes(item.id);
        return (
          <button
            key={item.id}
            title={item.label}
            disabled={disabled}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm font-medium text-gray-600 hover:bg-gray-100",
              disabled && "cursor-not-allowed opacity-40 hover:bg-white",
              tool === item.id && "bg-ink text-white hover:bg-ink"
            )}
            onClick={() => onToolChange(item.id)}
          >
            <Icon className="h-4 w-4" />
            <span className="ml-2 hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
