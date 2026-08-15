import { useStore } from "@nanostores/react";
import { blockTemplateComponent } from "@webstudio-is/sdk";
import {
  idAttribute,
  selectorIdAttribute,
  type AnyComponent,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";

import * as React from "react";
import { useState } from "react";
import { Button, rawTheme } from "@webstudio-is/design-system";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { $isDesignMode, $isPreviewMode } from "~/shared/nano-states";
import { $selectedInstanceSelector } from "~/shared/nano-states";
import {
  $runtimeInstances as $instances,
  getContentBlockPresentationActions,
  type ContentBlockPresentationItem,
} from "~/shared/content-block-content";

export const ContentBlockPresentation = React.forwardRef<
  HTMLElement,
  {
    item: ContentBlockPresentationItem;
  } & WebstudioComponentSystemProps
>(({ item, ...props }, ref) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [openedAssetId, setOpenedAssetId] = useState<string>();
  const actions = getContentBlockPresentationActions(item);
  const run = async (action: "retry" | "reloadRemote") => {
    if (busy || actions === undefined) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await actions[action]();
      if (result.status === "blocked") {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update MDX");
    } finally {
      setBusy(false);
    }
  };
  const stopCanvasSelection = (event: React.SyntheticEvent) =>
    event.stopPropagation();
  const isError = item.kind === "error";
  const isWarning = item.kind === "warning";
  return (
    <>
      <section
        {...props}
        ref={ref}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : isWarning ? "off" : "polite"}
        aria-busy={item.kind === "loading" || busy || undefined}
        tabIndex={0}
        style={{
          display: "grid",
          gap: rawTheme.spacing[3],
          padding: rawTheme.spacing[5],
          border: `1px solid ${
            isError
              ? rawTheme.colors.borderDestructiveMain
              : rawTheme.colors.borderMain
          }`,
          borderRadius: rawTheme.spacing[3],
          backgroundColor: rawTheme.colors.backgroundMenu,
          color: isError
            ? rawTheme.colors.foregroundDestructive
            : rawTheme.colors.foregroundMain,
        }}
      >
        <strong>{item.label}</strong>
        <span>{item.message}</span>
        {error !== undefined && <span>{error}</span>}
        <span style={{ display: "flex", gap: rawTheme.spacing[3] }}>
          {isError && item.status !== "conflicting" && (
            <Button
              type="button"
              color="neutral"
              disabled={busy || actions === undefined}
              aria-label="Retry loading MDX content"
              onPointerDown={stopCanvasSelection}
              onClick={(event) => {
                stopCanvasSelection(event);
                void run("retry");
              }}
            >
              Retry
            </Button>
          )}
          {item.status === "conflicting" && (
            <>
              <Button
                type="button"
                color="neutral"
                disabled={busy || actions === undefined}
                onPointerDown={stopCanvasSelection}
                onClick={(event) => {
                  stopCanvasSelection(event);
                  void run("reloadRemote");
                }}
              >
                Reload remote file
              </Button>
              <Button
                type="button"
                color="neutral"
                disabled={busy || actions?.copyUnsavedSource() === undefined}
                onPointerDown={stopCanvasSelection}
                onClick={(event) => {
                  stopCanvasSelection(event);
                  const source = actions?.copyUnsavedSource();
                  if (source !== undefined) {
                    if (navigator.clipboard === undefined) {
                      setError("Clipboard access is unavailable.");
                    } else {
                      void navigator.clipboard.writeText(source).catch(() => {
                        setError("The unsaved MDX could not be copied.");
                      });
                    }
                  }
                }}
              >
                Copy unsaved MDX
              </Button>
            </>
          )}
          {item.assetId !== undefined && (
            <Button
              type="button"
              color="neutral"
              onPointerDown={stopCanvasSelection}
              onClick={(event) => {
                stopCanvasSelection(event);
                setOpenedAssetId(item.assetId);
              }}
            >
              Open file
            </Button>
          )}
        </span>
      </section>
      {openedAssetId !== undefined && (
        <TextFileEditor
          assetId={openedAssetId}
          onOpenChange={(open) => {
            if (open === false) {
              setOpenedAssetId(undefined);
            }
          }}
        />
      )}
    </>
  );
});

export const Block = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const instances = useStore($instances);
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

  if (!isDesignMode && !hasContent && !hasTemplates) {
    return <></>;
  }

  const editableBlockStyle = hasContent ? { display: "contents" } : {};

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
      {hasContent || isPreviewMode ? null : (
        <div>Editable block you can edit</div>
      )}
    </div>
  );
}) as AnyComponent;
