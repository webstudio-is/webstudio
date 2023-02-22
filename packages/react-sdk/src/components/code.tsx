import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import { cssVars } from "@webstudio-is/css-vars";

const defaultTag = "code";

export const displayVarNamespace = cssVars.unique("code-display");

const displayVar = cssVars.define(displayVarNamespace, true);

type Props = Omit<ComponentProps<typeof defaultTag>, "inline"> & {
  inline?: boolean;
  meta?: string;
};

export const Code = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ inline = false, ...props }, ref) => {
    // @todo in the future we should expose the inline prop a an attribute
    // and define the display style in `presetStyle` in meta.
    const style = inline ? undefined : { [displayVar]: "block" };
    return createElement(defaultTag, { ...props, style, ref });
  }
);

Code.displayName = "Code";
