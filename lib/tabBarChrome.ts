export const TAB_BAR_EXPANDED_HEIGHT = 58;
export const TAB_BAR_COMPACT_HEIGHT = 46;
export const TAB_BAR_OUTER_MARGIN = 24;
export const TAB_BAR_COMPACT_EXTRA_INSET = 34;
export const TAB_BAR_TOP_EXPANSION_OFFSET = 24;
export const TAB_BAR_DIRECTION_THRESHOLD = 3;
export const TAB_BAR_MINIMUM_TOUCH_HEIGHT = 44;
export const TAB_BAR_COMPACT_ICON_TRANSLATE_Y = 8;
export const TAB_BAR_SHOP_COMPOSER_HEIGHT = 72;

export type TabBarMode = 0 | 1;

interface TabBarScrollState {
  currentMode: TabBarMode;
  maxOffsetY: number;
  offsetY: number;
  previousOffsetY: number;
}

interface TabBarGeometry {
  footprintWidth: number;
  visualWidth: number;
  visualHeight: number;
  minimumTouchHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function getNextTabBarMode({
  currentMode,
  maxOffsetY,
  offsetY,
  previousOffsetY,
}: TabBarScrollState): TabBarMode {
  "worklet";
  const safeMaxOffsetY = Math.max(0, maxOffsetY);
  const currentOffsetY = clamp(offsetY, 0, safeMaxOffsetY);
  const priorOffsetY = clamp(previousOffsetY, 0, safeMaxOffsetY);

  if (currentOffsetY <= TAB_BAR_TOP_EXPANSION_OFFSET) return 0;

  const delta = currentOffsetY - priorOffsetY;
  if (delta > TAB_BAR_DIRECTION_THRESHOLD) return 1;
  if (delta < -TAB_BAR_DIRECTION_THRESHOLD) return 0;
  return currentMode;
}

export function getTabBarIconTranslateY(compactProgress: number): number {
  "worklet";
  return clamp(compactProgress, 0, 1) * TAB_BAR_COMPACT_ICON_TRANSLATE_Y;
}

export function getTabBarDockHeight(
  tabBarHeight: number,
  accessoryHeight = 0,
): number {
  return Math.max(0, tabBarHeight) + Math.max(0, accessoryHeight);
}

export function getTabBarGeometry(
  viewportWidth: number,
  compactProgress: number,
): TabBarGeometry {
  "worklet";
  const progress = clamp(compactProgress, 0, 1);
  const footprintWidth = Math.max(0, viewportWidth);
  const expandedWidth = Math.max(0, footprintWidth - TAB_BAR_OUTER_MARGIN * 2);
  const compactWidth = Math.max(
    0,
    expandedWidth - TAB_BAR_COMPACT_EXTRA_INSET * 2,
  );

  return {
    footprintWidth,
    visualWidth: expandedWidth + (compactWidth - expandedWidth) * progress,
    visualHeight:
      TAB_BAR_EXPANDED_HEIGHT +
      (TAB_BAR_COMPACT_HEIGHT - TAB_BAR_EXPANDED_HEIGHT) * progress,
    minimumTouchHeight: TAB_BAR_MINIMUM_TOUCH_HEIGHT,
  };
}

/** One geometry source for the four icon centres and their selection pill. */
export function getTabBarSegmentGeometry(
  viewportWidth: number,
  compactProgress: number,
  index: number,
  count = 4,
) {
  "worklet";
  const geometry = getTabBarGeometry(viewportWidth, compactProgress);
  const left = (viewportWidth - geometry.visualWidth) / 2 + 4;
  const width = Math.max(0, geometry.visualWidth - 8) / count;
  return {
    left: left + index * width,
    width,
    center: left + (index + 0.5) * width,
    top: (TAB_BAR_EXPANDED_HEIGHT - geometry.visualHeight) / 2 + 4,
    height: geometry.visualHeight - 8,
  };
}
