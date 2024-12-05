/**
 * Implementation of the "Section Title" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2%3A12361
 *
 * Designed to be used with Collapsible.Trigger
 */

import {
  forwardRef,
  type ReactNode,
  type Ref,
  type ComponentProps,
  createContext,
  useContext,
} from "react";
import { ChevronRightIcon } from "@webstudio-is/icons";
import { theme, css, styled, type CSS } from "../stitches.config";
import { Button } from "./button";
import { ArrowFocus } from "./primitives/arrow-focus";
import { Label, isLabelButton } from "./label";
import { focusRingStyle } from "./focus-ring";
import { Flex } from "./flex";

const buttonContentColor = "--ws-section-title-button-content-color";
const labelTextColor = "--ws-section-title-label-content-color";
const chevronOpacity = "--ws-section-title-chevron-display";

const StyledButton = styled(Button, {});

const containerStyle = css({
  position: "relative",
  height: theme.spacing[14],
  [buttonContentColor]: theme.colors.foregroundIconMain,
  [labelTextColor]: theme.colors.foregroundMain,
  "&:hover": {
    [chevronOpacity]: 1,
  },
});

const titleButtonLayoutStyle = css({
  all: "unset", // reset <button>
  display: "flex",
  gap: theme.spacing[5],
  alignItems: "center",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  paddingInline: theme.panel.paddingInline,
});

const labelContainerStyle = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
});

const titleButtonStyle = css(titleButtonLayoutStyle, {
  "&:focus-visible": focusRingStyle(),
});

const suffixSlotStyle = css({
  position: "absolute",
  right: theme.spacing[4],
  top: theme.spacing[4],
});

const invisibleSuffixStyle = css({
  visibility: "hidden",
});

const chevronStyle = css({
  width: theme.spacing[7],
  opacity: `var(${chevronOpacity}, 0)`,
  marginLeft: `-${theme.spacing[6]}`,
  transition: "transform 150ms, opacity 200ms",
  color: theme.colors.backgroundIconSubtle,
  variants: {
    openState: {
      open: {
        transform: "rotate(90deg)",
      },
      closed: {},
      inactive: {},
    },
  },
});

const dotStyle = css({
  width: theme.spacing[4],
  height: theme.spacing[4],
  borderRadius: theme.borderRadius.round,
  marginRight: -2,
  variants: {
    color: {
      local: { backgroundColor: theme.colors.foregroundLocalFlexUi },
      overwritten: {
        backgroundColor: theme.colors.foregroundOverwrittenFlexUi,
      },
      remote: { backgroundColor: theme.colors.foregroundRemoteFlexUi },
    },
  },
});

const context = createContext<{
  openState: "open" | "closed";
  inactive: boolean;
}>({
  openState: "closed",
  inactive: false,
});

export const SectionTitle = forwardRef(
  (
    {
      dots,
      className,
      css,
      children,
      suffix,
      inactive = false,
      collapsible = true,
      ...props
    }: ComponentProps<"button"> & {
      inactive?: boolean;
      collapsible?: boolean;
      /** https://www.radix-ui.com/docs/primitives/components/collapsible#trigger */
      "data-state"?: "open" | "closed";
      dots?: Array<"local" | "overwritten" | "remote">;
      css?: CSS;
      /** Primarily for <SectionTitleButton> */
      suffix?: ReactNode;
    },
    ref: Ref<HTMLButtonElement>
  ) => {
    const openState = props["data-state"] ?? "closed";
    const finalDots = openState === "open" ? [] : (dots ?? []);

    return (
      <context.Provider value={{ openState, inactive }}>
        <ArrowFocus
          render={({ handleKeyDown }) => (
            <Flex
              align="center"
              className={containerStyle({
                className,
                css,
                color: inactive ? "disabled" : "default",
              })}
              data-state={openState}
              onKeyDown={handleKeyDown}
            >
              {collapsible && (
                <button
                  className={titleButtonStyle()}
                  data-state={openState}
                  ref={ref}
                  {...props}
                >
                  <ChevronRightIcon className={chevronStyle({ openState })} />
                </button>
              )}
              {/*
                If the label is itself a button, we don't want to nest a button inside another button.
                Therefore, we render the label in a layer above the SectionTitle button
              */}
              <div className={labelContainerStyle()}>
                <div className={titleButtonLayoutStyle({ openState })}>
                  {children}

                  {finalDots.length > 0 && (
                    <Flex shrink={false}>
                      {finalDots.map((color) => (
                        <div key={color} className={dotStyle({ color })} />
                      ))}
                    </Flex>
                  )}

                  {suffix && (
                    /* In case of text overflow we need to place here the same suffix*/
                    <div className={invisibleSuffixStyle()}>{suffix}</div>
                  )}
                </div>
              </div>

              {suffix && <div className={suffixSlotStyle()}>{suffix}</div>}
            </Flex>
          )}
        />
      </context.Provider>
    );
  }
);
SectionTitle.displayName = "SectionTitle";

export const SectionTitleLabel = forwardRef(
  (
    {
      css,
      children,
      ...props
    }: Omit<ComponentProps<typeof Label>, "truncate" | "text">,
    ref: Ref<HTMLLabelElement>
  ) => {
    const { openState, inactive } = useContext(context);

    const commonCss = { flex: "0 1 auto" };
    const color = inactive
      ? "inactive"
      : openState === "closed"
        ? "default"
        : props.color;

    const isButton = isLabelButton(color);

    return (
      <Label
        truncate
        text="title"
        {...props}
        color={color}
        css={{
          color:
            openState === "closed" && inactive === false
              ? `var(${labelTextColor})`
              : undefined,
          ...commonCss,
          ...css,

          // When we use a SectionTitle button, we can't directly render a label inside it.
          // Instead, we need to render the label using a div that has position:absolute and pointer-events:none
          // However, if the label itself is a button, we need to make sure that it remains clickable.
          // @todo: move this logic to css
          pointerEvents: isButton ? "auto" : "inherit",
        }}
        ref={ref}
      >
        {children}
      </Label>
    );
  }
);
SectionTitleLabel.displayName = "SectionTitleLabel";

export const SectionTitleButton = forwardRef(
  (
    { css, ...props }: ComponentProps<typeof Button>,
    ref: Ref<HTMLButtonElement>
  ) => (
    <StyledButton
      tabIndex={-1}
      color="ghost"
      {...props}
      css={{ color: `var(${buttonContentColor})`, ...css }}
      ref={ref}
    />
  )
);
SectionTitleButton.displayName = "SectionTitleButton";
