import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import { cssVars } from "@webstudio-is/css-vars";

export const defaultTag = "code";

export const displayVarNamespace = cssVars.define("code-display");

const blockStyle = {
  [cssVars.define(displayVarNamespace)]: "block",
};

type Props = Omit<ComponentProps<typeof defaultTag>, "inline"> & {
  inline?: boolean;
  meta?: string;
};

export const CodeText = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ inline = false, ...props }, ref) => {
    // @todo in the future we should expose the inline prop a an attribute
    // and define the display style in `presetStyle` in meta.
    const style = inline ? undefined : blockStyle;
    return createElement(defaultTag, { ...props, style, ref });
  }
);

CodeText.displayName = "CodeText";
