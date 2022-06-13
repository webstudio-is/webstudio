import { useCallback, useMemo, useState } from "react";
import { styled } from "~/shared/design-system";
import { useSelectedInstanceRect } from "~/shared/nano-states";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";
import { primitives } from "~/shared/component";

const useStyle = () => {
  const [rect] = useSelectedInstanceRect();
  return useMemo(() => {
    if (rect === undefined) return;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, [rect]);
};

type LabelPosition = "top" | "inside" | "bottom";
type LabelRefCallback = (element: HTMLElement | null) => void;

/**
 * Detects if there is no space on top and for the label and tells to show it inside.
 * - if there is enough space for the label on top of the instance - top
 * - else if instance height is more than 250px - bottom
 * - else inside-top - last resort because it covers a bit of the instance content
 */
const useLabelPosition = (): [LabelRefCallback, LabelPosition] => {
  const [position, setPosition] = useState<LabelPosition>("top");
  const [instanceRect] = useSelectedInstanceRect();

  const ref = useCallback(
    (element) => {
      if (element === null || instanceRect === undefined) return;
      const labelRect = element.getBoundingClientRect();
      let nextPosition: LabelPosition = "top";
      if (labelRect.height > instanceRect.top) {
        nextPosition = instanceRect.height < 250 ? "bottom" : "inside";
      }
      setPosition(nextPosition);
    },
    [instanceRect]
  );

  return [ref, position];
};

const Outline = styled(
  "div",
  {
    position: "absolute",
    pointerEvents: "none",
    outline: "2px solid $blue9",
    outlineOffset: -2,
    top: 0,
    left: 0,
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
        top: {
          top: "-$4",
        },
        inside: {
          top: 0,
        },
        bottom: {
          bottom: "-$4",
        },
      },
    },
  }
);

export const SelectedInstanceOutline = () => {
  const style = useStyle();
  const [selectedInstanceData] = useSelectedInstanceData();
  const [labelRef, position] = useLabelPosition();

  if (style === undefined || selectedInstanceData === undefined) {
    return null;
  }

  const primitive = primitives[selectedInstanceData.component];
  const { Icon } = primitive;

  return (
    <Outline state="selected" style={style}>
      <Label state="selected" position={position} ref={labelRef}>
        <Icon width="1em" height="1em" />
        {primitive.label}
      </Label>
    </Outline>
  );
};
