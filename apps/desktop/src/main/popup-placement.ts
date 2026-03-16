import type { AppSettings, HostBounds } from "@latex-suite/contracts";

export interface PopupBounds extends HostBounds {}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Centers the popup over the captured host bounds while keeping it inside the
 * current display work area.
 */
export function computePopupBounds(
  popupSettings: AppSettings["popup"],
  sourceBounds: HostBounds,
  workArea: HostBounds
): PopupBounds {
  const width = popupSettings.width;
  const height = Math.max(popupSettings.minHeight + 140, 320);
  const inset = 12;

  return {
    width,
    height,
    x: clamp(
      Math.round(sourceBounds.x + (sourceBounds.width - width) / 2),
      workArea.x + inset,
      workArea.x + workArea.width - width - inset
    ),
    y: clamp(
      Math.round(sourceBounds.y + (sourceBounds.height - height) / 2),
      workArea.y + inset,
      workArea.y + workArea.height - height - inset
    )
  };
}
