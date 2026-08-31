export function partitionRestockCandidates<
  ProductId,
  Candidate extends {
    householdProductId: ProductId;
    isAdded: boolean;
  },
>(
  candidates: readonly Candidate[],
  hiddenProductIds: ReadonlySet<ProductId>,
): {
  actionableCandidates: Candidate[];
  alreadyAddedCandidates: Candidate[];
} {
  const visibleCandidates = candidates.filter(
    (candidate) => !hiddenProductIds.has(candidate.householdProductId),
  );

  return {
    actionableCandidates: visibleCandidates.filter(
      (candidate) => !candidate.isAdded,
    ),
    alreadyAddedCandidates: visibleCandidates.filter(
      (candidate) => candidate.isAdded,
    ),
  };
}
