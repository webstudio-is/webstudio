import type { DesignToken } from "@webstudio-is/design-tokens";
import { useEffect, useState } from "react";
import { useDesignTokens } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

export const useInitializeDesignTokens = (designTokens: Array<DesignToken>) => {
  const [, setDesignTokens] = useDesignTokens();
  // Trick to set it only once.
  useState(() => setDesignTokens(designTokens));
};

export const usePublishDesignTokens = () => {
  const [designTokens] = useDesignTokens();
  useEffect(() => {
    publish({ type: "loadDesignTokens", payload: designTokens });
  }, [designTokens]);
};
