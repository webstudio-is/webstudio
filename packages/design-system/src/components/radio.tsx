/**
 * Implementation of the "Radio" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1794%3A5804
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import { RadioUncheckedIcon, RadioCheckedIcon } from "@webstudio-is/icons";
import * as Primitive from "@radix-ui/react-radio-group";
import { type CSS, css, theme } from "../stitches.config";
import { cssVar } from "../css-var";

export { CheckboxAndLabel as RadioAndLabel } from "./checkbox";

const itemStyle = css({
  all: "unset", // reset <button>
  width: theme.spacing[9],
  height: theme.spacing[9],
  display: "block",
  position: "relative",
  borderRadius: theme.borderRadius.round,
  color: cssVar("--foreground-primary"),

  "&:focus-visible": {
    outline: `2px solid ${cssVar("--border-focus")}`,
  },

  "&[data-state=checked]": {
    color: cssVar("--foreground-accent"),
  },

  // [data-state] is needed to make selector specificity higher
  "&[data-state]:disabled": {
    color: cssVar("--foreground-disabled"),
  },

  "&:not(:disabled)::before": {
    content: "''",
    display: "block",
    position: "absolute",
    width: theme.spacing[7],
    height: theme.spacing[7],
    top: theme.spacing[2],
    left: theme.spacing[2],
    borderRadius: theme.borderRadius.round,
    background: cssVar("--background-secondary"),
  },
});

const iconStyle = css({ position: "relative" });

// We need this component basicslly just to get access to "data-state".
// We could render both icons and hide one using CSS,
// but that probably will be less performant.
const Button = forwardRef(
  (
    props: ComponentProps<"button"> & {
      "data-state"?: "checked" | "unchecked";
    },
    ref: Ref<HTMLButtonElement>
  ) => (
    <button {...props} ref={ref}>
      {props["data-state"] === "checked" ? (
        <RadioCheckedIcon className={iconStyle()} />
      ) : (
        <RadioUncheckedIcon className={iconStyle()} />
      )}
    </button>
  )
);
Button.displayName = "Button";

export const Radio = forwardRef(
  (
    {
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Item> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Item
      className={itemStyle({ className, css })}
      {...props}
      ref={ref}
      asChild
    >
      <Button />
    </Primitive.Item>
  )
);
Radio.displayName = "Radio";

export const RadioGroup = Primitive.Root;
