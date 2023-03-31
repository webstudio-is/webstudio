import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import { cssVars } from "@webstudio-is/css-vars";

export const defaultTag = "code";

export const displayVarNamespace = cssVars.unique("code-display");

const blockStyle = {
  [cssVars.define(displayVarNamespace, true)]: "block",
};

type Props = Omit<ComponentProps<typeof defaultTag>, "inline"> & {
  inline?: boolean;
  meta?: string;
};

export const Code = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ inline = false, ...props }, ref) => {
    // @todo in the future we should expose the inline prop a an attribute
    // and define the display style in `presetStyle` in meta.
    const style = inline ? undefined : blockStyle;
    return createElement(defaultTag, { ...props, style, ref });
  }
);

Code.displayName = "Code";
