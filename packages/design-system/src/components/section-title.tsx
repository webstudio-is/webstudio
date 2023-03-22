/**
 * Implementation of the "Title (title of: section)" component from:
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
import { theme, css, type CSS } from "../stitches.config";
import { Button } from "./button";
import { cssVars } from "@webstudio-is/css-vars";
import { ArrowFocus } from "./primitives/arrow-focus";
import { Label } from "./label";

const buttonContentColor = cssVars.define("button-content-color");
const labelTextColor = cssVars.define("label-text-color");

const containerStyle = css({
  position: "relative",
  height: theme.spacing[15],
  [buttonContentColor]: theme.colors.foregroundSubtle,
  "&:hover, &:has(:focus-visible), &[data-state=open]": {
    [buttonContentColor]: theme.colors.foregroundIconMain,
  },
});

const titleButtonStyle = css({
  all: "unset", // reset <button>
  display: "flex",
  gap: theme.spacing[5],
  alignItems: "center",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  paddingLeft: theme.spacing[9],
  paddingRight: theme.spacing[7],
  [labelTextColor]: theme.colors.foregroundSubtle,
  cursor: "pointer",
  "&:hover, &:focus-visible, &[data-state=open]": {
    [labelTextColor]: theme.colors.foregroundMain,
  },
  "&:focus-visible::before": {
    content: "''",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: theme.spacing[2],
    right: theme.spacing[2],
    borderRadius: theme.borderRadius[4],
    border: `2px solid ${theme.colors.borderFocus}`,
  },
  variants: {
    // We assume that suffix is a <Button prefix={<Icon />} />
    // (hard to support arbitrary width suffixes here, hopefully we'll never need to)
    hasSuffix: { true: { paddingRight: theme.spacing[16] } },
  },
});

const suffixSlotStyle = css({
  position: "absolute",
  right: theme.spacing[6],
  top: theme.spacing[4],
});

const dotsSlotStyle = css({
  display: "flex",
});

const dotStyle = css({
  width: theme.spacing[4],
  height: theme.spacing[4],
  borderRadius: theme.borderRadius.round,
  marginRight: -2,
  variants: {
    color: {
      local: { backgroundColor: theme.colors.foregroundLocalFlexUi },
      remote: { backgroundColor: theme.colors.foregroundRemoteFlexUi },
    },
  },
});

const context = createContext<{ state: "open" | "closed" }>({
  state: "closed",
});

export const SectionTitle = forwardRef(
  (
    {
      dots,
      className,
      css,
      children,
      suffix,
      ...props
    }: ComponentProps<"button"> & {
      /** https://www.radix-ui.com/docs/primitives/components/collapsible#trigger */
      "data-state"?: "open" | "closed";
      dots?: Array<"local" | "remote">;
      css?: CSS;
      /** Primarily for <SectionTitleButton> */
      suffix?: ReactNode;
    },
    ref: Ref<HTMLButtonElement>
  ) => {
    const state = props["data-state"] ?? "closed";
    const finalDots = state === "open" ? [] : dots ?? [];

    return (
      <context.Provider value={{ state }}>
        <ArrowFocus
          render={({ handleKeyDown }) => (
            <div
              className={containerStyle({ className, css })}
              data-state={state}
              onKeyDown={handleKeyDown}
            >
              <button
                className={titleButtonStyle({
                  hasSuffix: suffix !== undefined,
                })}
                data-state={state}
                ref={ref}
                {...props}
              >
                {children}
                {finalDots.length > 0 && (
                  <div className={dotsSlotStyle()}>
                    {finalDots.map((color) => (
                      <div key={color} className={dotStyle({ color })} />
                    ))}
                  </div>
                )}
              </button>
              {suffix && <div className={suffixSlotStyle()}>{suffix}</div>}
            </div>
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
    }: Omit<ComponentProps<typeof Label>, "truncate" | "sectionTitle">,
    ref: Ref<HTMLLabelElement>
  ) => {
    const { state } = useContext(context);

    const commonCss = { flex: "0 1 auto" };

    // When section is closed Label basically turns into an innert text
    // https://github.com/webstudio-is/webstudio-builder/issues/1271#issuecomment-1478262629
    if (state === "closed") {
      return (
        <Label
          truncate
          sectionTitle
          color="default"
          css={{
            cursor: "inherit",
            color: cssVars.use(labelTextColor),
            ...commonCss,
            ...css,
          }}
          ref={ref}
        >
          {children}
        </Label>
      );
    }

    const hasAction = Object.keys(props).some((prop) => prop.startsWith("on"));

    return (
      <Label
        truncate
        sectionTitle
        tabIndex={hasAction ? -1 : undefined}
        {...props}
        css={{
          // if there's no action, use cursor of SectionTitle,
          // otherwise use cursor of Label
          cursor: hasAction ? undefined : "inherit",
          ...commonCss,
          ...css,
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
    <Button
      tabIndex={-1}
      color="ghost"
      {...props}
      css={{ color: cssVars.use(buttonContentColor), ...css }}
      ref={ref}
    />
  )
);
SectionTitleButton.displayName = "SectionTitleButton";
