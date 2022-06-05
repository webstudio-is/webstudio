import { useMemo, type MouseEvent } from "react";
import { useHoveredElement } from "~/canvas/shared/nano-values";

export const useSetHoveredInstance = () => {
  const [, setHoveredElement] = useHoveredElement();

  return useMemo(
    () => ({
      onMouseOver(event: MouseEvent<HTMLElement>) {
        if (event.target instanceof HTMLElement) {
          setHoveredElement(event.target);
        }
      },
      onMouseOut() {
        setHoveredElement(undefined);
      },
    }),
    [setHoveredElement]
  );
};
