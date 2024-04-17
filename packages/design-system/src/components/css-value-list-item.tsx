import {
  type ComponentProps,
  type Ref,
  forwardRef,
  Children,
  useMemo,
  type ReactNode,
} from "react";
import { styled } from "../stitches.config";
import { Flex } from "./flex";
import { Box } from "./box";
import { theme } from "../stitches.config";
import { DragHandleIcon } from "@webstudio-is/icons";
import { ArrowFocus } from "./primitives/arrow-focus";

const LIST_ITEM_ATTRIBUTE = "data-list-item";
const listItemAttributes = { [LIST_ITEM_ATTRIBUTE]: true };

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

const IconButtonsWrapper = styled(Flex, {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  paddingRight: sharedPaddingRight,
});

const FakeIconButtonsWrapper = styled(Flex, {
  paddingLeft: theme.spacing[5],
});

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
  variants: {
    hidden: {
      true: {
        opacity: 0.2,
        [`& ${ThumbHolder}`]: {
          opacity: 0.2,
        },
      },
    },
  },
});

type Props = ComponentProps<typeof ItemButton> & {
  id: string;
  index: number;
  hidden?: boolean;
  draggable?: boolean;
  label: React.ReactElement;
  thumbnail?: React.ReactElement;
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
  "&:hover, &[data-active=true]": {
    [`& ${ItemButton}`]: {
      backgroundColor: theme.colors.backgroundHover,
      [`&[data-draggable=true] ${DragHandleIconStyled}`]: {
        visibility: "visible",
      },
    },
  },
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
      index,
      id,
      hidden,
      draggable,
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
      <ArrowFocus
        render={({ handleKeyDown }) => (
          <ItemWrapper
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                handleKeyDown(event);
              }
            }}
            data-active={active}
          >
            <ItemButton
              ref={ref}
              data-id={id}
              data-draggable={draggable}
              data-focused={focused}
              data-state={state ?? dataState}
              data-active={active}
              tabIndex={index === 0 ? 0 : -1}
              {...listItemAttributes}
              {...rest}
              hidden={hidden}
              disabled={hidden === true}
            >
              <DragHandleIconStyled />

              <Flex gap={2} shrink>
                {thumbnail ? <ThumbHolder>{thumbnail}</ThumbHolder> : null}
                {label}
              </Flex>

              <Flex grow={true} />

              {/*
            We place fake divs with same dimensions as small buttons here to avoid following warning:
            Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>
            Real buttons will be placed on top of fake buttons
          */}
              <FakeIconButtonsWrapper shrink={false} gap={2}>
                {fakeButtons}
              </FakeIconButtonsWrapper>
            </ItemButton>

            {/*
          Real buttons are placed above ItemButton to avoid <button> cannot appear as a descendant of <button> warning
        */}
            <IconButtonsWrapper gap={2} align="center">
              {buttons}
            </IconButtonsWrapper>
          </ItemWrapper>
        )}
      />
    );
  }
);

CssValueListItem.displayName = "CssValueListItem";

export const CssValueListArrowFocus = ({
  children,
  dragItemId,
}: {
  children: ReactNode;
  dragItemId?: string;
}) => {
  return (
    <ArrowFocus
      render={({ handleKeyDown }) => (
        <Box
          css={{
            display: "contents",
            pointerEvents: dragItemId ? "none" : "auto",
            // to make DnD work we have to disable scrolling using touch
            touchAction: "none",
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              handleKeyDown(event, {
                accept: (element) =>
                  element.getAttribute(LIST_ITEM_ATTRIBUTE) === "true",
              });
            }
          }}
        >
          {children}
        </Box>
      )}
    />
  );
};
