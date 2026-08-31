import React, { useCallback, useEffect, useRef } from "react";
import {
  GlassBottomSheet,
  type GlassBottomSheetProps,
  type GlassBottomSheetRef,
} from "./GlassBottomSheet";

export interface ControlledGlassBottomSheetProps
  extends Omit<GlassBottomSheetProps, "onDismiss"> {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bridges declarative popup state to Gorhom's imperative modal API.
 *
 * Keeping this synchronization in one place lets declarative `visible`
 * callers present a sheet without racing its mount.
 */
export function ControlledGlassBottomSheet({
  visible,
  onClose,
  children,
  ...props
}: ControlledGlassBottomSheetProps) {
  const sheetRef = useRef<GlassBottomSheetRef>(null);
  const isPresentedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        sheetRef.current?.present();
        isPresentedRef.current = true;
      });

      return () => cancelAnimationFrame(frame);
    }

    if (isPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    onClose();
  }, [onClose]);

  return (
    <GlassBottomSheet ref={sheetRef} onDismiss={handleDismiss} {...props}>
      {children}
    </GlassBottomSheet>
  );
}
