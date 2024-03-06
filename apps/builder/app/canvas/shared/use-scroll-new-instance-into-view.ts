import { useEffect, useRef } from "react";
import { useEffectQueue } from "~/shared/hook-utils/use-effect-queue";
import { subscribeScrollNewInstanceIntoView } from "./scroll-new-instance-into-view";
import type { Instances } from "@webstudio-is/sdk";

export const useScrollNewInstanceIntoView = () => {
  const execTaskInEffect = useEffectQueue();
  const ref = useRef<Instances>();
  useEffect(() => {
    return subscribeScrollNewInstanceIntoView(execTaskInEffect, ref);
  }, [execTaskInEffect]);
};
