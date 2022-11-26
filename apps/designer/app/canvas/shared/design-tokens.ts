import type { DesignToken } from "@webstudio-is/project";
import { useEffect, useRef } from "react";
import { useDesignTokens } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

export const useInitializeDesignTokens = (designTokens: Array<DesignToken>) => {
  const [, setDesignTokens] = useDesignTokens();
  const ref = useRef(false);
  if (ref.current === false) {
    ref.current = true;
    setDesignTokens(designTokens);
  }
};

export const usePublishDesignTokens = () => {
  const [designTokens] = useDesignTokens();
  useEffect(() => {
    publish({ type: "loadDesignTokens", payload: designTokens });
  }, [designTokens]);
};
