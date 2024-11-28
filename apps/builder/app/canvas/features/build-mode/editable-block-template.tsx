import { useStore } from "@nanostores/react";
import {
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import * as React from "react";
import { $isDesignMode, $selectedInstanceSelector } from "~/shared/nano-states";

export const EditableBlockTemplate = React.forwardRef<
  HTMLDivElement,
  WebstudioComponentSystemProps & { children: React.ReactNode }
>(({ ...props }, ref) => {
  const isDesignMode = useStore($isDesignMode);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const templateInstanceStringSelector = props[selectorIdAttribute];

  if (!isDesignMode) {
    return;
  }

  if (selectedInstanceSelector === undefined) {
    return;
  }

  if (selectedInstanceSelector.length === 0) {
    return;
  }

  const selectedSelector = selectedInstanceSelector.join(",");

  // Exclude all selected ancestors
  if (!selectedSelector.endsWith(templateInstanceStringSelector)) {
    return;
  }

  return <div style={{ display: "contents" }} ref={ref} {...props} />;
}) as AnyComponent;
