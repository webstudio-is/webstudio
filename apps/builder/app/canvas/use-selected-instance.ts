import { useEffect } from "react";
import { subscribeSelected } from "./instance-selected";
import { useDebounceEffect } from "~/shared/hook-utils/use-debounce-effect";

export const useSelectedInstance = () => {
  const debounceEffect = useDebounceEffect();

  useEffect(() => {
    return subscribeSelected(debounceEffect);
  }, [debounceEffect]);
};
