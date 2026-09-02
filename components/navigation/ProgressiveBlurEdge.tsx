import { BlurView, type BlurTint } from "expo-blur";
import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { themeColors } from "@/lib/theme";
import { useReduceTransparency } from "@/components/ui/useReduceTransparency";

const FEATHER_LAYER_INDICES = [0, 1, 2, 3, 4] as const;
const FEATHER_TOTAL_INTENSITY = 36;

interface ProgressiveBlurEdgeProps {
  /** The side where material should feather into scrolling content. */
  fadeEdge: "top" | "bottom";
  /** Visible distance the blur extends outside the chrome. */
  spill?: number;
  /** Full transition distance, mostly overlapping the chrome itself. */
  falloff?: number;
  /** @deprecated Use spill and falloff separately. */
  featherSize?: number;
  includeMaterial?: boolean;
  /** Strength of the stable material underneath the progressive edge. */
  materialIntensity?: number;
  /** Native material tint used by both the stable layer and feather. */
  tint?: BlurTint;
  /** Opaque fallback used off iOS or when Reduce Transparency is enabled. */
  fallbackColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Public-API progressive chrome blur. A small, bounded set of low-intensity
 * layers creates the falloff without a white color wash. Spill and falloff are
 * separate so the blur can transition behind chrome without increasing the
 * content inset.
 */
export function ProgressiveBlurEdge({
  fadeEdge,
  spill,
  falloff,
  featherSize,
  includeMaterial = true,
  materialIntensity = 30,
  tint = "systemUltraThinMaterialLight",
  fallbackColor = themeColors.surface,
  style,
  children,
}: ProgressiveBlurEdgeProps) {
  const reduceTransparency = useReduceTransparency();
  const usesLiveBlur = Platform.OS === "ios" && !reduceTransparency;
  const resolvedSpill = Math.max(0, spill ?? featherSize ?? 16);
  const resolvedFalloff = Math.max(
    resolvedSpill,
    falloff ?? featherSize ?? 64,
  );
  const layerIntensity =
    FEATHER_TOTAL_INTENSITY / FEATHER_LAYER_INDICES.length;
  const overlapDistance = resolvedFalloff - resolvedSpill;

  return (
    <View
      pointerEvents={children ? "box-none" : "none"}
      style={[styles.container, style]}
    >
      {usesLiveBlur ? (
        <View
          pointerEvents="none"
          style={[
            styles.feather,
            fadeEdge === "bottom"
              ? { bottom: -resolvedSpill }
              : { top: -resolvedSpill },
            { height: resolvedFalloff },
          ]}
        >
          {FEATHER_LAYER_INDICES.map((index) => {
            const progress = index / FEATHER_LAYER_INDICES.length;
            const outsideInset = resolvedSpill * progress;
            const insideInset = overlapDistance * progress;

            return (
              <View
                key={`${fadeEdge}-${index}`}
                testID={`progressive-blur-feather-layer-${index}`}
                style={[
                  styles.featherLayer,
                  fadeEdge === "bottom"
                    ? { top: insideInset, bottom: outsideInset }
                    : { top: outsideInset, bottom: insideInset },
                ]}
              >
                <BlurView
                  intensity={layerIntensity}
                  tint={tint}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {includeMaterial ? (
        <View pointerEvents="none" style={styles.material}>
          {usesLiveBlur ? (
            <BlurView
              tint={tint}
              intensity={materialIntensity}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {!usesLiveBlur ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: fallbackColor },
              ]}
            />
          ) : null}
        </View>
      ) : null}

      {reduceTransparency && includeMaterial ? (
        <View
          pointerEvents="none"
          style={[
            styles.separator,
            fadeEdge === "bottom" ? { bottom: 0 } : { top: 0 },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
  },
  material: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  feather: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  featherLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  separator: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.separator,
  },
});
