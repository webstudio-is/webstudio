import { useStore } from "@nanostores/react";
import {
  editableBlockTemplateComponent,
  idAttribute,
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";

import * as React from "react";
import { $instances, $selectedInstanceSelector } from "~/shared/nano-states";

export const EditableBlock = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const instances = useStore($instances);
  const instanceId = props[idAttribute];
  const instance = instances.get(instanceId);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

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

  const templateInstance = instances.get(templateInstanceId);
  if (templateInstance === undefined) {
    return <div>Editable Block template instance is undefined</div>;
  }

  const templateChildrenIds = templateInstance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);

  if (templateChildrenIds === undefined) {
    return <div>Editable block template children not found</div>;
  }

  const childArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  );

  if (selectedInstanceSelector !== undefined) {
    const selectedSelector = selectedInstanceSelector.join(",");
    // If any template child is selected then render only template
    const stringSelector = props[selectorIdAttribute];

    const isTemplateChildSelected = templateChildrenIds.some((childId) => {
      const childSelector = `${childId},${templateInstanceId},${stringSelector}`;

      if (selectedSelector.endsWith(childSelector)) {
        return true;
      }
    });

    if (isTemplateChildSelected) {
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

  const hasContent = childArray.length > 1;
  const editableBlockStyle = hasContent ? { display: "contents" } : {};

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
      {hasContent ? null : <div>Editable block you can edit</div>}
    </div>
  );
}) as AnyComponent;
