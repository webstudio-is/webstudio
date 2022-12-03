import { useSubscribe } from "~/shared/pubsub";
import { useDesignTokens } from "~/shared/nano-states";
import type { DesignToken } from "@webstudio-is/design-tokens";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    loadDesignTokens: Array<DesignToken>;
  }
}

export const useSubscribeDesignTokens = () => {
  const [, setDesignTokens] = useDesignTokens();
  useSubscribe("loadDesignTokens", setDesignTokens);
};
