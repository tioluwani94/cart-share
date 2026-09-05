import { type Href, Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyTrackedProductsRedirect() {
  const { focus, source } = useLocalSearchParams<{
    focus?: string;
    source?: string;
  }>();
  const query = [
    focus ? `focus=${encodeURIComponent(focus)}` : null,
    source ? `source=${encodeURIComponent(source)}` : null,
  ]
    .filter(Boolean)
    .join("&");
  const destination = `/(tabs)/pantry${query ? `?${query}` : ""}` as Href;

  return <Redirect href={destination} />;
}
