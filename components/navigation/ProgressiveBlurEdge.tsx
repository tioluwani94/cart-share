import { BlurView } from "expo-blur";
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

const FEATHER_LAYER_FRACTIONS = [1, 0.82, 0.64, 0.46, 0.28] as const;
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
    FEATHER_TOTAL_INTENSITY / FEATHER_LAYER_FRACTIONS.length;

  return (
    <View
      pointerEvents={children ? "box-none" : "none"}
      style={[styles.container, style]}
    >
      {includeMaterial ? (
        <View pointerEvents="none" style={styles.material}>
          {usesLiveBlur ? (
            <BlurView
              tint="systemUltraThinMaterialLight"
              intensity={materialIntensity}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {!usesLiveBlur ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: themeColors.surface },
              ]}
            />
          ) : null}
        </View>
      ) : null}

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
          {FEATHER_LAYER_FRACTIONS.map((fraction) => (
            <View
              key={`${fadeEdge}-${fraction}`}
              style={[
                styles.featherLayer,
                { height: resolvedFalloff * fraction },
                fadeEdge === "bottom" ? { top: 0 } : { bottom: 0 },
              ]}
            >
              <BlurView
                intensity={layerIntensity}
                tint="systemUltraThinMaterialLight"
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
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
