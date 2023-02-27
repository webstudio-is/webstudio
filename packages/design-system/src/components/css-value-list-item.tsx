import { type ComponentProps, forwardRef, Ref } from "react";
import { styled } from "../stitches.config";
import { Flex } from "./flex";
import { theme } from "../stitches.config";
import { DragHandleIcon } from "@webstudio-is/icons";

const DragHandleIconStyled = styled(DragHandleIcon, {
  visibility: "hidden",
  cursor: "grab",
  color: theme.colors.foregroundSubtle,
});

const ThumbHolder = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
});

const Item = styled(Flex, {
  userSelect: "none",
  backgroundColor: theme.colors.backgroundPanel,
  paddingRight: theme.spacing[9],
  height: theme.spacing[13],
  width: theme.spacing[30],
  position: "relative",

  "&:focus-visible, &[data-focused=true], &[data-state=open]": {
    "&:after": {
      borderRadius: theme.borderRadius[3],
      outline: `2px solid ${theme.colors.borderFocus}`,
      outlineOffset: "-2px",
      position: "absolute",
      content: '""',
      inset: "0 2px",
      pointerEvents: "none",
    },

    backgroundColor: theme.colors.backgroundHover,
  },
  "&:hover": {
    backgroundColor: theme.colors.backgroundHover,

    [`& ${DragHandleIconStyled}`]: {
      visibility: "visible",
    },
  },
  variants: {
    hidden: {
      true: {
        [`& ${ThumbHolder}`]: {
          opacity: 0.2,
        },
      },
    },
  },
});

type Props = ComponentProps<typeof Item> & {
  hidden?: boolean;
  label: React.ReactElement;
  thumbnail: React.ReactElement;
  buttons?: React.ReactElement;
  // to support Radix trigger asChild
  "data-state"?: "open";
  // for Storybook purposes
  focused?: boolean;
  state?: "open";
};

export const CssValueListItem = forwardRef(
  (
    {
      label,
      thumbnail,
      buttons,
      focused,
      state,
      "data-state": dataState,
      ...rest
    }: Props,
    ref: Ref<HTMLDivElement>
  ) => (
    <Item
      ref={ref}
      align="center"
      data-focused={focused}
      data-state={state ?? dataState}
      {...rest}
      tabIndex={0}
    >
      <DragHandleIconStyled />

      <Flex gap={2}>
        <ThumbHolder>{thumbnail}</ThumbHolder>
        {label}
      </Flex>

      <Flex grow={true} />

      <Flex
        gap={2}
        onClick={(event) => {
          if (event.target !== event.currentTarget) {
            // Having that CSSValueListItem is a button itself, prevent propagate click events
            // from descendants of button wrapper.
            // e.target === e.currentTarget means that click was between buttons in a gap
            event.stopPropagation();
          }
        }}
      >
        {buttons}
      </Flex>
    </Item>
  )
);

CssValueListItem.displayName = "CssValueListItem";
