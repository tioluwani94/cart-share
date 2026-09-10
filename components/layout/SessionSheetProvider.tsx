import { useAuth } from "@clerk/expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { PropsWithChildren } from "react";

/** Portalled sheets must never survive the account that presented them. */
export function SessionSheetProvider({ children }: PropsWithChildren) {
  const { userId } = useAuth();
  return (
    <BottomSheetModalProvider key={userId ?? "signed-out"}>
      {children}
    </BottomSheetModalProvider>
  );
}
