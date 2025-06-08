import { useCallback, useState } from "react";
import { styled, type Rect } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { theme } from "@webstudio-is/design-system";
import { InstanceIcon, InstanceLabel } from "~/builder/shared/instance-label";

type LabelPosition = "top" | "inside" | "bottom";
type LabelRefCallback = (element: HTMLElement | null) => void;

/**
 * Detects if there is no space on top and for the label and tells to show it inside.
 * - if there is enough space for the label on top of the instance - top
 * - else if instance height is more than 250px - bottom
 * - else inside-top - last resort because it covers a bit of the instance content
 */
const useLabelPosition = (
  instanceRect: Rect
): [LabelRefCallback, LabelPosition] => {
  const [position, setPosition] = useState<LabelPosition>("top");

  const ref = useCallback(
    (element: null | HTMLElement) => {
      if (element === null || instanceRect === undefined) {
        return;
      }
      const labelRect = element.getBoundingClientRect();
      let nextPosition: LabelPosition = "top";
      // Label won't fit above the instance outline
      if (labelRect.height > instanceRect.top) {
        nextPosition = instanceRect.height < 250 ? "bottom" : "inside";
      }
      setPosition(nextPosition);
    },
    [instanceRect]
  );

  return [ref, position];
};

const LabelContainer = styled(
  "div",
  {
    position: "absolute",
    display: "flex",
    padding: `0 ${theme.spacing[3]}`,
    height: theme.spacing[10],
    color: "white",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    fontSize: theme.deprecatedFontSize[3],
    fontFamily: theme.fonts.sans,
    lineHeight: 1,
    minWidth: theme.spacing[13],
    whiteSpace: "nowrap",
  },
  {
    variants: {
      position: {
        top: {
          left: -1,
          top: `-${theme.spacing[10]}`,
          borderTopLeftRadius: theme.borderRadius[4],
          borderTopRightRadius: theme.borderRadius[4],
        },
        inside: {
          top: 0,
          borderBottomLeftRadius: theme.borderRadius[4],
          borderBottomRightRadius: theme.borderRadius[4],
        },
        bottom: {
          left: -1,
          bottom: `-${theme.spacing[10]}`,
          borderBottomLeftRadius: theme.borderRadius[4],
          borderBottomRightRadius: theme.borderRadius[4],
        },
      },
      variant: {
        default: {
          backgroundColor: theme.colors.backgroundPrimary,
        },
        slot: {
          backgroundColor: theme.colors.foregroundReusable,
        },
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type LabelProps = {
  instance: { label?: string; component: Instance["component"] };
  instanceRect: Rect;
  variant?: "default" | "slot";
};

export const Label = ({ instance, instanceRect, variant }: LabelProps) => {
  const [labelRef, position] = useLabelPosition(instanceRect);
  return (
    <LabelContainer position={position} variant={variant} ref={labelRef}>
      <InstanceIcon size="1em" instance={instance} />
      <InstanceLabel instance={instance} />
    </LabelContainer>
  );
};
