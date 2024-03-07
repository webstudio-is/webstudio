import { useEffect, useRef } from "react";
import { useDebounceEffect } from "~/shared/hook-utils/use-debounce-effect";
import { subscribeScrollNewInstanceIntoView } from "./scroll-new-instance-into-view";
import type { Instances } from "@webstudio-is/sdk";

export const useScrollNewInstanceIntoView = () => {
  const debounceEffect = useDebounceEffect();
  const ref = useRef<Instances>();
  useEffect(() => {
    return subscribeScrollNewInstanceIntoView(debounceEffect, ref);
  }, [debounceEffect]);
};
