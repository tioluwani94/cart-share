import { useCallback, useRef, type RefObject } from "react";

interface ScrollTarget {
  scrollToOffset: (options: {
    offset: number;
    animated: boolean;
    skipFirstItemOffset: boolean;
  }) => void;
}

/** Reset user-selected filters, without jumping on background product updates. */
export function usePantryScrollReset(listRef: RefObject<ScrollTarget | null>) {
  const pending = useRef(false);
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({
      offset: 0,
      animated: false,
      skipFirstItemOffset: true,
    });
  }, [listRef]);
  const resetScroll = useCallback(() => {
    pending.current = true;
    // Also handles tapping the already-selected filter, which won't re-render.
    scrollToTop();
  }, [scrollToTop]);
  const onCommitLayoutEffect = useCallback(() => {
    if (!pending.current || !listRef.current) return;
    pending.current = false;
    scrollToTop();
  }, [listRef, scrollToTop]);
  return { resetScroll, onCommitLayoutEffect };
}
