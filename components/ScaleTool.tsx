"use client";

import type { Point } from "@/types";
import { distance } from "@/lib/utils";

export function ScaleTool({
  points,
  defaultMeters,
  onApply,
  onCancel
}: {
  points: [Point, Point] | null;
  defaultMeters?: number;
  onApply: (meters: number) => void;
  onCancel: () => void;
}) {
  if (!points) return null;

  const pixelLength = distance(points[0], points[1]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <form
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const meters = Number(form.get("meters"));
          if (meters > 0) onApply(meters);
        }}
      >
        <h2 className="text-lg font-semibold text-ink">Set drawing scale</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          The reference line is {pixelLength.toFixed(0)} pixels. Enter its real-world length.
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-accent"
            min="0.01"
            name="meters"
            step="0.01"
            type="number"
            defaultValue={defaultMeters}
            autoFocus
            required
          />
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            defaultValue="meters"
            name="unit"
          >
            <option value="meters">meters</option>
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
