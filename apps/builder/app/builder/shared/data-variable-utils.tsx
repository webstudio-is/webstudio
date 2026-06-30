import { useState, useEffect } from "react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { toast } from "@webstudio-is/design-system";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogClose,
  Flex,
  Text,
  Button,
  theme,
  InputField,
} from "@webstudio-is/design-system";
import type { DataSource, Instance } from "@webstudio-is/sdk";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import {
  $instances,
  $props,
  $dataSources,
  $resources,
} from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import {
  findVariableUsagesByInstance,
  validateDataVariableNameWithSources,
} from "@webstudio-is/project-build/runtime/data";
import { type DataVariableNameError } from "@webstudio-is/project-build/runtime/data";

const $isDeleteUnusedDataVariablesDialogOpen = atom(false);

export const openDeleteUnusedDataVariablesDialog = () => {
  $isDeleteUnusedDataVariablesDialogOpen.set(true);
};

export type DataVariableError = DataVariableNameError;

const getUsedVariablesInInstances = () => {
  return findVariableUsagesByInstance({
    startingInstanceId: ROOT_INSTANCE_ID,
    pages: $pages.get(),
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
  });
};

type DeleteDataVariableDialogProps = {
  variable?: { id: DataSource["id"]; name: string; usages: number };
  onClose: () => void;
  onConfirm: (variableId: DataSource["id"]) => void;
};

export const DeleteDataVariableDialog = ({
  variable,
  onClose,
  onConfirm,
}: DeleteDataVariableDialogProps) => {
  return (
    <Dialog
      open={variable !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete confirmation</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>
            {variable &&
              (variable.usages > 0
                ? `Delete "${variable.name}" variable from the project? It is used in ${variable.usages} ${variable.usages === 1 ? "expression" : "expressions"}.`
                : `Delete "${variable.name}" variable from the project?`)}
          </Text>
        </Flex>
        <DialogActions>
          <Button
            autoFocus
            color="destructive"
            onClick={() => {
              onConfirm(variable!.id);
              onClose();
            }}
          >
            Delete
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export const deleteUnusedDataVariables = () => {
  const dataSources = $dataSources.get();
  const usedVariablesInInstances = getUsedVariablesInInstances();
  const unusedVariableIds: DataSource["id"][] = [];

  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "variable") {
      const usages = usedVariablesInInstances.get(dataSource.id);
      if (usages === undefined || usages.size === 0) {
        unusedVariableIds.push(dataSource.id);
      }
    }
  }

  if (unusedVariableIds.length === 0) {
    return 0;
  }

  serverSyncStore.createTransaction([$dataSources], (dataSources) => {
    for (const variableId of unusedVariableIds) {
      dataSources.delete(variableId);
    }
  });

  return unusedVariableIds.length;
};

export const validateDataVariableName = (
  name: string,
  variableId?: DataSource["id"],
  scopeInstanceId?: Instance["id"]
): DataVariableError | undefined => {
  const dataSources = $dataSources.get();
  const currentVariable = variableId ? dataSources.get(variableId) : undefined;
  const actualScopeInstanceId =
    scopeInstanceId ??
    (currentVariable?.type === "variable"
      ? currentVariable.scopeInstanceId
      : undefined);
  return validateDataVariableNameWithSources({
    dataSources: dataSources.values(),
    name,
    variableId,
    scopeInstanceId: actualScopeInstanceId,
  });
};

export const renameDataVariable = (
  id: DataSource["id"],
  name: string
): DataVariableError | undefined => {
  const validationError = validateDataVariableName(name, id);
  if (validationError) {
    return validationError;
  }

  serverSyncStore.createTransaction([$dataSources], (dataSources) => {
    const dataSource = dataSources.get(id);
    if (dataSource?.type === "variable") {
      dataSource.name = name;
    }
  });
};

type RenameDataVariableDialogProps = {
  variable?: { id: DataSource["id"]; name: string };
  onClose: () => void;
  onConfirm: (variableId: DataSource["id"], newName: string) => void;
};

export const RenameDataVariableDialog = ({
  variable,
  onClose,
  onConfirm,
}: RenameDataVariableDialogProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  // Reset name and clear error when variable changes
  useEffect(() => {
    if (variable?.name !== undefined) {
      setName(variable.name);
      setError(undefined);
    }
  }, [variable?.id, variable?.name]);

  const handleConfirm = () => {
    const renameError = renameDataVariable(variable!.id, name);
    if (renameError) {
      setError(renameError.message);
      return;
    }
    onConfirm(variable!.id, name);
    onClose();
  };

  return (
    <Dialog
      open={variable !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
          if (event.key === "Enter" && !error) {
            handleConfirm();
          }
        }}
      >
        <DialogTitle>Rename variable</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Flex direction="column" gap="1">
            <InputField
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              color={error ? "error" : undefined}
            />
            {error && (
              <Text color="destructive" variant="monoBold">
                {error}
              </Text>
            )}
          </Flex>
        </Flex>
        <DialogActions>
          <Button color="primary" onClick={handleConfirm}>
            Rename
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteUnusedDataVariablesDialog = () => {
  const open = useStore($isDeleteUnusedDataVariablesDialogOpen);
  const dataSources = useStore($dataSources);

  const handleClose = () => {
    $isDeleteUnusedDataVariablesDialogOpen.set(false);
  };

  const unusedVariables: Array<{ id: string; name: string }> = [];
  if (open) {
    const usedVariablesInInstances = getUsedVariablesInInstances();
    for (const dataSource of dataSources.values()) {
      if (dataSource.type === "variable") {
        const usages = usedVariablesInInstances.get(dataSource.id);
        if (usages === undefined || usages.size === 0) {
          unusedVariables.push({ id: dataSource.id, name: dataSource.name });
        }
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          handleClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete unused data variables</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          {unusedVariables.length === 0 ? (
            <Text>There are no unused data variables to delete.</Text>
          ) : (
            <>
              <Text>
                Delete {unusedVariables.length} unused data{" "}
                {unusedVariables.length === 1 ? "variable" : "variables"} from
                the project?
              </Text>
              <Text
                variant="mono"
                css={{
                  maxHeight: 200,
                  overflowY: "auto",
                  backgroundColor: theme.colors.backgroundPanel,
                  borderRadius: theme.borderRadius[4],
                  wordBreak: "break-word",
                }}
              >
                {unusedVariables.map((variable) => variable.name).join(", ")}
              </Text>
            </>
          )}
        </Flex>
        <DialogActions>
          {unusedVariables.length > 0 && (
            <Button
              color="destructive"
              autoFocus
              onClick={() => {
                const deletedCount = deleteUnusedDataVariables();
                handleClose();
                if (deletedCount === 0) {
                  toast.info("No unused data variables to delete");
                } else {
                  toast.success(
                    `Deleted ${deletedCount} unused data ${deletedCount === 1 ? "variable" : "variables"}`
                  );
                }
              }}
            >
              Delete
            </Button>
          )}
          <DialogClose>
            <Button color="ghost">
              {unusedVariables.length > 0 ? "Cancel" : "Close"}
            </Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
