import { useStore } from "@nanostores/react";
import {
  editableBlockTemplateComponent,
  idAttribute,
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";

import * as React from "react";
import {
  $instances,
  $isDesignMode,
  $selectedInstanceSelector,
} from "~/shared/nano-states";

export const EditableBlock = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const instances = useStore($instances);
  const isDesignMode = useStore($isDesignMode);
  const instanceId = props[idAttribute];
  const instance = instances.get(instanceId);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

  const childArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  );

  if (isDesignMode) {
    if (instance === undefined) {
      return <div>Editable Block instance is undefined</div>;
    }

    const templateInstanceId = instance.children.find(
      (child) =>
        child.type === "id" &&
        instances.get(child.value)?.component === editableBlockTemplateComponent
    )?.value;

    if (templateInstanceId === undefined) {
      return <div>Editable Block template instance not found</div>;
    }

    if (selectedInstanceSelector !== undefined) {
      const selectedSelector = selectedInstanceSelector.join(",");
      // If any template child is selected then render only template
      const stringSelector = props[selectorIdAttribute];
      const templateSelector = `${templateInstanceId},${stringSelector}`;

      if (selectedSelector.endsWith(templateSelector)) {
        return (
          <div style={{ display: "contents" }} ref={ref} {...props}>
            {childArray.filter((child) => {
              const { instanceSelector } = child.props;

              return instanceSelector[0] === templateInstanceId;
            })}
          </div>
        );
      }
    }
  }

  const hasContent = childArray.length > 1;
  const editableBlockStyle = hasContent ? { display: "contents" } : {};

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
      {hasContent ? null : <div>Editable block you can edit</div>}
    </div>
  );
}) as AnyComponent;
