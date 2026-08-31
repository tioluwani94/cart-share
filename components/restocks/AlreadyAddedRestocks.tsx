import { Text, View } from "react-native";

export function AlreadyAddedRestocks({
  candidates,
}: {
  candidates: readonly {
    householdProductId: string;
    displayName: string;
  }[];
}) {
  if (candidates.length === 0) return null;

  const visibleCandidates = candidates.slice(0, 3);

  return (
    <View className="mb-3 rounded-2xl border border-teal/20 bg-teal-soft p-4">
      <Text className="font-semibold text-ink">Already in Next shop</Text>
      <View className="mt-2 gap-2">
        {visibleCandidates.map((candidate) => (
          <View
            key={candidate.householdProductId}
            className="min-h-11 flex-row items-center justify-between"
            accessibilityLabel={`${candidate.displayName} is already in Next shop`}
          >
            <Text
              className="flex-1 pr-3 text-ink-secondary"
              numberOfLines={2}
            >
              {candidate.displayName}
            </Text>
            <View className="rounded-full bg-teal/10 px-3 py-1.5">
              <Text className="text-xs font-semibold text-teal">Added</Text>
            </View>
          </View>
        ))}
      </View>
      {candidates.length > visibleCandidates.length && (
        <Text className="mt-2 text-sm text-ink-secondary">
          And {candidates.length - visibleCandidates.length} more
        </Text>
      )}
    </View>
  );
}
