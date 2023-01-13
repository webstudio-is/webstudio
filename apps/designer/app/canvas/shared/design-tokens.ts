import type { DesignToken } from "@webstudio-is/design-tokens";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { useDesignTokens } from "~/shared/nano-states";

export const useInitializeDesignTokens = (designTokens: Array<DesignToken>) => {
  const [, setDesignTokens] = useDesignTokens();
  useSyncInitializeOnce(() => {
    setDesignTokens(designTokens);
  });
};
