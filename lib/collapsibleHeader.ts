export const HEADER_COLLAPSE_START = 8;
export const HEADER_COLLAPSE_END = 56;
export const HEADER_BLUR_END = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getHeaderCollapseProgress(offsetY: number): number {
  const range = HEADER_COLLAPSE_END - HEADER_COLLAPSE_START;
  if (range <= 0) return 1;
  return clamp((offsetY - HEADER_COLLAPSE_START) / range, 0, 1);
}

export function getScrollChromeOpacity(offsetY: number): number {
  if (HEADER_BLUR_END <= 0) return 1;
  return clamp(offsetY / HEADER_BLUR_END, 0, 1);
}
