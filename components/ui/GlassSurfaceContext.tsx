import { createContext, useContext } from "react";

const GlassSurfaceContext = createContext(false);

export const GlassSurfaceProvider = GlassSurfaceContext.Provider;

export function useIsOnGlassSurface() {
  return useContext(GlassSurfaceContext);
}
