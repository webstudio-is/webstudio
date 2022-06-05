import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type Instance } from "@webstudio-is/sdk";
import { getBoundingClientRect } from "~/shared/dom-utils";
import { primitives } from "~/shared/component";
import { useHoveredElement, useSelectedElement } from "./nano-values";
import { styled, darkTheme } from "~/shared/design-system";
import { useOnRender } from "./use-on-render";
import { useWindowResize } from "~/shared/dom-hooks";

const useElement = (
  currentInstance: Instance
): { element: HTMLElement; type: "selected" | "hovered" } | undefined => {
  const [selectedElement] = useSelectedElement();
  const [hoveredElement] = useHoveredElement();

  return useMemo(() => {
    if (selectedElement?.id === currentInstance.id) {
      return { element: selectedElement, type: "selected" };
    }
    if (hoveredElement?.id === currentInstance.id) {
      return { element: hoveredElement, type: "hovered" };
    }
  }, [currentInstance, hoveredElement, selectedElement]);
};

const useStyle = (element?: HTMLElement) => {
  const [rerenderFlag, forceRender] = useState(false);

  // We need to recalculate the client rect the the element if any
  // style on the page changes because we have no idea how any layout changes
  // can impact the position or size of the outline.
  const handleUpdate = useCallback(() => {
    if (element === undefined) return;
    getBoundingClientRect.cache.delete(element);
    forceRender(!rerenderFlag);
  }, [element, rerenderFlag]);

  useOnRender(handleUpdate);
  useWindowResize(handleUpdate);

  return useMemo(
    () => {
      if (element === undefined) return;

      const rect = getBoundingClientRect(element);

      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element, rerenderFlag]
  );
};

/**
 * Detects if there is no space on top and for the label and tells to show it inside.
 */
const useLabelPosition = () => {
  const [position, setPosition] = useState<"outside" | "inside">("outside");

  const ref = useCallback((element: HTMLElement | null) => {
    if (element === null) return;
    const rect = element.getBoundingClientRect();
    const nextPosition = rect.height > rect.top ? "inside" : "outside";
    setPosition(nextPosition);
  }, []);

  return { ref, position };
};

const Outline = styled(
  "div",
  {
    position: "absolute",
    pointerEvents: "none",
    outline: "2px solid $blue9",
    outlineOffset: -2,
  },
  {
    variants: {
      state: {
        selected: {
          zIndex: "$4",
        },
        hovered: {
          zIndex: "$3",
        },
      },
    },
  }
);

const Label = styled(
  "div",
  {
    position: "absolute",
    display: "flex",
    padding: "0 $1",
    height: "$4",
    color: "$hiContrast",
    alignItems: "center",
    justifyContent: "center",
    gap: "$1",
    fontSize: "$2",
    fontFamily: "$sans",
    lineHeight: 1,
    minWidth: "$6",
  },
  {
    variants: {
      state: {
        selected: {
          backgroundColor: "$blue9",
        },
        hovered: {
          color: "$blue9",
        },
      },
      position: {
        outside: {
          marginTop: "-$4",
        },
        inside: {},
      },
    },
  }
);

export const useOutline = (currentInstance: Instance) => {
  const { element, type } = useElement(currentInstance) ?? {};
  const style = useStyle(element);
  const { ref: labelRefCallback, position } = useLabelPosition();

  const component = element?.dataset?.component;

  if (component === undefined || style === undefined) {
    return null;
  }

  const primitive = primitives[component as Instance["component"]];
  const { Icon } = primitive;

  return createPortal(
    <Outline state={type} style={style} className={darkTheme}>
      <Label state={type} position={position} ref={labelRefCallback}>
        <Icon width="1em" height="1em" />
        {primitive.label}
      </Label>
    </Outline>,
    document.body
  );
};
