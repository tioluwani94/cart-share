export const WELCOME_TIMELINE = {
  crossfadeStartMs: 567,
  crossfadeEndMs: 800,
  assetStartsMs: [1167, 1233, 1300, 1367, 1467],
  assetEndsMs: [1410, 1490, 1540, 1620, 1733],
  springEndMs: 1733,
  finalSwapMs: 1733,
} as const;

export function isWelcomeInteractive(elapsedMs: number): boolean {
  return elapsedMs >= WELCOME_TIMELINE.crossfadeEndMs;
}

export function getWelcomePresentation({
  autoplay,
  reduceMotion,
  elapsedMs,
}: {
  autoplay: boolean;
  reduceMotion: boolean;
  elapsedMs: number;
}) {
  const bypassAnimation = !autoplay || reduceMotion;
  const showFinalState =
    bypassAnimation || elapsedMs >= WELCOME_TIMELINE.finalSwapMs;

  return {
    showFinalState,
    actionsEnabled: bypassAnimation || isWelcomeInteractive(elapsedMs),
  };
}
