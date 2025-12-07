import { useState, useEffect } from "react";
import { computed } from "nanostores";
import {
  Dialog,
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
import {
  $pages,
  $instances,
  $props,
  $dataSources,
  $resources,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { findVariableUsagesByInstance } from "~/shared/data-variables";

export type DataVariableError = {
  type: "required" | "duplicate";
  message: string;
};

/**
 * Computed store that tracks which instances use each variable
 * Returns a Map of variable ID to Set of instance IDs
 */
export const $usedVariablesInInstances = computed(
  [$pages, $instances, $props, $dataSources, $resources],
  (pages, instances, props, dataSources, resources) => {
    return findVariableUsagesByInstance({
      startingInstanceId: ROOT_INSTANCE_ID,
      pages,
      instances,
      props,
      dataSources,
      resources,
    });
  }
);

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
          <Flex direction="rowReverse" gap="2">
            <Button
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
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

export const validateDataVariableName = (
  name: string,
  variableId?: DataSource["id"],
  scopeInstanceId?: Instance["id"]
): DataVariableError | undefined => {
  if (name.trim().length === 0) {
    return {
      type: "required",
      message: "Variable name is required",
    };
  }

  const dataSources = $dataSources.get();
  const currentVariable = variableId ? dataSources.get(variableId) : undefined;
  const actualScopeInstanceId =
    scopeInstanceId ??
    (currentVariable?.type === "variable"
      ? currentVariable.scopeInstanceId
      : undefined);

  for (const dataSource of dataSources.values()) {
    if (
      dataSource.type === "variable" &&
      dataSource.scopeInstanceId === actualScopeInstanceId &&
      dataSource.name === name &&
      dataSource.id !== variableId
    ) {
      return {
        type: "duplicate",
        message: "Name is already used by another variable on this instance",
      };
    }
  }
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
        <DialogTitle>Rename Variable</DialogTitle>
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
          <Flex direction="rowReverse" gap="2">
            <Button color="primary" onClick={handleConfirm}>
              Rename
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
