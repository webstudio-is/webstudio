import { useEffect } from "react";
import { subscribeSelected } from "./instance-selected";
import { useEffectQueue } from "~/shared/hook-utils/use-effect-queue";

export const useSelectedInstance = () => {
  const execTaskInEffect = useEffectQueue();

  useEffect(() => {
    return subscribeSelected(execTaskInEffect);
  }, [execTaskInEffect]);
};
