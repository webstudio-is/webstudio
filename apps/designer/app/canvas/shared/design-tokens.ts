import type { DesignToken } from "@webstudio-is/design-tokens";
import { useEffect } from "react";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { useDesignTokens } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

export const useInitializeDesignTokens = (designTokens: Array<DesignToken>) => {
  const [, setDesignTokens] = useDesignTokens();
  useSyncInitializeOnce(() => {
    setDesignTokens(designTokens);
  });
};

export const usePublishDesignTokens = () => {
  const [designTokens] = useDesignTokens();
  useEffect(() => {
    publish({ type: "loadDesignTokens", payload: designTokens });
  }, [designTokens]);
};
