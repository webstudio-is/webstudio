import { useStore } from "@nanostores/react";
import {
  blockTemplateComponent,
  getContentBlockSource,
} from "@webstudio-is/sdk";
import {
  idAttribute,
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";

import * as React from "react";
import { rawTheme } from "@webstudio-is/design-system";
import { $isDesignMode, $isPreviewMode } from "~/shared/nano-states";
import { $selectedInstanceSelector } from "~/shared/nano-states";
import {
  $runtimeInstances as $instances,
  $runtimeProps as $props,
  type ContentBlockPresentationItem,
} from "~/shared/content-block-content";

export const ContentBlockPresentation = React.forwardRef<
  HTMLElement,
  {
    item: ContentBlockPresentationItem;
  } & WebstudioComponentSystemProps
>(({ item, ...props }, ref) => {
  return (
    <section
      {...props}
      ref={ref}
      role="status"
      aria-live="off"
      tabIndex={0}
      style={{
        display: "grid",
        gap: rawTheme.spacing[3],
        padding: rawTheme.spacing[5],
        border: `1px solid ${rawTheme.colors.borderMain}`,
        borderRadius: rawTheme.spacing[3],
        backgroundColor: rawTheme.colors.backgroundMenu,
        color: rawTheme.colors.foregroundMain,
      }}
    >
      <strong>{item.label}</strong>
      <span>{item.message}</span>
    </section>
  );
});

export const Block = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const instances = useStore($instances);
  const allProps = useStore($props);
  const isDesignMode = useStore($isDesignMode);
  const isPreviewMode = useStore($isPreviewMode);
  const instanceId = props[idAttribute];
  const instance = instances.get(instanceId);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

  const childArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  );

  if (instance === undefined) {
    return <div>Content Block instance is undefined</div>;
  }

  const templateInstanceId = instance.children.find(
    (child) =>
      child.type === "id" &&
      instances.get(child.value)?.component === blockTemplateComponent
  )?.value;

  if (templateInstanceId === undefined) {
    return <div>Content Block template child is not found</div>;
  }

  const templateInstance = instances.get(templateInstanceId);

  if (templateInstance === undefined) {
    return <div>Content Block template instance is not found</div>;
  }

  if (isDesignMode) {
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
  const hasTemplates = templateInstance.children.length > 0;
  const hasContentSource =
    getContentBlockSource({
      blockInstanceId: instanceId,
      props: allProps.values(),
    }) !== undefined;

  if (
    !isDesignMode &&
    !hasContent &&
    !hasTemplates &&
    (!hasContentSource || isPreviewMode)
  ) {
    return null;
  }

  const editableBlockStyle = hasContent
    ? { display: "contents" }
    : !isDesignMode && !isPreviewMode && hasContentSource
      ? { minHeight: rawTheme.spacing[9] }
      : {};

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
      {hasContent || isPreviewMode || hasContentSource ? null : (
        <div>Editable block you can edit</div>
      )}
    </div>
  );
}) as AnyComponent;
