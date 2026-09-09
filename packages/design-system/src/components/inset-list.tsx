import { forwardRef, type ComponentProps, type Ref } from "react";
import { Slot } from "@radix-ui/react-slot";
import { buttonStyle } from "./button";
import { selectedItemBackground } from "./component-state-color";
import { css, styled, theme, type CSS } from "../stitches.config";

export const InsetList = styled("div", {
  boxSizing: "border-box",
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  alignContent: "start",
  flexShrink: 0,
  gap: theme.spacing[3],
  padding: theme.spacing[3],
});

const insetListItemStyle = css(buttonStyle, {
  height: "auto",
  minHeight: theme.spacing[13],
  padding: theme.spacing[3],
  justifyContent: "start",
  textAlign: "left",
  overflow: "hidden",
  gap: theme.spacing[5],
  cursor: "pointer",
  "&[aria-current=true], &[aria-current=page], &[data-state=selected]": {
    background: selectedItemBackground,
  },
});

export type InsetListItemProps = Omit<ComponentProps<"button">, "color"> & {
  asChild?: boolean;
  css?: CSS;
  "data-state"?: string;
};

export const InsetListItem = forwardRef(
  (
    {
      asChild,
      className,
      css: cssProp,
      "data-state": dataState,
      ...props
    }: InsetListItemProps,
    ref: Ref<HTMLButtonElement>
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        {...props}
        ref={ref}
        data-state={dataState ?? "auto"}
        className={insetListItemStyle({
          color: "ghost",
          className,
          css: cssProp,
        })}
      />
    );
  }
);
InsetListItem.displayName = "InsetListItem";
