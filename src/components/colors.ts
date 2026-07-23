import type { BadgeVariant } from "@cloudflare/kumo";

import type { SegmentType } from "@/utils/edit";

/**
 * Command families share a colour across the canvas and the panel.
 *
 * The panel side uses kumo's badge tokens so the palette stays inside the
 * design system. The canvas cannot use CSS tokens — Konva needs literal colour
 * strings — so it mirrors the same hues one step brighter, which is what the
 * dark viewport needs to stay legible.
 */
export const SEGMENT_BADGE: Record<SegmentType, BadgeVariant> = {
  moveTo: "blue",
  lineTo: "green",
  horizontalLineTo: "green",
  verticalLineTo: "green",
  curveTo: "purple",
  smoothCurveTo: "purple",
  quadraticCurveTo: "orange",
  smoothQuadraticCurveTo: "orange",
  ellipticalArcTo: "red",
  closePath: "neutral",
};

export const SEGMENT_COLOR: Record<SegmentType, string> = {
  moveTo: "#60a5fa",
  lineTo: "#34d399",
  horizontalLineTo: "#34d399",
  verticalLineTo: "#34d399",
  curveTo: "#c084fc",
  smoothCurveTo: "#c084fc",
  quadraticCurveTo: "#fbbf24",
  smoothQuadraticCurveTo: "#fbbf24",
  ellipticalArcTo: "#f87171",
  closePath: "#a1a1aa",
};

/**
 * Canvas chrome, mirroring kumo's dark neutrals so the two halves agree.
 *
 * The grid is deliberately dim: it is a reference, not content, and it sits
 * behind every path the editor draws.
 */
export const GRID_ORIGIN = "#6b7280";
export const GRID_MAJOR = "#3f3f46";
export const GRID_MINOR = "#232327";

export const SELECTION = "#fafafa";
export const ANCHOR_FILL = "#171717";
export const CONTROL_FILL = "#262626";
export const GUIDE = "#525252";
