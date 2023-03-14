import { type ComponentProps, forwardRef, Ref, Children, useMemo } from "react";
import { styled } from "../stitches.config";
import { Flex } from "./flex";
import { theme } from "../stitches.config";
import { DragHandleIcon } from "@webstudio-is/icons";

const DragHandleIconStyled = styled(DragHandleIcon, {
  visibility: "hidden",
  cursor: "grab",
  color: theme.colors.foregroundSubtle,
  flexShrink: 0,
});

const ThumbHolder = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
  flexShrink: 0,
});

/**
 * We draw button above rela button positions, therefore we need to have same padding
 */
const sharedPaddingRight = theme.spacing[9];

/**
 * Should be a button as otherwise radix trigger doesn't work with keyboard interactions
 */
const ItemButton = styled("button", {
  appearance: "none",
  width: "100%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  userSelect: "none",
  backgroundColor: theme.colors.backgroundPanel,
  padding: 0,

  paddingRight: sharedPaddingRight,

  height: theme.spacing[13],
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

    outline: "none",
    backgroundColor: theme.colors.backgroundHover,
  },
  "&:hover, &[data-active=true]": {
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

type Props = ComponentProps<typeof ItemButton> & {
  hidden?: boolean;
  label: React.ReactElement;
  thumbnail: React.ReactElement;
  buttons?: React.ReactElement;
  // to support Radix trigger asChild
  "data-state"?: "open";
  // for Storybook purposes
  focused?: boolean;
  state?: "open";
  active?: boolean;
};

const ItemWrapper = styled("div", {
  position: "relative",
  width: "100%",
});

const IconButtonsWrapper = styled(Flex, {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  paddingRight: sharedPaddingRight,
});

const FakeSmallButton = styled("div", {
  width: theme.spacing[9],
  height: theme.spacing[9],
});

export const CssValueListItem = forwardRef(
  (
    {
      label,
      thumbnail,
      buttons,
      focused,
      state,
      active,
      "data-state": dataState,
      ...rest
    }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    const buttonsCount = Children.count(buttons?.props.children);
    const fakeButtons = useMemo(
      () => (
        <>
          {Array.from(new Array(buttonsCount), (_v, index) => (
            <FakeSmallButton key={index} />
          ))}
        </>
      ),
      [buttonsCount]
    );

    return (
      <ItemWrapper>
        <ItemButton
          ref={ref}
          data-focused={focused}
          data-state={state ?? dataState}
          data-active={active}
          {...rest}
          tabIndex={0}
        >
          <DragHandleIconStyled />

          <Flex gap={2} shrink>
            <ThumbHolder>{thumbnail}</ThumbHolder>
            {label}
          </Flex>

          <Flex grow={true} />

          {/*
            We place fake divs with same dimensions as small buttons here to avoid following warning:
            Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>
            Real buttons will be placed on top of fake buttons
          */}
          <Flex shrink={false} css={{ paddingLeft: theme.spacing[5] }} gap={2}>
            {fakeButtons}
          </Flex>
        </ItemButton>

        {/*
          Real buttons are placed above ItemButton to avoid <button> cannot appear as a descendant of <button> warning
        */}
        <IconButtonsWrapper gap={2} align="center">
          {buttons}
        </IconButtonsWrapper>
      </ItemWrapper>
    );
  }
);

CssValueListItem.displayName = "CssValueListItem";
