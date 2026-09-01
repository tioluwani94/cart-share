import emptyBasketArtwork from "@/assets/empty-states/empty-basket.png";
import { EmptyStateCard } from "@/components/ui";

interface EmptyListStateProps {
  onCreateList: () => void;
}

/**
 * First-list state kept as a thin domain wrapper around the shared treatment.
 */
export function EmptyListState({ onCreateList }: EmptyListStateProps) {
  return (
    <EmptyStateCard
      title="Your lists are feeling lonely"
      description="Create your first shopping list and invite your household to plan together."
      artworkSource={emptyBasketArtwork}
      actionLabel="Create your first list"
      actionAccessibilityLabel="Create your first shopping list"
      onAction={onCreateList}
      className="mx-6"
    />
  );
}
