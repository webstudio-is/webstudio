import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SmallIconButton,
  toast,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import {
  findAvailableVariables,
  findUsedVariables,
} from "@webstudio-is/project-build/runtime";
import { $selectedInstance } from "~/shared/nano-states";
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

export const VariableMenu = ({
  variable,
  canDelete = false,
  onDelete,
  onOpenChange,
}: {
  variable?: DataSource;
  canDelete?: boolean;
  onDelete?: () => void;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [deleting, setDeleting] = useState<{
    id: string;
    name: string;
    usages: number;
  }>();
  return (
    <>
      <DropdownMenu modal onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <SmallIconButton
            aria-label="Open variable menu"
            icon={<EllipsesIcon />}
            onClick={() => {}}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem
            disabled={!canDelete}
            onSelect={() => {
              if (!variable) {
                return;
              }
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
              setDeleting({ id: variable.id, name: variable.name, usages });
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
              try {
                await navigator.clipboard.writeText(
                  serializeVariable(
                    variable,
                    $resources.get(),
                    $dataSources.get()
                  )
                );
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Unable to copy variable"
                );
              }
            }}
          >
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
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
                  error instanceof Error
                    ? error.message
                    : "Unable to paste variable"
                );
              }
            }}
          >
            Paste
          </DropdownMenuItem>
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
