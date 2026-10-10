import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  SmallIconButton,
  toast,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import {
  findAvailableVariables,
  findUsedVariables,
  isRequiredManagedFormVariable,
} from "@webstudio-is/project-build/runtime";
import { $selectedInstance, $selectedPage } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $resources,
  $pages,
  $props,
} from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { readClipboardText } from "~/shared/clipboard";
import {
  DeleteDataVariableDialog,
  deleteDataVariable,
  validateDataVariableName,
} from "~/builder/shared/data-variable-utils";
import { serializeVariable, deserializeVariable } from "./variable-clipboard";

type VariableToDelete = { id: string; name: string; usages: number };

const getVariableToDelete = (variable: DataSource): VariableToDelete => {
  const instance = $selectedInstance.get();
  const usages = instance
    ? (findUsedVariables({
        startingInstanceId: instance.id,
        instances: $instances.get(),
        pages: $pages.get(),
        props: $props.get(),
        dataSources: $dataSources.get(),
        resources: $resources.get(),
      }).get(variable.id) ?? 0)
    : 0;
  return { id: variable.id, name: variable.name, usages };
};

const copyVariable = async (variable: DataSource) => {
  try {
    await navigator.clipboard.writeText(
      serializeVariable(variable, $resources.get(), $dataSources.get())
    );
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to copy variable"
    );
  }
};

const pasteVariable = async () => {
  const text = await readClipboardText();
  const instance = $selectedInstance.get();
  if (text === undefined || !instance) {
    return;
  }
  try {
    const copied = deserializeVariable(
      text,
      instance.id,
      new Map(
        findAvailableVariables({
          startingInstanceId: instance.id,
          instances: $instances.get(),
          dataSources: $dataSources.get(),
        }).map((variable) => [variable.id, variable])
      )
    );
    const originalName = copied.variable.name;
    let suffix = 2;
    let error = validateDataVariableName(
      copied.variable.name,
      undefined,
      instance.id
    );
    while (error?.type === "duplicate") {
      copied.variable.name = `${originalName} ${suffix++}`;
      error = validateDataVariableName(
        copied.variable.name,
        undefined,
        instance.id
      );
    }
    if (error) {
      throw Error(error.message);
    }
    if (copied.resource) {
      copied.resource.name = copied.variable.name;
    }
    serverSyncStore.createTransaction(
      [$dataSources, $resources],
      (dataSources, resources) => {
        dataSources.set(copied.variable.id, copied.variable);
        if (copied.resource) {
          resources.set(copied.resource.id, copied.resource);
        }
      }
    );
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to paste variable"
    );
  }
};

export const canDeleteVariable = (
  variable: DataSource | undefined,
  isLocal = variable?.scopeInstanceId === $selectedInstance.get()?.id
) => {
  if (!variable) {
    return false;
  }
  if (
    isRequiredManagedFormVariable(variable, {
      instances: $instances.get(),
      props: $props.get(),
    })
  ) {
    return false;
  }
  return (
    isLocal &&
    (variable.type !== "parameter" ||
      variable.id === $selectedPage.get()?.systemDataSourceId)
  );
};

export const VariableMenu = ({
  variable,
  canDelete = false,
  onDelete,
  onRefresh,
  onOpenChange,
  size = "small",
  includePaste = true,
}: {
  variable?: DataSource;
  canDelete?: boolean;
  onDelete?: () => void;
  onRefresh?: () => void;
  onOpenChange?: (open: boolean) => void;
  size?: "small" | "header";
  includePaste?: boolean;
}) => {
  const [deleting, setDeleting] = useState<VariableToDelete>();
  return (
    <>
      <DropdownMenu modal onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          {size === "header" ? (
            <Button
              aria-label="Open variable menu"
              data-variable-id={variable?.id}
              prefix={<EllipsesIcon />}
              color="ghost"
              onClick={() => {}}
            />
          ) : (
            <SmallIconButton
              aria-label="Open variable menu"
              data-variable-id={variable?.id}
              icon={<EllipsesIcon />}
              onClick={() => {}}
            />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          css={{ minWidth: size === "header" ? 360 : 180 }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem
            disabled={!canDelete || !canDeleteVariable(variable)}
            onSelect={() => {
              if (!variable) {
                return;
              }
              setDeleting(getVariableToDelete(variable));
            }}
          >
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!variable || variable.type === "parameter"}
            onSelect={async () => {
              if (!variable) {
                return;
              }
              await copyVariable(variable);
            }}
          >
            Copy
          </DropdownMenuItem>
          {onRefresh !== undefined && (
            <DropdownMenuItem onSelect={onRefresh}>Refresh</DropdownMenuItem>
          )}
          {includePaste && (
            <DropdownMenuItem
              onSelect={async () => {
                await pasteVariable();
              }}
            >
              Paste
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDataVariableDialog
        variable={deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={(id) => {
          deleteDataVariable(id);
          onDelete?.();
        }}
      />
    </>
  );
};

export const VariableContextMenu = ({ children }: { children: ReactNode }) => {
  const [targetId, setTargetId] = useState<string>();
  const [deleting, setDeleting] = useState<VariableToDelete>();
  const variable = targetId ? $dataSources.get().get(targetId) : undefined;
  const setTargetFromEvent = (target: EventTarget | null) => {
    const item =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-id], [data-variable-id]")
        : null;
    setTargetId(
      item?.getAttribute("data-variable-id") ??
        item?.getAttribute("data-id") ??
        undefined
    );
  };
  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setTargetId(undefined);
          }
        }}
      >
        <ContextMenuTrigger
          asChild
          onPointerDown={(event) => {
            if (event.button === 2) {
              setTargetFromEvent(event.target);
            }
          }}
          onContextMenu={(event) => {
            setTargetFromEvent(event.target);
          }}
        >
          <div style={{ display: "contents" }}>{children}</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={!canDeleteVariable(variable)}
            onSelect={() => {
              if (variable && canDeleteVariable(variable)) {
                setDeleting(getVariableToDelete(variable));
              }
            }}
          >
            Delete
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!variable || variable.type === "parameter"}
            onSelect={() => {
              if (variable && variable.type !== "parameter") {
                void copyVariable(variable);
              }
            }}
          >
            Copy
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => void pasteVariable()}>
            Paste
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <DeleteDataVariableDialog
        variable={deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={(id) => {
          deleteDataVariable(id);
          setDeleting(undefined);
        }}
      />
    </>
  );
};
