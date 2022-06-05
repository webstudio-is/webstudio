import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type Instance } from "@webstudio-is/sdk";
import { getBoundingClientRect } from "~/shared/dom-utils";
import { primitives } from "~/shared/component";
import { useHoveredElement, useSelectedElement } from "./nano-values";
import { styled, darkTheme } from "~/shared/design-system";
import { useOnRender } from "./use-on-render";

const useElement = (currentInstance: Instance) => {
  const [selectedElement] = useSelectedElement();
  const [hoveredElement] = useHoveredElement();

  return useMemo(() => {
    if (selectedElement?.id === currentInstance.id) return selectedElement;
    if (hoveredElement?.id === currentInstance.id) return hoveredElement;
  }, [currentInstance, hoveredElement, selectedElement]);
};

const useStyle = (element?: HTMLElement) => {
  const [rerenderFlag, forceRender] = useState(false);

  // We need to recalculate the client rect the the element if any
  // style on the page changes because we have no idea how any layout changes
  // can impact the position or size of the outline.
  const handleUpdate = useCallback(() => {
    getBoundingClientRect.cache.delete(element);
    forceRender(!rerenderFlag);
  }, [element, rerenderFlag]);

  useOnRender(handleUpdate);

  return useMemo(() => {
    if (element === undefined) return;

    const rect = getBoundingClientRect(element);

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, [element, rerenderFlag]);
};

const Outline = styled("div", {
  position: "absolute",
  pointerEvents: "none",
  outline: "2px solid $blue9",
  outlineOffset: -2,
  // This can be rewriten using normal node once needed
  "&::before": {
    display: "flex",
    content: "attr(data-label)",
    padding: "0 $1",
    marginTop: "-$4",
    height: "$4",
    position: "absolute",
    backgroundColor: "$blue9",
    color: "$hiContrast",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "$2",
    fontFamily: "$sans",
    lineHeight: 1,
    minWidth: "$6",
  },
});

export const useOutline = (currentInstance: Instance) => {
  const element = useElement(currentInstance);
  const style = useStyle(element);
  const component = element?.dataset?.component;

  if (component === undefined || style === undefined) {
    return null;
  }

  const primitive = primitives[component as Instance["component"]];

  return createPortal(
    <Outline
      data-label={primitive.label}
      style={style}
      className={darkTheme}
    />,
    document.body
  );
};
