import { useStore } from "@nanostores/react";
import type {
  AnyComponent,
  WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import * as React from "react";
import { $isContentMode } from "~/shared/nano-states";

export const EditableBlockTemplate = React.forwardRef<
  HTMLDivElement,
  WebstudioComponentSystemProps
>((props, ref) => {
  const isContentMode = useStore($isContentMode);

  if (isContentMode) {
    return <></>;
  }

  return <div ref={ref} {...props} />;
}) as AnyComponent;
