import { cn } from "@/lib/cn";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { pantryArtwork } from "@/lib/pantryArtwork";
import {
  resolvePantryArtwork,
  type PantryProduct,
  type PantryShelf as Shelf,
} from "@/lib/pantryCatalogue";
import { themeColors } from "@/lib/theme";
import { getLearningProductCopy } from "@/lib/trackedProducts";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import { ChevronRight } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  cubicBezier,
  useReducedMotion,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PantryProductArtwork({
  name,
  paused = false,
}: {
  name: string;
  paused?: boolean;
}) {
  const artwork = pantryArtwork[resolvePantryArtwork(name)];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[162px] w-[140px] items-center overflow-hidden rounded-t-[70px] bg-warm-gray-100"
    >
      <Image
        source={artwork.source}
        contentFit="contain"
        transition={0}
        style={{
          position: "absolute",
          width: artwork.size,
          height: artwork.size,
          bottom: artwork.bottom,
          opacity: paused ? 0.65 : 1,
        }}
      />
    </View>
  );
}

export function PantryProductTile<T extends PantryProduct>({
  product,
  width,
  onPress,
}: {
  product: T;
  width: number;
  onPress: (product: T) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const learning =
    product.status === "learning"
      ? getLearningProductCopy(product.purchaseObservationCount)
      : null;
  const status =
    learning?.badge ??
    (product.status === "paused"
      ? "Paused"
      : `Every ${product.cadenceDays} days`);
  return (
    <AnimatedPressable
      onPress={() => onPress(product)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      style={{
        width,
        transform: [{ scale: reduced || !pressed ? 1 : 0.97 }],
        opacity: reduced && pressed ? 0.75 : 1,
        transitionProperty: reduced ? ["opacity"] : ["transform"],
        transitionDuration: "120ms",
        transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
      }}
      accessibilityRole="button"
      accessibilityLabel={`${product.displayName}, ${status}${learning ? `, ${learning.detail}` : ""}`}
      accessibilityHint="Opens product details, shopping and reminder options"
    >
      <View className="items-center">
        <PantryProductArtwork
          name={product.displayName}
          paused={product.status === "paused"}
        />
        <View
          accessible={false}
          className="h-1.5 w-[152px] rounded-sm border-t border-warm-gray-200 bg-warm-gray-300"
        />
        <Text
          className="mt-3 px-1 text-center font-heading text-base leading-6 text-ink"
          numberOfLines={2}
        >
          {product.displayName}
        </Text>
        <View
          className={cn(
            "mt-1 min-h-6 items-center justify-center rounded-full px-2 py-1",
            learning
              ? "bg-yellow/15"
              : product.status === "paused"
                ? "bg-warm-gray-100"
                : "",
          )}
        >
          <Text
            className={cn(
              "text-center text-xs leading-4",
              learning ? "text-yellow-800" : "text-ink-secondary",
            )}
          >
            {status}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function PantryShelf<T extends PantryProduct>({
  shelf,
  onPress,
}: {
  shelf: Shelf<T>;
  onPress: (product: T) => void;
}) {
  const listRef = useRef<FlashListRef<T>>(null);
  const offset = useRef(0);
  const reduced = useReducedMotion();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const tileWidth = Math.max(152, Math.min(screenWidth - 48, 152 * fontScale));
  const stride = tileWidth + 8;
  // Dynamic Type grows the text region, not the product image or shelf geometry.
  const height = 190 + 76 * Math.max(1, fontScale);
  const canPage = shelf.products.length * stride > screenWidth - 48;
  return (
    <View className="mb-6">
      <View className="mb-2 min-h-12 flex-row items-center justify-between px-6">
        <Text
          accessibilityRole="header"
          className="flex-1 font-heading text-2xl leading-8 text-ink"
        >
          {shelf.title}
        </Text>
        {canPage && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See more ${shelf.title} products`}
            className="ml-2 h-12 w-12 items-center justify-center rounded-full active:bg-warm-gray-100"
            onPress={() => {
              const max = Math.max(
                0,
                shelf.products.length * stride + 40 - screenWidth,
              );
              const next =
                offset.current >= max - 4
                  ? 0
                  : Math.min(max, offset.current + stride);
              listRef.current?.scrollToOffset({
                offset: next,
                animated: !reduced,
              });
            }}
          >
            <ChevronRight size={22} color={themeColors.secondaryInk} />
          </Pressable>
        )}
      </View>
      <View style={{ height }}>
        <FlashList
          ref={listRef}
          horizontal
          data={shelf.products}
          keyExtractor={(item) => item._id}
          {...keyboardDismissScrollProps}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          onScroll={(event) => {
            offset.current = event.nativeEvent.contentOffset.x;
          }}
          ItemSeparatorComponent={() => <View className="w-2" />}
          renderItem={({ item }) => (
            <PantryProductTile
              product={item}
              width={tileWidth}
              onPress={onPress}
            />
          )}
        />
      </View>
    </View>
  );
}
