export const overlayViews = ['scoreboard', 'up-next', 'champion'] as const;
export type OverlayViewName = (typeof overlayViews)[number];

export function isOverlayView(view: string): view is OverlayViewName {
  return (overlayViews as readonly string[]).includes(view);
}
