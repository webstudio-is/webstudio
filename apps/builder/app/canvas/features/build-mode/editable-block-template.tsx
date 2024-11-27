import { useStore } from "@nanostores/react";
import {
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import * as React from "react";

import { $isDesignMode, $selectedInstanceSelector } from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";

export const EditableBlockTemplate = React.forwardRef<
  HTMLDivElement,
  WebstudioComponentSystemProps & { children: React.ReactNode }
>(({ children, ...props }, ref) => {
  const isDesignMode = useStore($isDesignMode);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const templateInstanceStringSelector = props[selectorIdAttribute];

  if (!isDesignMode) {
    return <></>;
  }

  if (selectedInstanceSelector === undefined) {
    return <></>;
  }

  const selectedSelector = selectedInstanceSelector.join(",");

  // Exclude all selected ancestors and self
  if (templateInstanceStringSelector.endsWith(selectedSelector)) {
    return <div style={{ display: "contents" }} ref={ref} {...props} />;
  }

  const visibleChildren = React.Children.toArray(children)
    .filter((child) => React.isValidElement(child))
    .filter((child) => {
      const { instanceSelector } = child.props as {
        instanceSelector: InstanceSelector;
      };

      return selectedSelector.endsWith(instanceSelector.join(","));
    });

  return (
    <div style={{ display: "contents" }} ref={ref} {...props}>
      {visibleChildren}
    </div>
  );
}) as AnyComponent;
