import noSpendingArtwork from "@/assets/empty-states/no-spending.png";
import { EmptyStateCard } from "@/components/ui";

export const AnalyticsEmptyState = () => {
  return (
    <EmptyStateCard
      title="Your spending starts here"
      description="Finish a shop and save its receipt total. This page will show what you spent, what remains, and your recent trips."
      artworkSource={noSpendingArtwork}
      className="mx-6 mt-8"
    />
  );
};
