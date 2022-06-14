import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import {
  useSelectedInstance,
  useSelectedElement,
  useHoveredElement,
  useHoveredInstance,
} from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";
import { findInstanceById } from "~/shared/tree-utils";

const eventOptions = {
  passive: true,
};

export const useTrackHoveredElement = () => {
  const [rootInstance] = useRootInstance();
  const [, setHoveredElement] = useHoveredElement();

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      if (rootInstance === undefined) return;
      const element = event.target;
      if (element instanceof HTMLElement) {
        setHoveredElement(element);
      }
    };

    const handleMouseOut = () => {
      if (rootInstance === undefined) return;
      setHoveredElement(undefined);
    };

    window.addEventListener("mouseover", handleMouseOver, eventOptions);
    window.addEventListener("mouseout", handleMouseOut, eventOptions);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, setHoveredElement]);
};
